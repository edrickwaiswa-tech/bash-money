import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, transactionsTable, CREDIT_TYPES } from "@workspace/db";
import { eq, desc, gte, sql } from "drizzle-orm";
import { GetRecentTransactionsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [{ count: totalMembers }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(membersTable);

    const allTxs = await db.select().from(transactionsTable);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSavingsCredits = 0;
    let totalSavingsDebits = 0;
    let totalLoansGiven = 0;
    let totalLoansRepaid = 0;
    let totalDepositsToday = 0;
    let totalWithdrawalsToday = 0;

    for (const tx of allTxs) {
      const amt = parseFloat(tx.amount);
      const isToday = tx.createdAt >= today;

      if (tx.type === "SAVINGS_DEPOSIT") {
        totalSavingsCredits += amt;
        if (isToday) totalDepositsToday += amt;
      } else if (tx.type === "LOAN_REPAYMENT") {
        totalLoansRepaid += amt;
      } else if (tx.type === "LOAN_DISBURSEMENT") {
        totalLoansGiven += amt;
      } else if (tx.type === "WITHDRAWAL") {
        totalSavingsDebits += amt;
        if (isToday) totalWithdrawalsToday += amt;
      }
    }

    res.json({
      totalMembers,
      totalSavings: Math.max(0, totalSavingsCredits - totalSavingsDebits),
      totalLoansOutstanding: Math.max(0, totalLoansGiven - totalLoansRepaid),
      totalTransactions: allTxs.length,
      totalDepositsToday,
      totalWithdrawalsToday,
    });
  } catch (err) {
    req.log.error({ err }, "getDashboardSummary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-transactions", async (req, res) => {
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
