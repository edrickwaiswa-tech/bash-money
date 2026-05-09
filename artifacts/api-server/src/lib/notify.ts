import { db, memberNotificationsTable, membersTable, CREDIT_TYPES } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { formatTransactionType } from "./format";

function formatAmount(amount: number): string {
  return `USh ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}`;
}

export async function notifyMemberTransaction(params: {
  memberId: number;
  transactionRef: string;
  type: string;
  amount: number;
  runningBalance: number;
  notes?: string | null;
}): Promise<void> {
  const { memberId, transactionRef, type, amount, runningBalance, notes } = params;

  const [member] = await db
    .select({ name: membersTable.name, phone: membersTable.phone })
    .from(membersTable)
    .where(eq(membersTable.id, memberId));

  if (!member) return;

  const direction = CREDIT_TYPES.includes(type as any) ? "credit" : "debit";
  const verb = direction === "credit" ? "received" : "debited";
  const typeName = formatTransactionType(type);
  const amtStr = formatAmount(amount);
  const balStr = formatAmount(runningBalance);

  const message = [
    `Bash M. Money: ${typeName} of ${amtStr} ${verb} on your account (Ref: ${transactionRef}).`,
    `New balance: ${balStr}.`,
    notes ? `Note: ${notes}` : null,
    `For queries, contact your SACCO manager.`,
  ]
    .filter(Boolean)
    .join(" ");

  await db.insert(memberNotificationsTable).values({
    memberId,
    transactionRef,
    type,
    amount: String(amount),
    direction,
    message,
  });

  logger.info({ memberId, phone: member.phone, transactionRef }, "📲 [SIMULATED WHATSAPP] Transaction alert sent");
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  📲  Bash M. Money — WhatsApp Notification    ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  To:   ${member.phone.padEnd(37)}║`);
  console.log(`║  Name: ${member.name.substring(0, 37).padEnd(37)}║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  ${message.substring(0, 45).padEnd(45)} ║`);
  if (message.length > 45) {
    const rest = message.substring(45);
    for (let i = 0; i < rest.length; i += 45) {
      console.log(`║  ${rest.substring(i, i + 45).padEnd(45)} ║`);
    }
  }
  console.log(`╚══════════════════════════════════════════════╝\n`);
}
