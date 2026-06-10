import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { membersTable, transactionsTable, CREDIT_TYPES } from "@workspace/db";
import { eq, like, or, asc } from "drizzle-orm";
import {
  CreateMemberBody,
  UpdateMemberBody,
  GetMemberParams,
  UpdateMemberParams,
  DeleteMemberParams,
  GetMemberLedgerParams,
  ListMembersQueryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// Admin-only: list all members with computed balances
router.get("/members", requireAdmin, async (req, res) => {
  try {
    const query = ListMembersQueryParams.parse(req.query);
    let members;
    if (query.search) {
      const term = `%${query.search}%`;
      members = await db
        .select()
        .from(membersTable)
        .where(or(like(membersTable.name, term), like(membersTable.phone, term)));
    } else {
      members = await db.select().from(membersTable).orderBy(membersTable.createdAt);
    }

    // Fetch all transactions for found members in one query, sorted chronologically
    const memberIds = members.map((m) => m.id);
    const allTxs =
      memberIds.length === 0
        ? []
        : await db
            .select()
            .from(transactionsTable)
            .where(
              memberIds.length === 1
                ? eq(transactionsTable.memberId, memberIds[0])
                : or(...memberIds.map((id) => eq(transactionsTable.memberId, id)))
            )
            .orderBy(asc(transactionsTable.createdAt));

    // Group transactions by member id
    const txsByMember = new Map<number, typeof allTxs>();
    for (const tx of allTxs) {
      if (!txsByMember.has(tx.memberId)) txsByMember.set(tx.memberId, []);
      txsByMember.get(tx.memberId)!.push(tx);
    }

    const result = members.map((m) => {
      const txs = txsByMember.get(m.id) ?? [];
      let savingsDeposits = 0;
      let savingsWithdrawals = 0;
      let loanDisbursements = 0;
      let loanRepayments = 0;
      for (const tx of txs) {
        const amt = parseFloat(tx.amount);
        if (tx.type === "SAVINGS_DEPOSIT") savingsDeposits += amt;
        else if (tx.type === "WITHDRAWAL") savingsWithdrawals += amt;
        else if (tx.type === "LOAN_DISBURSEMENT") loanDisbursements += amt;
        else if (tx.type === "LOAN_REPAYMENT") loanRepayments += amt;
      }
      const totalSavings = Math.max(0, savingsDeposits - savingsWithdrawals);
      const outstandingLoan = Math.max(0, loanDisbursements - loanRepayments);
      return {
        ...m,
        createdAt: m.createdAt.toISOString(),
        totalSavings,
        outstandingLoan,
        currentBalance: totalSavings - outstandingLoan,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listMembers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin-only: create member
router.post("/members", requireAdmin, async (req, res) => {
  try {
    const body = CreateMemberBody.parse(req.body);
    const { initialPin, ...memberBody } = body;
    const joinDate = body.joinDate ?? new Date().toISOString().split("T")[0];

    // Auto-generate account number: BMMFS-YYYY-NNNNN
    const year = new Date().getFullYear();
    const countRow = await db.select({ id: membersTable.id }).from(membersTable);
    const seq = String(countRow.length + 1).padStart(5, "0");
    const accountNumber = `BMMFS-${year}-${seq}`;

    const [member] = await db
      .insert(membersTable)
      .values({
        ...memberBody,
        joinDate,
        accountNumber,
        memberPinHash: initialPin ? await bcrypt.hash(initialPin, 12) : null,
        requiresPasswordReset: false,
      })
      .returning();
    res.status(201).json({ ...member, createdAt: member.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: member self-service — view own profile
router.get("/members/:memberId", async (req, res) => {
  try {
    const { memberId } = GetMemberParams.parse({
      memberId: Number(req.params.memberId),
    });
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const txs = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.memberId, memberId))
      .orderBy(asc(transactionsTable.createdAt));

    let savingsDeposits = 0;
    let savingsWithdrawals = 0;
    let loanDisbursements = 0;
    let loanRepayments = 0;

    for (const tx of txs) {
      const amt = parseFloat(tx.amount);
      if (tx.type === "SAVINGS_DEPOSIT") savingsDeposits += amt;
      else if (tx.type === "WITHDRAWAL") savingsWithdrawals += amt;
      else if (tx.type === "LOAN_DISBURSEMENT") loanDisbursements += amt;
      else if (tx.type === "LOAN_REPAYMENT") loanRepayments += amt;
    }

    // Standardised formulas:
    // Total Savings  = SAVINGS_DEPOSIT − WITHDRAWAL  (min 0)
    // Loan Balance   = LOAN_DISBURSEMENT − LOAN_REPAYMENT  (min 0)
    // Net Balance    = Total Savings − Loan Balance
    const totalSavings = Math.max(0, savingsDeposits - savingsWithdrawals);
    const outstandingLoan = Math.max(0, loanDisbursements - loanRepayments);
    const currentBalance = totalSavings - outstandingLoan;

    res.json({
      ...member,
      createdAt: member.createdAt.toISOString(),
      totalSavings,
      outstandingLoan,
      currentBalance,
    });
  } catch (err) {
    req.log.error({ err }, "getMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin-only: update member
router.put("/members/:memberId", requireAdmin, async (req, res) => {
  try {
    const { memberId } = UpdateMemberParams.parse({
      memberId: Number(req.params.memberId),
    });
    const body = UpdateMemberBody.parse(req.body);
    const [updated] = await db
      .update(membersTable)
      .set(body)
      .where(eq(membersTable.id, memberId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "updateMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin-only: delete member
router.delete("/members/:memberId", requireAdmin, async (req, res) => {
  try {
    const { memberId } = DeleteMemberParams.parse({
      memberId: Number(req.params.memberId),
    });
    await db.delete(transactionsTable).where(eq(transactionsTable.memberId, memberId));
    await db.delete(membersTable).where(eq(membersTable.id, memberId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: member self-service — view own ledger
router.get("/members/:memberId/ledger", async (req, res) => {
  try {
    const { memberId } = GetMemberLedgerParams.parse({
      memberId: Number(req.params.memberId),
    });
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const txs = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.memberId, memberId))
      .orderBy(transactionsTable.createdAt);

    let runningBalance = 0;
    let totalCredits = 0;
    let totalDebits = 0;

    const entries = txs.map((tx) => {
      const amt = parseFloat(tx.amount);
      const direction = CREDIT_TYPES.includes(tx.type as any) ? "credit" : "debit";
      if (direction === "credit") {
        runningBalance += amt;
        totalCredits += amt;
      } else {
        runningBalance -= amt;
        totalDebits += amt;
      }
      return {
        id: tx.id,
        transactionRef: tx.transactionRef,
        type: tx.type,
        amount: amt,
        direction,
        notes: tx.notes ?? undefined,
        runningBalance,
        createdAt: tx.createdAt.toISOString(),
      };
    });

    res.json({
      member: { ...member, createdAt: member.createdAt.toISOString() },
      entries: entries.reverse(),
      currentBalance: runningBalance,
      totalCredits,
      totalDebits,
    });
  } catch (err) {
    req.log.error({ err }, "getMemberLedger error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
