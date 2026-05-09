import { Router } from "express";
import { db, membersTable, transactionsTable, CREDIT_TYPES } from "@workspace/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /reports/transactions?from=ISO&to=ISO
router.get("/reports/transactions", requireAdmin, async (req, res): Promise<void> => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(0);
    const to   = req.query.to   ? new Date(req.query.to   as string) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      res.status(400).json({ error: "Invalid date range" });
      return;
    }

    const rows = await db
      .select({
        id:             transactionsTable.id,
        transactionRef: transactionsTable.transactionRef,
        memberId:       transactionsTable.memberId,
        memberName:     membersTable.name,
        accountNumber:  membersTable.accountNumber,
        type:           transactionsTable.type,
        amount:         transactionsTable.amount,
        notes:          transactionsTable.notes,
        createdAt:      transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .innerJoin(membersTable, eq(transactionsTable.memberId, membersTable.id))
      .where(and(gte(transactionsTable.createdAt, from), lte(transactionsTable.createdAt, to)))
      .orderBy(desc(transactionsTable.createdAt));

    let totalDeposits    = 0;
    let totalWithdrawals = 0;

    const transactions = rows.map((tx) => {
      const amount    = parseFloat(tx.amount);
      const direction = CREDIT_TYPES.includes(tx.type as any) ? "credit" : "debit";
      if (direction === "credit") totalDeposits    += amount;
      else                        totalWithdrawals += amount;
      return { ...tx, amount, direction, createdAt: tx.createdAt.toISOString() };
    });

    res.json({
      from: from.toISOString(),
      to:   to.toISOString(),
      transactions,
      summary: {
        totalDeposits,
        totalWithdrawals,
        netCashFlow: totalDeposits - totalWithdrawals,
      },
    });
  } catch (err) {
    req.log.error({ err }, "getReportTransactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
