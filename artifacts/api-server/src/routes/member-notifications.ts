import { Router } from "express";
import { db, memberNotificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// Middleware: require member session
function requireMember(req: any, res: any, next: any): void {
  if (!req.session.memberId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// GET /member/notifications — list all notifications for logged-in member
router.get("/member/notifications", requireMember, async (req, res) => {
  try {
    const memberId = req.session.memberId as number;
    const rows = await db
      .select()
      .from(memberNotificationsTable)
      .where(eq(memberNotificationsTable.memberId, memberId))
      .orderBy(desc(memberNotificationsTable.createdAt))
      .limit(50);

    res.json(
      rows.map((n) => ({
        ...n,
        amount: parseFloat(n.amount),
        createdAt: n.createdAt.toISOString(),
      }))
    );
  } catch (err: any) {
    req.log.error({ err }, "listNotifications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /member/notifications/unread-count
router.get("/member/notifications/unread-count", requireMember, async (req, res) => {
  try {
    const memberId = req.session.memberId as number;
    const rows = await db
      .select({ id: memberNotificationsTable.id })
      .from(memberNotificationsTable)
      .where(
        and(
          eq(memberNotificationsTable.memberId, memberId),
          eq(memberNotificationsTable.read, false)
        )
      );
    res.json({ count: rows.length });
  } catch (err: any) {
    req.log.error({ err }, "unreadCount error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /member/notifications/read-all — mark all as read
router.patch("/member/notifications/read-all", requireMember, async (req, res) => {
  try {
    const memberId = req.session.memberId as number;
    await db
      .update(memberNotificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(memberNotificationsTable.memberId, memberId),
          eq(memberNotificationsTable.read, false)
        )
      );
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "markAllRead error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
