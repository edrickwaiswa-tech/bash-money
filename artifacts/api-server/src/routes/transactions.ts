import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, transactionsTable, CREDIT_TYPES } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  CreateTransactionBody,
  GetTransactionParams,
  ListTransactionsQueryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { notifyMemberTransaction } from "../lib/notify";

const router = Router();

function generateRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = nanoid(4).toUpperCase();
  return `TXN-${ts}-${rand}`;
}

// Admin-only: list all transactions
router.get("/transactions", requireAdmin, async (req, res) => {
  try {
    const query = ListTransactionsQueryParams.parse({
      memberId: req.query.memberId ? Number(req.query.memberId) : undefined,
      type: req.query.type,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    const rows = await db
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
      .limit(query.limit ?? 100);

    const result = rows
      .filter((tx) => !query.memberId || tx.memberId === query.memberId)
      .map((tx) => ({
        ...tx,
        amount: parseFloat(tx.amount),
        direction: CREDIT_TYPES.includes(tx.type as any) ? "credit" : "debit",
        createdAt: tx.createdAt.toISOString(),
      }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listTransactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin-only: create transaction
router.post("/transactions", requireAdmin, async (req, res) => {
  try {
    const body = CreateTransactionBody.parse(req.body);

    const [member] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.id, body.memberId));
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    // ── Overdraft guard ────────────────────────────────────────────────────────
    if (body.type === "WITHDRAWAL") {
      const existingTxs = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.memberId, body.memberId));

      let savingsDeposits = 0;
      let withdrawals = 0;
      for (const t of existingTxs) {
        const amt = parseFloat(t.amount);
        if (t.type === "SAVINGS_DEPOSIT") savingsDeposits += amt;
        else if (t.type === "WITHDRAWAL") withdrawals += amt;
      }
      const currentSavings = Math.max(0, savingsDeposits - withdrawals);

      if (body.amount > currentSavings) {
        res.status(400).json({
          error: "Incomplete transaction: Insufficient savings balance.",
        });
        return;
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const transactionRef = generateRef();
    const [tx] = await db
      .insert(transactionsTable)
      .values({
        transactionRef,
        memberId: body.memberId,
        type: body.type,
        amount: String(body.amount),
        notes: body.notes ?? null,
      })
      .returning();

    const allTxs = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.memberId, body.memberId))
      .orderBy(transactionsTable.createdAt);

    let runningBalance = 0;
    for (const t of allTxs) {
      const amt = parseFloat(t.amount);
      if (CREDIT_TYPES.includes(t.type as any)) {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }
    }

    const direction = CREDIT_TYPES.includes(tx.type as any) ? "credit" : "debit";

    res.status(201).json({
      id: tx.id,
      transactionRef: tx.transactionRef,
      memberId: tx.memberId,
      memberName: member.name,
      type: tx.type,
      direction,
      amount: parseFloat(tx.amount),
      notes: tx.notes ?? undefined,
      runningBalance,
      createdAt: tx.createdAt.toISOString(),
    });

    // Fire-and-forget WhatsApp alert after response is sent
    notifyMemberTransaction({
      memberId: body.memberId,
      transactionRef,
      type: tx.type,
      amount: parseFloat(tx.amount),
      runningBalance,
      notes: body.notes,
    }).catch((err) => req.log.error({ err }, "notify error"));
  } catch (err) {
    req.log.error({ err }, "createTransaction error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: view transaction receipt by ID
router.get("/transactions/:transactionId", async (req, res) => {
  try {
    const { transactionId } = GetTransactionParams.parse({
      transactionId: Number(req.params.transactionId),
    });

    const [row] = await db
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
      .where(eq(transactionsTable.id, transactionId));

    if (!row) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const allTxs = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.memberId, row.memberId))
      .orderBy(transactionsTable.createdAt);

    let runningBalance = 0;
    for (const t of allTxs) {
      const amt = parseFloat(t.amount);
      if (CREDIT_TYPES.includes(t.type as any)) {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }
      if (t.id === transactionId) break;
    }

    res.json({
      id: row.id,
      transactionRef: row.transactionRef,
      memberId: row.memberId,
      memberName: row.memberName,
      type: row.type,
      direction: CREDIT_TYPES.includes(row.type as any) ? "credit" : "debit",
      amount: parseFloat(row.amount),
      notes: row.notes ?? undefined,
      runningBalance,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "getTransaction error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
