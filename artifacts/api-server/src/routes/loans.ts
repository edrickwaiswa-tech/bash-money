import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/loans/active", requireAdmin, async (req, res) => {
  try {
    const members = await db.select().from(membersTable);

    const results = await Promise.all(
      members.map(async (member) => {
        const txs = await db
          .select()
          .from(transactionsTable)
          .where(eq(transactionsTable.memberId, member.id))
          .orderBy(desc(transactionsTable.createdAt));

        let totalDisbursed = 0;
        let totalRepaid = 0;
        let lastDisbursementDate: string | null = null;

        for (const tx of txs) {
          const amt = parseFloat(tx.amount);
          if (tx.type === "LOAN_DISBURSEMENT") {
            totalDisbursed += amt;
            if (!lastDisbursementDate) {
              lastDisbursementDate = tx.createdAt.toISOString();
            }
          } else if (tx.type === "LOAN_REPAYMENT") {
            totalRepaid += amt;
          }
        }

        const outstandingLoan = Math.max(0, totalDisbursed - totalRepaid);
        return {
          memberId: member.id,
          memberName: member.name,
          accountNumber: member.accountNumber,
          phone: member.phone,
          outstandingLoan,
          totalDisbursed,
          totalRepaid,
          lastDisbursementDate,
        };
      })
    );

    const active = results
      .filter((r) => r.outstandingLoan > 0)
      .sort((a, b) => b.outstandingLoan - a.outstandingLoan);

    res.json(active);
  } catch (err) {
    req.log.error({ err }, "getActiveLoans error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
