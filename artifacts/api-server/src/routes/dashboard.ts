import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, transactionsTable, CREDIT_TYPES } from "@workspace/db";
import { eq, desc, sql, asc } from "drizzle-orm";
import { calcOutstandingLoan } from "../lib/loan-calc";
import { GetRecentTransactionsQueryParams } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/summary", requireAdmin, async (req, res) => {
  try {
    const [{ count: totalMembers }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(membersTable);

    // Fetch all transactions sorted chronologically for correct running-balance per member
    const allTxs = await db
      .select()
      .from(transactionsTable)
      .orderBy(asc(transactionsTable.createdAt));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSavingsCredits = 0;
    let totalSavingsDebits = 0;
    let totalDepositsToday = 0;
    let totalWithdrawalsToday = 0;

    // Group by member for running-balance loan calc
    const memberTxMap = new Map<number, typeof allTxs>();

    for (const tx of allTxs) {
      const amt = parseFloat(tx.amount);
      const isToday = tx.createdAt >= today;

      if (tx.type === "SAVINGS_DEPOSIT") {
        totalSavingsCredits += amt;
        if (isToday) totalDepositsToday += amt;
      } else if (tx.type === "WITHDRAWAL") {
        totalSavingsDebits += amt;
        if (isToday) totalWithdrawalsToday += amt;
      }

      if (!memberTxMap.has(tx.memberId)) memberTxMap.set(tx.memberId, []);
      memberTxMap.get(tx.memberId)!.push(tx);
    }

    // Sum outstanding loan per member using running-balance (over-repayments cap at 0)
    let totalLoansOutstanding = 0;
    for (const memberTxs of memberTxMap.values()) {
      totalLoansOutstanding += calcOutstandingLoan(memberTxs);
    }

    res.json({
      totalMembers,
      totalSavings: Math.max(0, totalSavingsCredits - totalSavingsDebits),
      totalLoansOutstanding,
      totalTransactions: allTxs.length,
      totalDepositsToday,
      totalWithdrawalsToday,
    });
  } catch (err) {
    req.log.error({ err }, "getDashboardSummary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-transactions", requireAdmin, async (req, res) => {
  try {
    const query = GetRecentTransactionsQueryParams.parse({
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    const txs = await db
      .select({
        id: transactionsTable.id,
        transactionRef: transactionsTable.transactionRef,
        memberId: transactionsTable.memberId,
        memberName: membersTable.name,
        type: transactionsTable.type,
        amount: transactionsTable.amount,
        notes: transactionsTable.notes,
        createdAt: transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .innerJoin(membersTable, eq(transactionsTable.memberId, membersTable.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(query.limit ?? 20);

    const result = txs.map((tx) => ({
      ...tx,
      amount: parseFloat(tx.amount),
      direction: CREDIT_TYPES.includes(tx.type as any) ? "credit" : "debit",
      createdAt: tx.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "getRecentTransactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
