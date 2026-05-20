import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, transactionsTable, CREDIT_TYPES } from "@workspace/db";
import { eq, desc, sql, asc } from "drizzle-orm";
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

    // Standardised formulas (mirrors member-level calculations):
    // Total Savings        = SAVINGS_DEPOSIT − WITHDRAWAL  (global, min 0)
    // Total Loans Out      = LOAN_DISBURSEMENT − LOAN_REPAYMENT per member (min 0 per member)
    let totalSavingsDeposits = 0;
    let totalSavingsWithdrawals = 0;
    let totalDepositsToday = 0;
    let totalWithdrawalsToday = 0;

    // Per-member loan accumulators for correct per-member clamping
    const memberDisbursements = new Map<number, number>();
    const memberRepayments = new Map<number, number>();

    for (const tx of allTxs) {
      const amt = parseFloat(tx.amount);
      const isToday = tx.createdAt >= today;

      if (tx.type === "SAVINGS_DEPOSIT") {
        totalSavingsDeposits += amt;
        if (isToday) totalDepositsToday += amt;
      } else if (tx.type === "WITHDRAWAL") {
        totalSavingsWithdrawals += amt;
        if (isToday) totalWithdrawalsToday += amt;
      } else if (tx.type === "LOAN_DISBURSEMENT") {
        memberDisbursements.set(tx.memberId, (memberDisbursements.get(tx.memberId) ?? 0) + amt);
      } else if (tx.type === "LOAN_REPAYMENT") {
        memberRepayments.set(tx.memberId, (memberRepayments.get(tx.memberId) ?? 0) + amt);
      }
    }

    // Sum outstanding loan per member: max(0, disbursements − repayments)
    let totalLoansOutstanding = 0;
    const allMemberIds = new Set([...memberDisbursements.keys(), ...memberRepayments.keys()]);
    for (const mid of allMemberIds) {
      const disbursed = memberDisbursements.get(mid) ?? 0;
      const repaid = memberRepayments.get(mid) ?? 0;
      totalLoansOutstanding += Math.max(0, disbursed - repaid);
    }

    const totalSavings = Math.max(0, totalSavingsDeposits - totalSavingsWithdrawals);

    res.json({
      totalMembers,
      totalSavings,
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
