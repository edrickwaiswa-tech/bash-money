import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, transactionsTable, CREDIT_TYPES } from "@workspace/db";
import { eq, like, or } from "drizzle-orm";
import {
  CreateMemberBody,
  UpdateMemberBody,
  GetMemberParams,
  UpdateMemberParams,
  DeleteMemberParams,
  GetMemberLedgerParams,
  ListMembersQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/members", async (req, res) => {
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
    const result = members.map((m) => ({
      ...m,
      joinDate: m.joinDate,
      createdAt: m.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listMembers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/members", async (req, res) => {
  try {
    const body = CreateMemberBody.parse(req.body);
    const joinDate = body.joinDate ?? new Date().toISOString().split("T")[0];
    const [member] = await db
      .insert(membersTable)
      .values({ ...body, joinDate })
      .returning();
    res.status(201).json({ ...member, createdAt: member.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

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
      .where(eq(transactionsTable.memberId, memberId));

    let totalCredits = 0;
    let totalDebits = 0;
    let loanDisbursed = 0;
    let loanRepaid = 0;

    for (const tx of txs) {
      const amt = parseFloat(tx.amount);
      if (CREDIT_TYPES.includes(tx.type as any)) {
        totalCredits += amt;
        if (tx.type === "LOAN_REPAYMENT") loanRepaid += amt;
      } else {
        totalDebits += amt;
        if (tx.type === "LOAN_DISBURSEMENT") loanDisbursed += amt;
      }
    }

    const outstandingLoan = Math.max(0, loanDisbursed - loanRepaid);
    const savingsCredits = totalCredits - loanRepaid;
    const savingsDebits = totalDebits - loanDisbursed;
    const currentBalance = totalCredits - totalDebits;

    res.json({
      ...member,
      createdAt: member.createdAt.toISOString(),
      totalSavings: Math.max(0, savingsCredits - savingsDebits),
      outstandingLoan,
      currentBalance,
    });
  } catch (err) {
    req.log.error({ err }, "getMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/members/:memberId", async (req, res) => {
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

router.delete("/members/:memberId", async (req, res) => {
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
      entries,
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
