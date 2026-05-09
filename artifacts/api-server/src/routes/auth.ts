import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, or } from "drizzle-orm";
import { db, adminUsersTable, membersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory OTP and reset-token stores (single-admin, dev-friendly)
const pendingOtps = new Map<string, { code: string; expiresAt: number }>();
const resetTokens = new Map<string, { adminId: number; expiresAt: number }>();

// ── POST /auth/login (PIN-based) ────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    res.status(400).json({ error: "Username and PIN are required" });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username as string));

  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Primary: check pinHash; fallback to passwordHash if PIN not yet set
  let valid = false;
  if (admin.pinHash) {
    valid = await bcrypt.compare(pin as string, admin.pinHash);
  } else {
    valid = await bcrypt.compare(pin as string, admin.passwordHash);
  }

  if (!valid) {
    res.status(401).json({ error: "Incorrect PIN" });
    return;
  }

  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;

  req.log.info({ adminId: admin.id }, "Admin signed in");
  res.json({ id: admin.id, username: admin.username, role: "admin" });
});

// ── POST /auth/logout ───────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// ── GET /auth/me ────────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ id: req.session.adminId, username: req.session.adminUsername, role: "admin" });
});

// ── POST /auth/forgot-pin/request-code ─────────────────────────────────────
router.post("/auth/forgot-pin/request-code", async (req, res): Promise<void> => {
  const { phone } = req.body;

  if (!phone) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const members = await db
    .select({ id: membersTable.id, phone: membersTable.phone })
    .from(membersTable)
    .where(eq(membersTable.phone, phone as string));

  if (members.length === 0) {
    res.status(404).json({ error: "No account found for this phone number" });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  pendingOtps.set(phone as string, { code, expiresAt });

  logger.info({ phone, code }, "🔐 [SIMULATED SMS] Bash M. Money Financial Services Ltd — PIN Reset Code");
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  📱 Bash M. Money Financial Services Ltd — PIN Reset`);
  console.log(`  To: ${phone}`);
  console.log(`  Code: ${code}`);
  console.log(`  Expires in: 10 minutes`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  res.json({ success: true, message: "Verification code generated", devCode: code });
});

// ── POST /auth/forgot-pin/verify-code ──────────────────────────────────────
router.post("/auth/forgot-pin/verify-code", async (req, res): Promise<void> => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    res.status(400).json({ error: "Phone and code are required" });
    return;
  }

  const stored = pendingOtps.get(phone as string);

  if (!stored) {
    res.status(400).json({ error: "No pending code for this number. Please request again." });
    return;
  }

  if (Date.now() > stored.expiresAt) {
    pendingOtps.delete(phone as string);
    res.status(400).json({ error: "Code has expired. Please request a new one." });
    return;
  }

  if (stored.code !== (code as string)) {
    res.status(400).json({ error: "Incorrect code. Please try again." });
    return;
  }

  pendingOtps.delete(phone as string);

  const [admin] = await db.select().from(adminUsersTable);
  if (!admin) {
    res.status(500).json({ error: "Admin account not found" });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  resetTokens.set(resetToken, { adminId: admin.id, expiresAt: Date.now() + 10 * 60 * 1000 });

  req.log.info({ adminId: admin.id }, "PIN reset token issued");
  res.json({ resetToken });
});

// ── POST /auth/forgot-pin/reset-pin ────────────────────────────────────────
router.post("/auth/forgot-pin/reset-pin", async (req, res): Promise<void> => {
  const { resetToken, pin } = req.body;

  if (!resetToken || !pin) {
    res.status(400).json({ error: "Reset token and new PIN are required" });
    return;
  }

  if (!/^\d{4}$/.test(pin as string)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" });
    return;
  }

  const tokenData = resetTokens.get(resetToken as string);

  if (!tokenData) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  if (Date.now() > tokenData.expiresAt) {
    resetTokens.delete(resetToken as string);
    res.status(400).json({ error: "Reset session expired. Please start over." });
    return;
  }

  resetTokens.delete(resetToken as string);

  const pinHash = await bcrypt.hash(pin as string, 12);
  await db
    .update(adminUsersTable)
    .set({ pinHash })
    .where(eq(adminUsersTable.id, tokenData.adminId));

  req.log.info({ adminId: tokenData.adminId }, "Admin PIN updated");
  res.json({ success: true });
});

// ── Member self-service OTP login ───────────────────────────────────────────

const memberOtps = new Map<string, { code: string; expiresAt: number; memberId: number }>();

// POST /auth/member/request-otp
router.post("/auth/member/request-otp", async (req, res): Promise<void> => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const [member] = await db
    .select({ id: membersTable.id, phone: membersTable.phone })
    .from(membersTable)
    .where(eq(membersTable.phone, phone as string));

  if (!member) {
    res.status(404).json({ error: "No account found for this phone number" });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  memberOtps.set(phone as string, { code, expiresAt: Date.now() + 10 * 60 * 1000, memberId: member.id });

  logger.info({ phone, code }, "📱 [SIMULATED SMS] Bash M. Money Financial Services Ltd — Member Login Code");
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  📱 Bash M. Money Financial Services Ltd — Member Login`);
  console.log(`  To: ${phone}`);
  console.log(`  Code: ${code}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  res.json({ success: true, devCode: code });
});

// POST /auth/member/verify-otp
router.post("/auth/member/verify-otp", async (req, res): Promise<void> => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    res.status(400).json({ error: "Phone and code are required" });
    return;
  }

  const stored = memberOtps.get(phone as string);
  if (!stored) {
    res.status(400).json({ error: "No pending code. Please request again." });
    return;
  }
  if (Date.now() > stored.expiresAt) {
    memberOtps.delete(phone as string);
    res.status(400).json({ error: "Code expired. Please request a new one." });
    return;
  }
  if (stored.code !== (code as string)) {
    res.status(400).json({ error: "Incorrect code." });
    return;
  }

  memberOtps.delete(phone as string);
  req.session.memberId = stored.memberId;
  req.session.memberPhone = phone as string;

  req.log.info({ memberId: stored.memberId }, "Member signed in via OTP");
  res.json({ success: true, memberId: stored.memberId });
});

// POST /auth/member/login-pin — sign in with account number (or phone) + 4-digit PIN
router.post("/auth/member/login-pin", async (req, res): Promise<void> => {
  const { identifier, pin } = req.body;

  if (!identifier || !pin) {
    res.status(400).json({ error: "Account identifier and PIN are required" });
    return;
  }

  if (!/^\d{4}$/.test(pin as string)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" });
    return;
  }

  const id = (identifier as string).trim();

  const [member] = await db
    .select()
    .from(membersTable)
    .where(or(eq(membersTable.phone, id), eq(membersTable.accountNumber, id)));

  if (!member) {
    res.status(401).json({ error: "No account found. Check your account number or phone." });
    return;
  }

  if (!member.memberPinHash) {
    res.status(401).json({ error: "No PIN set for this account. Please log in with OTP first, then set a PIN in your profile." });
    return;
  }

  const valid = await bcrypt.compare(pin as string, member.memberPinHash);
  if (!valid) {
    res.status(401).json({ error: "Incorrect PIN. Please try again." });
    return;
  }

  req.session.memberId = member.id;
  req.session.memberPhone = member.phone;

  req.log.info({ memberId: member.id }, "Member signed in via account PIN");
  res.json({ success: true, memberId: member.id });
});

// POST /auth/member/set-pin — set or update member's 4-digit self-service PIN
router.post("/auth/member/set-pin", async (req, res): Promise<void> => {
  if (!req.session.memberId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { pin } = req.body;
  if (!pin || !/^\d{4}$/.test(pin as string)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" });
    return;
  }

  const pinHash = await bcrypt.hash(pin as string, 12);
  await db
    .update(membersTable)
    .set({ memberPinHash: pinHash })
    .where(eq(membersTable.id, req.session.memberId));

  req.log.info({ memberId: req.session.memberId }, "Member PIN updated");
  res.json({ success: true });
});

// GET /auth/member/me
router.get("/auth/member/me", async (req, res): Promise<void> => {
  if (!req.session.memberId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ memberId: req.session.memberId, phone: req.session.memberPhone });
});

// POST /auth/member/logout
router.post("/auth/member/logout", async (req, res): Promise<void> => {
  req.session.destroy((err) => {
    if (err) { res.status(500).json({ error: "Logout failed" }); return; }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

export default router;
