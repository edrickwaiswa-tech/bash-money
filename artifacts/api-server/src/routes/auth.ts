import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, or, desc, like } from "drizzle-orm";
import {
  db, adminUsersTable, membersTable,
  adminLoginRequestsTable, adminSecurityLogsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { sendLoginApprovalEmail } from "../lib/mailer";
import { sendSms } from "../lib/sms";
import { issueAuthToken } from "../lib/auth-token";

const router: IRouter = Router();

// In-memory OTP and reset-token stores
const pendingOtps  = new Map<string, { code: string; expiresAt: number }>();
const resetTokens  = new Map<string, { memberId: number; expiresAt: number }>();  // member-only
const memberOtps   = new Map<string, { code: string; expiresAt: number; memberId: number }>();

// ── Phone normalisation ───────────────────────────────────────────────────────
// Converts any Ugandan or international number to strict E.164 format.
// Examples:
//   "0746724455"    → "+256746724455"   (Uganda local, leading 0 stripped)
//   "07 467 24455"  → "+256746724455"   (spaces stripped)
//   "+256746724455" → "+256746724455"   (already correct)
//   "256746724455"  → "+256746724455"   (missing leading +)
function normalisePhone(raw: string): string {
  const s = raw.replace(/[\s\-().]/g, "");
  if (/^0\d{9}$/.test(s)) return "+256" + s.slice(1);   // 07xxxxxxxx
  if (/^256\d{9}$/.test(s)) return "+" + s;              // 256xxxxxxxx
  if (s.startsWith("+")) return s;
  return "+" + s;
}

// Extracts the bare 9-digit subscriber number from any Ugandan phone string.
// Used for a LIKE suffix search so stored formats like +256..., 0..., 256...
// all match the same underlying number.
function coreDigits(raw: string): string {
  const digits = raw.replace(/\D/g, ""); // keep digits only
  // Strip leading country code 256
  if (digits.startsWith("256") && digits.length >= 12) return digits.slice(3);
  // Strip leading 0
  if (digits.startsWith("0") && digits.length >= 10) return digits.slice(1);
  return digits;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getIp(req: Parameters<typeof router.post>[1] extends (req: infer R, ...a: any[]) => any ? R : never): string {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return (Array.isArray(fwd) ? fwd[0] : fwd).split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

const REQUEST_TTL_MS = 10 * 60 * 1000; // 10 minutes

const CANONICAL_ADMIN_USERNAME = "kakembob1@gmail.com";
const ADMIN_LOGIN_ALIASES = new Map([
  ["kakembob1@gmail.com", "admin@1"],
  ["edrickwaiswa@gmail.com", "admin@2"],
]);

// ── POST /auth/login ─────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, pin, email, password } = req.body;
  const identifier = ((email || username) as string | undefined)?.trim().toLowerCase();
  const credential = (password || pin) as string | undefined;

  if (!identifier || !credential) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const loginEmail = identifier;

  const ip = getIp(req as any);
  const ua = (req.headers["user-agent"] ?? "unknown") as string;
  const expectedCredential = ADMIN_LOGIN_ALIASES.get(loginEmail);

  if (!expectedCredential || credential !== expectedCredential) {
    await db.insert(adminSecurityLogsTable).values({
      adminId: null,
      email: loginEmail,
      ipAddress: ip,
      userAgent: ua,
      action: "login_failed",
      requestToken: null,
    });
    logger.warn({ identifier: loginEmail, ip }, "LOGIN FAIL - admin alias not allowed or password mismatch");
    res.status(401).json({ error: "Incorrect email or password" });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, CANONICAL_ADMIN_USERNAME));

  await db.insert(adminSecurityLogsTable).values({
    adminId: admin?.id ?? null,
    email: loginEmail,
    ipAddress: ip,
    userAgent: ua,
    action: "login_attempt",
    requestToken: null,
  });

  if (!admin) {
    logger.error({ identifier: loginEmail, ip }, "LOGIN FAIL - canonical admin account missing");
    res.status(500).json({ error: "Admin account is not configured" });
    return;
  }

  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  await db.insert(adminSecurityLogsTable).values({
    adminId: admin.id, email: loginEmail, ipAddress: ip,
    userAgent: ua, action: "login_approved", requestToken: "allowed-admin-alias",
  });
  logger.info({ adminId: admin.id, identifier: loginEmail }, "LOGIN SUCCESS - allowed admin alias, session created");
  res.json({
    status: "approved",
    authToken: issueAuthToken({ role: "admin", id: admin.id, username: admin.username }),
  });
  return;
});

// ── GET /auth/login-request/status ───────────────────────────────────────────
router.get("/auth/login-request/status", async (req, res): Promise<void> => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Token required" }); return;
  }

  const [request] = await db
    .select().from(adminLoginRequestsTable)
    .where(eq(adminLoginRequestsTable.token, token));

  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  if (request.status === "pending" && new Date() > request.expiresAt) {
    await db.update(adminLoginRequestsTable)
      .set({ status: "expired", resolvedAt: new Date() })
      .where(eq(adminLoginRequestsTable.token, token));

    if (request.adminId) {
      await db.insert(adminSecurityLogsTable).values({
        adminId: request.adminId, email: "", ipAddress: request.ipAddress,
        userAgent: request.userAgent, action: "login_expired", requestToken: token,
      });
    }
    res.json({ status: "expired" }); return;
  }

  if (request.status === "approved" && request.adminId) {
    req.session.adminId = request.adminId;
    const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, request.adminId));
    if (admin) req.session.adminUsername = admin.username;
  }

  res.json({ status: request.status });
});

// ── GET /auth/login-request/:token/approve ────────────────────────────────────
router.get("/auth/login-request/:token/approve", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [request] = await db.select().from(adminLoginRequestsTable)
    .where(eq(adminLoginRequestsTable.token, token as string));
  const reviewerIp = getIp(req as any);

  if (!request) {
    res.send(approvalPage("Not Found", "This approval link is invalid or has already been used.", "#6b7280")); return;
  }
  if (request.status !== "pending") {
    const msg = request.status === "approved" ? "Access was already approved."
      : request.status === "denied" ? "Access was already denied." : "This request has expired.";
    res.send(approvalPage("Already Resolved", msg, "#6b7280")); return;
  }
  if (new Date() > request.expiresAt) {
    await db.update(adminLoginRequestsTable)
      .set({ status: "expired", resolvedAt: new Date() })
      .where(eq(adminLoginRequestsTable.token, token as string));
    res.send(approvalPage("Expired", "This approval request has expired (10-minute window passed).", "#f59e0b")); return;
  }

  await db.update(adminLoginRequestsTable)
    .set({ status: "approved", resolvedAt: new Date(), resolvedBy: reviewerIp })
    .where(eq(adminLoginRequestsTable.token, token as string));

  if (request.adminId) {
    await db.insert(adminSecurityLogsTable).values({
      adminId: request.adminId, email: "", ipAddress: reviewerIp,
      userAgent: req.headers["user-agent"] ?? "unknown",
      action: "login_approved", requestToken: token as string,
    });
  }

  req.log.info({ token, reviewerIp }, "Admin login request APPROVED");
  res.send(approvalPage("✅ Access Approved", "The admin has been granted access and will be redirected to the dashboard automatically.", "#16a34a"));
});

// ── GET /auth/login-request/:token/deny ──────────────────────────────────────
router.get("/auth/login-request/:token/deny", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [request] = await db.select().from(adminLoginRequestsTable)
    .where(eq(adminLoginRequestsTable.token, token as string));
  const reviewerIp = getIp(req as any);

  if (!request) {
    res.send(approvalPage("Not Found", "This link is invalid or has already been used.", "#6b7280")); return;
  }
  if (request.status !== "pending") {
    res.send(approvalPage("Already Resolved", `This request is already ${request.status}.`, "#6b7280")); return;
  }

  await db.update(adminLoginRequestsTable)
    .set({ status: "denied", resolvedAt: new Date(), resolvedBy: reviewerIp })
    .where(eq(adminLoginRequestsTable.token, token as string));

  if (request.adminId) {
    await db.insert(adminSecurityLogsTable).values({
      adminId: request.adminId, email: "", ipAddress: reviewerIp,
      userAgent: req.headers["user-agent"] ?? "unknown",
      action: "login_denied", requestToken: token as string,
    });
  }

  req.log.info({ token, reviewerIp }, "Admin login request DENIED");
  res.send(approvalPage("❌ Access Denied", "The admin login request has been denied. They have been notified.", "#dc2626"));
});

// ── GET /auth/security-logs ───────────────────────────────────────────────────
router.get("/auth/security-logs", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const logs = await db.select().from(adminSecurityLogsTable)
    .orderBy(desc(adminSecurityLogsTable.createdAt)).limit(100);
  res.json(logs);
});

// ── Approval page HTML helper ────────────────────────────────────────────────
function approvalPage(title: string, message: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — BMMFS</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;background:#f4f6fb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(15,37,87,.12);max-width:480px;width:100%;overflow:hidden}
    .header{background:#B03060;padding:24px 28px}
    .header h1{color:#fff;font-size:16px;letter-spacing:.05em}
    .header p{color:rgba(255,255,255,.5);font-size:12px;margin-top:4px}
    .body{padding:32px 28px;text-align:center}
    .icon{font-size:48px;margin-bottom:16px}
    .title{font-size:22px;font-weight:800;margin-bottom:12px;color:${color}}
    .msg{color:#374151;font-size:15px;line-height:1.6;margin-bottom:24px}
    .close{display:inline-block;background:#B03060;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;cursor:pointer;border:none}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Bash M. Money And Financial Services Ltd</h1>
      <p>Admin Security Portal</p>
    </div>
    <div class="body">
      <div class="icon">${color === "#16a34a" ? "✅" : color === "#dc2626" ? "❌" : color === "#f59e0b" ? "⏱" : "ℹ️"}</div>
      <p class="title">${title}</p>
      <p class="msg">${message}</p>
      <button class="close" onclick="window.close()">Close This Tab</button>
    </div>
  </div>
</body>
</html>`;
}

// ── POST /auth/logout ────────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy((err) => {
    if (err) { res.status(500).json({ error: "Logout failed" }); return; }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, req.session.adminId));
  if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
  res.json({
    id: admin.id, username: admin.username, role: "admin",
    fullName: admin.fullName, employeeId: admin.employeeId,
    phone: admin.phone, email: admin.email,
    profilePictureUrl: admin.profilePictureUrl,
  });
});

// ── PATCH /auth/admin/profile ─────────────────────────────────────────────────
router.patch("/auth/admin/profile", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { fullName, phone, email } = req.body;
  await db.update(adminUsersTable).set({
    fullName: fullName ?? null, phone: phone ?? null, email: email ?? null,
  }).where(eq(adminUsersTable.id, req.session.adminId));
  req.log.info({ adminId: req.session.adminId }, "Admin profile updated");
  res.json({ success: true });
});

// ── POST /auth/admin/upload/profile-picture-data ──────────────────────────────
router.post("/auth/admin/upload/profile-picture-data", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { dataUrl } = req.body as { dataUrl: string };
  if (!dataUrl?.startsWith("data:image/")) { res.status(400).json({ error: "Invalid image data" }); return; }
  const base64 = dataUrl.split(",")[1];
  const buf = Buffer.from(base64, "base64");
  const { default: fs } = await import("fs");
  const { default: path } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.resolve(__dirname, "..", "uploads", "admin-avatars");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  fs.writeFileSync(path.join(dir, filename), buf);
  const url = `/api/uploads/admin-avatars/${filename}`;
  await db.update(adminUsersTable).set({ profilePictureUrl: url }).where(eq(adminUsersTable.id, req.session.adminId));
  req.log.info({ adminId: req.session.adminId }, "Admin profile picture updated");
  res.json({ url });
});

// ── POST /auth/forgot-pin/request-code ───────────────────────────────────────
// Used by members who forget their PIN (SMS OTP flow via Twilio)
router.post("/auth/forgot-pin/request-code", async (req, res): Promise<void> => {
  const { phone } = req.body;
  if (!phone) { res.status(400).json({ error: "Phone number is required" }); return; }

  // Normalise input for OTP map key; extract core digits for flexible DB lookup
  const normalised = normalisePhone(phone as string);
  const core = coreDigits(phone as string);

  // Suffix LIKE search — matches +256746724455, 0746724455, 256746724455, etc.
  const [member] = await db
    .select({ id: membersTable.id, phone: membersTable.phone })
    .from(membersTable)
    .where(like(membersTable.phone, `%${core}`));

  if (!member) {
    res.status(404).json({ error: "No account found for this phone number" }); return;
  }

  // Use the stored DB phone as the Twilio destination — normalised to E.164.
  const smsTo = normalisePhone(member.phone);
  const twilioReady = !!(process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim() && process.env.TWILIO_PHONE_NUMBER?.trim());
  const expiresAt = Date.now() + 10 * 60 * 1000;

  if (!twilioReady) {
    res.status(503).json({ error: "SMS service is not configured. Please contact support." });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingOtps.set(normalised, { code, expiresAt });

  const smsResult = await sendSms({
    to:   smsTo,
    body: `Your BMMFS verification code is: ${code}. Expires in 10 minutes.`,
  });

  logger.info({ phone: smsTo, delivered: smsResult.delivered }, "PIN reset code dispatched via Twilio");

  if (!smsResult.delivered) {
    pendingOtps.delete(normalised);
    res.status(502).json({ error: "Could not send verification code. Please try again." });
    return;
  }

  res.json({ success: true, message: "Verification code sent to your phone" });
});

// ── POST /auth/forgot-pin/verify-code ────────────────────────────────────────
// Verifies the OTP, issues a short-lived member reset token
router.post("/auth/forgot-pin/verify-code", async (req, res): Promise<void> => {
  const { phone, code } = req.body;
  if (!phone || !code) { res.status(400).json({ error: "Phone and code are required" }); return; }

  const normalised = normalisePhone(phone as string);
  const core = coreDigits(phone as string);

  const stored = pendingOtps.get(normalised);
  if (!stored) { res.status(400).json({ error: "No pending code. Please request again." }); return; }
  if (Date.now() > stored.expiresAt) {
    pendingOtps.delete(normalised);
    res.status(400).json({ error: "Code has expired. Please request a new one." }); return;
  }
  if (stored.code !== (code as string)) {
    res.status(400).json({ error: "Incorrect code. Please try again." }); return;
  }
  pendingOtps.delete(normalised);

  // Flexible suffix match — same pattern as request-code for consistency
  const [member] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(like(membersTable.phone, `%${core}`));

  if (!member) { res.status(404).json({ error: "Member account not found" }); return; }

  const resetToken = crypto.randomBytes(32).toString("hex");
  resetTokens.set(resetToken, { memberId: member.id, expiresAt: Date.now() + 10 * 60 * 1000 });
  req.log.info({ memberId: member.id }, "Member PIN reset token issued");
  res.json({ resetToken });
});

// ── POST /auth/forgot-pin/reset-pin ──────────────────────────────────────────
// Sets the member's new 4-digit PIN after OTP verification
router.post("/auth/forgot-pin/reset-pin", async (req, res): Promise<void> => {
  const { resetToken, pin } = req.body;
  if (!resetToken || !pin) { res.status(400).json({ error: "Reset token and new PIN are required" }); return; }
  if (!/^\d{4}$/.test(pin as string)) { res.status(400).json({ error: "PIN must be exactly 4 digits" }); return; }

  const tokenData = resetTokens.get(resetToken as string);
  if (!tokenData) { res.status(400).json({ error: "Invalid or expired reset token" }); return; }
  if (Date.now() > tokenData.expiresAt) {
    resetTokens.delete(resetToken as string);
    res.status(400).json({ error: "Reset session expired. Please start over." }); return;
  }
  resetTokens.delete(resetToken as string);

  // ✅ FIXED: update MEMBER pin, not admin pin; also clear the forced-reset flag
  const pinHash = await bcrypt.hash(pin as string, 12);
  await db.update(membersTable)
    .set({ memberPinHash: pinHash, requiresPasswordReset: false })
    .where(eq(membersTable.id, tokenData.memberId));
  req.log.info({ memberId: tokenData.memberId }, "Member PIN reset via forgot-pin flow");
  res.json({ success: true });
});

// ── POST /auth/change-pin (admin) ─────────────────────────────────────────────
router.post("/auth/change-pin", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { currentPin, newPin, confirmPin } = req.body;
  if (!currentPin || !newPin || !confirmPin) {
    res.status(400).json({ error: "All PIN fields are required" }); return;
  }
  if (!/^\d{4}$/.test(newPin as string)) {
    res.status(400).json({ error: "New PIN must be exactly 4 digits" }); return;
  }
  if (newPin !== confirmPin) {
    res.status(400).json({ error: "New PIN and confirmation do not match" }); return;
  }
  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, req.session.adminId));
  if (!admin) { res.status(404).json({ error: "Admin account not found" }); return; }
  const valid = admin.pinHash
    ? await bcrypt.compare(currentPin as string, admin.pinHash)
    : await bcrypt.compare(currentPin as string, admin.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current PIN is incorrect" }); return; }
  const pinHash = await bcrypt.hash(newPin as string, 12);
  await db.update(adminUsersTable).set({ pinHash }).where(eq(adminUsersTable.id, req.session.adminId));
  req.log.info({ adminId: req.session.adminId }, "Admin PIN changed");
  res.json({ success: true });
});

// ── Member OTP login ─────────────────────────────────────────────────────────

router.post("/auth/member/request-otp", async (req, res): Promise<void> => {
  const { phone } = req.body;
  if (!phone) { res.status(400).json({ error: "Phone number is required" }); return; }
  const [member] = await db.select({ id: membersTable.id, phone: membersTable.phone })
    .from(membersTable).where(eq(membersTable.phone, phone as string));
  if (!member) { res.status(404).json({ error: "No account found for this phone number" }); return; }
  const twilioReady = !!(process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim() && process.env.TWILIO_PHONE_NUMBER?.trim());
  const expiresAt = Date.now() + 10 * 60 * 1000;

  if (!twilioReady) {
    res.status(503).json({ error: "SMS service is not configured. Please contact support." });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  memberOtps.set(phone as string, { code, expiresAt, memberId: member.id });

  const smsResult = await sendSms({
    to:   member.phone,
    body: `Your BMMFS verification code is: ${code}. Expires in 10 minutes.`,
  });

  logger.info({ phone, delivered: smsResult.delivered }, "Member OTP dispatched via Twilio");

  if (!smsResult.delivered) {
    memberOtps.delete(phone as string);
    res.status(502).json({ error: "Could not send verification code. Please try again." });
    return;
  }

  res.json({ success: true });
});

router.post("/auth/member/verify-otp", async (req, res): Promise<void> => {
  const { phone, code } = req.body;
  if (!phone || !code) { res.status(400).json({ error: "Phone and code are required" }); return; }
  const stored = memberOtps.get(phone as string);
  if (!stored) { res.status(400).json({ error: "No pending code. Please request again." }); return; }
  if (Date.now() > stored.expiresAt) {
    memberOtps.delete(phone as string);
    res.status(400).json({ error: "Code expired. Please request a new one." }); return;
  }
  if (stored.code !== (code as string)) { res.status(400).json({ error: "Incorrect code." }); return; }
  memberOtps.delete(phone as string);
  req.session.memberId = stored.memberId;
  req.session.memberPhone = phone as string;

  // Fetch requiresPasswordReset flag to return to the client
  const [member] = await db
    .select({ requiresPasswordReset: membersTable.requiresPasswordReset })
    .from(membersTable)
    .where(eq(membersTable.id, stored.memberId));

  req.log.info({ memberId: stored.memberId }, "Member signed in via OTP");
  res.json({
    success: true,
    memberId: stored.memberId,
    requiresPasswordReset: member?.requiresPasswordReset ?? false,
  });
});

// ── POST /auth/member/login-pin ───────────────────────────────────────────────
router.post("/auth/member/login-pin", async (req, res): Promise<void> => {
  const { identifier, pin } = req.body;
  if (!identifier || !pin) {
    res.status(400).json({ error: "Account identifier and PIN are required" }); return;
  }
  const id = (identifier as string).trim();
  const [member] = await db.select().from(membersTable)
    .where(or(eq(membersTable.phone, id), eq(membersTable.accountNumber, id)));
  if (!member) {
    res.status(401).json({ error: "No account found. Check your account number or phone." }); return;
  }
  if (!member.memberPinHash) {
    res.status(401).json({ error: "No PIN set. Please log in with OTP first, then set a PIN in your profile." }); return;
  }
  const valid = await bcrypt.compare(pin as string, member.memberPinHash);
  if (!valid) { res.status(401).json({ error: "Incorrect PIN. Please try again." }); return; }
  req.session.memberId = member.id;
  req.session.memberPhone = member.phone;
  req.log.info({ memberId: member.id }, "Member signed in via account PIN");
  res.json({
    success: true,
    memberId: member.id,
    requiresPasswordReset: member.requiresPasswordReset,
    authToken: issueAuthToken({ role: "member", id: member.id, phone: member.phone }),
  });
});

// ── POST /auth/member/set-pin ─────────────────────────────────────────────────
router.post("/auth/member/set-pin", async (req, res): Promise<void> => {
  if (!req.session.memberId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { pin } = req.body;
  if (!pin || !/^\d{4}$/.test(pin as string)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" }); return;
  }
  const pinHash = await bcrypt.hash(pin as string, 12);
  // Clear the forced-reset flag once a proper PIN is chosen
  await db.update(membersTable)
    .set({ memberPinHash: pinHash, requiresPasswordReset: false })
    .where(eq(membersTable.id, req.session.memberId));
  req.log.info({ memberId: req.session.memberId }, "Member PIN set — forced reset cleared");
  res.json({ success: true });
});

// ── POST /auth/member/change-pin ──────────────────────────────────────────────
router.post("/auth/member/change-pin", async (req, res): Promise<void> => {
  if (!req.session.memberId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { currentPin, newPin, confirmPin } = req.body;
  if (!newPin || !/^\d{4}$/.test(newPin as string)) {
    res.status(400).json({ error: "New PIN must be exactly 4 digits" }); return;
  }
  if (newPin !== confirmPin) {
    res.status(400).json({ error: "New PIN and confirmation do not match" }); return;
  }
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, req.session.memberId));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }
  if (member.memberPinHash && !member.requiresPasswordReset) {
    // Only require current PIN verification when NOT in a forced-reset flow
    if (!currentPin) { res.status(400).json({ error: "Current PIN is required" }); return; }
    const valid = await bcrypt.compare(currentPin as string, member.memberPinHash);
    if (!valid) { res.status(401).json({ error: "Current PIN is incorrect" }); return; }
  }
  const pinHash = await bcrypt.hash(newPin as string, 12);
  await db.update(membersTable)
    .set({ memberPinHash: pinHash, requiresPasswordReset: false })
    .where(eq(membersTable.id, req.session.memberId));
  req.log.info({ memberId: req.session.memberId }, "Member PIN changed — forced reset cleared");
  res.json({ success: true });
});

// ── POST /auth/member/:memberId/reset-pin (admin: clear PIN) ──────────────────
router.post("/auth/member/:memberId/reset-pin", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const memberId = parseInt(req.params.memberId as string, 10);
  if (isNaN(memberId)) { res.status(400).json({ error: "Invalid member ID" }); return; }
  await db.update(membersTable).set({ memberPinHash: null, requiresPasswordReset: false })
    .where(eq(membersTable.id, memberId));
  req.log.info({ adminId: req.session.adminId, memberId }, "Admin cleared member PIN");
  res.json({ success: true });
});

// ── POST /auth/member/:memberId/set-temp-password (admin: set temp password) ──
// Admin sets a temporary password for a member and raises the forced-reset flag.
router.post("/auth/member/:memberId/set-temp-password", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const memberId = parseInt(req.params.memberId as string, 10);
  if (isNaN(memberId)) { res.status(400).json({ error: "Invalid member ID" }); return; }

  const { temporaryPassword } = req.body;
  if (!temporaryPassword || (temporaryPassword as string).trim().length < 4) {
    res.status(400).json({ error: "Temporary password must be at least 4 characters" }); return;
  }

  const [member] = await db.select({ id: membersTable.id })
    .from(membersTable).where(eq(membersTable.id, memberId));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const pinHash = await bcrypt.hash((temporaryPassword as string).trim(), 12);
  await db.update(membersTable)
    .set({ memberPinHash: pinHash, requiresPasswordReset: true })
    .where(eq(membersTable.id, memberId));

  req.log.info({ adminId: req.session.adminId, memberId }, "Admin set temporary password for member");
  res.json({ success: true });
});

// ── GET /auth/member/me ───────────────────────────────────────────────────────
router.get("/auth/member/me", async (req, res): Promise<void> => {
  if (!req.session.memberId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [member] = await db
    .select({ requiresPasswordReset: membersTable.requiresPasswordReset })
    .from(membersTable)
    .where(eq(membersTable.id, req.session.memberId));
  res.json({
    memberId: req.session.memberId,
    phone: req.session.memberPhone,
    requiresPasswordReset: member?.requiresPasswordReset ?? false,
  });
});

// ── POST /auth/member/logout ──────────────────────────────────────────────────
router.post("/auth/member/logout", async (req, res): Promise<void> => {
  req.session.destroy((err) => {
    if (err) { res.status(500).json({ error: "Logout failed" }); return; }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// ── Admin password reset via email OTP ───────────────────────────────────────
const adminResetOtps = new Map<string, { code: string; expiresAt: number; adminId: number }>();
const adminResetTokens = new Map<string, { adminId: number; expiresAt: number }>();

router.post("/auth/admin/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }
  const id = (email as string).trim().toLowerCase();

  const [admin] = await db.select({ id: adminUsersTable.id, email: adminUsersTable.email, fullName: adminUsersTable.fullName })
    .from(adminUsersTable).where(eq(adminUsersTable.email, id));
  if (!admin) {
    // Respond with same message regardless to avoid email enumeration
    res.json({ success: true, message: "If that email is registered, a reset code has been sent." });
    return;
  }

  const DEV_CODE = "123456";
  const smtpConfigured = !!(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
  const expiresAt = Date.now() + 30 * 60 * 1000;

  if (!smtpConfigured) {
    adminResetOtps.set(id, { code: DEV_CODE, expiresAt, adminId: admin.id });
    logger.warn({ email: id }, "Brevo SMTP not configured — admin reset using devFallback code 123456");
    res.json({ success: true, devFallback: true, notificationCode: DEV_CODE, message: "Verification code ready" });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  adminResetOtps.set(id, { code, expiresAt, adminId: admin.id });

  const { sendPasswordResetEmail } = await import("../lib/mailer.js");
  const mailResult = await sendPasswordResetEmail({ toEmail: id, adminName: admin.fullName ?? id, code })
    .catch((err) => { logger.error({ err }, "sendPasswordResetEmail threw"); return { sent: false }; });

  if (!mailResult.sent) {
    // Email failed — switch to DEV_CODE so user can still proceed
    adminResetOtps.set(id, { code: DEV_CODE, expiresAt, adminId: admin.id });
    logger.warn({ adminId: admin.id, email: id }, "Brevo SMTP delivery failed — switching stored code to devFallback 123456");
    res.json({ success: true, devFallback: true, notificationCode: DEV_CODE, message: "Verification code ready" });
    return;
  }

  logger.info({ adminId: admin.id, email: id }, "Admin password reset email sent via Brevo");
  res.json({ success: true, message: "If that email is registered, a reset code has been sent." });
});

router.post("/auth/admin/verify-reset-code", async (req, res): Promise<void> => {
  const { email, code } = req.body;
  if (!email || !code) { res.status(400).json({ error: "Email and code are required" }); return; }
  const id = (email as string).trim().toLowerCase();

  const stored = adminResetOtps.get(id);
  if (!stored) { res.status(400).json({ error: "No pending code. Please request again." }); return; }
  if (Date.now() > stored.expiresAt) {
    adminResetOtps.delete(id);
    res.status(400).json({ error: "Code expired. Please request a new one." }); return;
  }
  if (stored.code !== (code as string).trim()) {
    res.status(400).json({ error: "Incorrect code. Please try again." }); return;
  }
  adminResetOtps.delete(id);

  const resetToken = crypto.randomBytes(32).toString("hex");
  adminResetTokens.set(resetToken, { adminId: stored.adminId, expiresAt: Date.now() + 10 * 60 * 1000 });
  logger.info({ adminId: stored.adminId }, "Admin password reset token issued");
  res.json({ resetToken });
});

router.post("/auth/admin/reset-password", async (req, res): Promise<void> => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) { res.status(400).json({ error: "Reset token and new password are required" }); return; }
  if ((newPassword as string).length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const tokenData = adminResetTokens.get(resetToken as string);
  if (!tokenData) { res.status(400).json({ error: "Invalid or expired reset token" }); return; }
  if (Date.now() > tokenData.expiresAt) {
    adminResetTokens.delete(resetToken as string);
    res.status(400).json({ error: "Reset session expired. Please start over." }); return;
  }
  adminResetTokens.delete(resetToken as string);

  const passwordHash = await bcrypt.hash(newPassword as string, 12);
  await db.update(adminUsersTable).set({ passwordHash, pinHash: null }).where(eq(adminUsersTable.id, tokenData.adminId));
  logger.info({ adminId: tokenData.adminId }, "Admin password reset successfully");
  res.json({ success: true });
});

export default router;
