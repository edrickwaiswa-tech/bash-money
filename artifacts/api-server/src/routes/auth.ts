import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, or, desc } from "drizzle-orm";
import {
  db, adminUsersTable, membersTable,
  adminLoginRequestsTable, adminSecurityLogsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { sendLoginApprovalEmail } from "../lib/mailer";

const router: IRouter = Router();

// In-memory OTP and reset-token stores (single-admin, dev-friendly)
const pendingOtps = new Map<string, { code: string; expiresAt: number }>();
const resetTokens = new Map<string, { adminId: number; expiresAt: number }>();

// ── Helpers ──────────────────────────────────────────────────────────────────
function getIp(req: Parameters<typeof router.post>[1] extends (req: infer R, ...a: any[]) => any ? R : never): string {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return (Array.isArray(fwd) ? fwd[0] : fwd).split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

const REQUEST_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Emails that auto-approve without waiting for notification (dev/owner bypass)
const BYPASS_EMAILS = new Set(["edrickwaiswa@gmail.com", "kakembob1@gmail.com"]);

// ── POST /auth/login ─────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, pin, email, password } = req.body;
  const identifier = ((email || username) as string | undefined)?.trim().toLowerCase();
  const credential = (password || pin) as string | undefined;

  if (!identifier || !credential) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const ip = getIp(req as any);
  const ua = (req.headers["user-agent"] ?? "unknown") as string;

  // Lookup by email OR username (case-insensitive)
  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(or(eq(adminUsersTable.email, identifier), eq(adminUsersTable.username, identifier)));

  // Log every attempt
  await db.insert(adminSecurityLogsTable).values({
    adminId: admin?.id ?? null,
    email: identifier,
    ipAddress: ip,
    userAgent: ua,
    action: "login_attempt",
    requestToken: null,
  });

  if (!admin) {
    logger.warn({ identifier, ip }, "LOGIN FAIL — user not found in database");
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Verify credential — pinHash first, then passwordHash
  let valid = false;
  if (admin.pinHash) {
    valid = await bcrypt.compare(credential, admin.pinHash);
    logger.info({ adminId: admin.id, checked: "pinHash", valid }, "Credential check");
  }
  if (!valid) {
    valid = await bcrypt.compare(credential, admin.passwordHash);
    logger.info({ adminId: admin.id, checked: "passwordHash", valid }, "Credential check");
  }

  if (!valid) {
    await db.insert(adminSecurityLogsTable).values({
      adminId: admin.id,
      email: identifier,
      ipAddress: ip,
      userAgent: ua,
      action: "login_failed",
      requestToken: null,
    });
    logger.warn({ adminId: admin.id, identifier, ip }, "LOGIN FAIL — password/PIN mismatch");
    res.status(401).json({ error: "Incorrect email or password" });
    return;
  }

  // ── BYPASS: owner accounts skip the approval queue ─────────────────────────
  if (BYPASS_EMAILS.has(identifier)) {
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    await db.insert(adminSecurityLogsTable).values({
      adminId: admin.id,
      email: identifier,
      ipAddress: ip,
      userAgent: ua,
      action: "login_approved",
      requestToken: "bypass",
    });
    logger.info({ adminId: admin.id, identifier }, "LOGIN SUCCESS — owner bypass, session created");
    res.json({ status: "approved" });
    return;
  }

  // ── Credentials valid → create pending request ─────────────────────────────
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);

  await db.insert(adminLoginRequestsTable).values({
    adminId: admin.id,
    token,
    status: "pending",
    ipAddress: ip,
    userAgent: ua,
    expiresAt,
  });

  await db.insert(adminSecurityLogsTable).values({
    adminId: admin.id,
    email: identifier,
    ipAddress: ip,
    userAgent: ua,
    action: "login_pending",
    requestToken: token,
  });

  sendLoginApprovalEmail({
    adminName: admin.fullName ?? admin.username,
    token,
    ipAddress: ip,
    userAgent: ua,
    attemptTime: new Date(),
  }).catch((err) => logger.error({ err }, "sendLoginApprovalEmail failed"));

  logger.info({ adminId: admin.id, token, ip }, "Admin login request pending approval");
  res.json({ status: "pending", requestToken: token });
});

// ── GET /auth/login-request/status ───────────────────────────────────────────
// Polled by the login page every few seconds.
// If approved: also sets the session so the next /auth/me call succeeds.
router.get("/auth/login-request/status", async (req, res): Promise<void> => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Token required" });
    return;
  }

  const [request] = await db
    .select()
    .from(adminLoginRequestsTable)
    .where(eq(adminLoginRequestsTable.token, token));

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  // Auto-expire if still pending and past TTL
  if (request.status === "pending" && new Date() > request.expiresAt) {
    await db
      .update(adminLoginRequestsTable)
      .set({ status: "expired", resolvedAt: new Date() })
      .where(eq(adminLoginRequestsTable.token, token));

    if (request.adminId) {
      await db.insert(adminSecurityLogsTable).values({
        adminId: request.adminId,
        email: "",
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        action: "login_expired",
        requestToken: token,
      });
    }

    res.json({ status: "expired" });
    return;
  }

  // When approved: set the session so the user is immediately authenticated
  if (request.status === "approved" && request.adminId) {
    req.session.adminId = request.adminId;
    const [admin] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, request.adminId));
    if (admin) req.session.adminUsername = admin.username;
  }

  res.json({ status: request.status });
});

// ── GET /auth/login-request/:token/approve ────────────────────────────────────
// Browser link clicked from the approval email. Returns a styled HTML page.
router.get("/auth/login-request/:token/approve", async (req, res): Promise<void> => {
  const { token } = req.params;

  const [request] = await db
    .select()
    .from(adminLoginRequestsTable)
    .where(eq(adminLoginRequestsTable.token, token as string));

  const reviewerIp = getIp(req as any);

  if (!request) {
    res.send(approvalPage("Not Found", "This approval link is invalid or has already been used.", "#6b7280"));
    return;
  }

  if (request.status !== "pending") {
    const msg = request.status === "approved"
      ? "Access was already approved."
      : request.status === "denied"
        ? "Access was already denied."
        : "This request has expired.";
    res.send(approvalPage("Already Resolved", msg, "#6b7280"));
    return;
  }

  if (new Date() > request.expiresAt) {
    await db.update(adminLoginRequestsTable)
      .set({ status: "expired", resolvedAt: new Date() })
      .where(eq(adminLoginRequestsTable.token, token as string));
    res.send(approvalPage("Expired", "This approval request has expired (10-minute window passed).", "#f59e0b"));
    return;
  }

  await db.update(adminLoginRequestsTable)
    .set({ status: "approved", resolvedAt: new Date(), resolvedBy: reviewerIp })
    .where(eq(adminLoginRequestsTable.token, token as string));

  if (request.adminId) {
    await db.insert(adminSecurityLogsTable).values({
      adminId: request.adminId,
      email: "",
      ipAddress: reviewerIp,
      userAgent: req.headers["user-agent"] ?? "unknown",
      action: "login_approved",
      requestToken: token as string,
    });
  }

  req.log.info({ token, reviewerIp }, "Admin login request APPROVED");
  res.send(approvalPage("✅ Access Approved", "The admin has been granted access and will be redirected to the dashboard automatically.", "#16a34a"));
});

// ── GET /auth/login-request/:token/deny ──────────────────────────────────────
router.get("/auth/login-request/:token/deny", async (req, res): Promise<void> => {
  const { token } = req.params;

  const [request] = await db
    .select()
    .from(adminLoginRequestsTable)
    .where(eq(adminLoginRequestsTable.token, token as string));

  const reviewerIp = getIp(req as any);

  if (!request) {
    res.send(approvalPage("Not Found", "This link is invalid or has already been used.", "#6b7280"));
    return;
  }

  if (request.status !== "pending") {
    res.send(approvalPage("Already Resolved", `This request is already ${request.status}.`, "#6b7280"));
    return;
  }

  await db.update(adminLoginRequestsTable)
    .set({ status: "denied", resolvedAt: new Date(), resolvedBy: reviewerIp })
    .where(eq(adminLoginRequestsTable.token, token as string));

  if (request.adminId) {
    await db.insert(adminSecurityLogsTable).values({
      adminId: request.adminId,
      email: "",
      ipAddress: reviewerIp,
      userAgent: req.headers["user-agent"] ?? "unknown",
      action: "login_denied",
      requestToken: token as string,
    });
  }

  req.log.info({ token, reviewerIp }, "Admin login request DENIED");
  res.send(approvalPage("❌ Access Denied", "The admin login request has been denied. They have been notified.", "#dc2626"));
});

// ── GET /auth/security-logs ───────────────────────────────────────────────────
// Returns paginated security logs for admin review.
router.get("/auth/security-logs", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const logs = await db
    .select()
    .from(adminSecurityLogsTable)
    .orderBy(desc(adminSecurityLogsTable.createdAt))
    .limit(100);
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
    .header{background:#0f2557;padding:24px 28px}
    .header h1{color:#c9a144;font-size:16px;letter-spacing:.05em}
    .header p{color:rgba(255,255,255,.5);font-size:12px;margin-top:4px}
    .body{padding:32px 28px;text-align:center}
    .icon{font-size:48px;margin-bottom:16px}
    .title{font-size:22px;font-weight:800;margin-bottom:12px;color:${color}}
    .msg{color:#374151;font-size:15px;line-height:1.6;margin-bottom:24px}
    .close{display:inline-block;background:#0f2557;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;cursor:pointer;border:none}
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
router.post("/auth/forgot-pin/request-code", async (req, res): Promise<void> => {
  const { phone } = req.body;
  if (!phone) { res.status(400).json({ error: "Phone number is required" }); return; }

  const members = await db
    .select({ id: membersTable.id, phone: membersTable.phone })
    .from(membersTable)
    .where(eq(membersTable.phone, phone as string));

  if (members.length === 0) {
    res.status(404).json({ error: "No account found for this phone number" }); return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  pendingOtps.set(phone as string, { code, expiresAt });

  logger.info({ phone, code }, "🔐 [SIMULATED SMS] PIN Reset Code");
  console.log(`\n${"━".repeat(44)}`);
  console.log(`  📱 BMMFS — PIN Reset  |  To: ${phone}`);
  console.log(`  Code: ${code}  (expires in 10 min)`);
  console.log(`${"━".repeat(44)}\n`);

  res.json({ success: true, message: "Verification code generated", devCode: code });
});

// ── POST /auth/forgot-pin/verify-code ────────────────────────────────────────
router.post("/auth/forgot-pin/verify-code", async (req, res): Promise<void> => {
  const { phone, code } = req.body;
  if (!phone || !code) { res.status(400).json({ error: "Phone and code are required" }); return; }

  const stored = pendingOtps.get(phone as string);
  if (!stored) { res.status(400).json({ error: "No pending code. Please request again." }); return; }
  if (Date.now() > stored.expiresAt) {
    pendingOtps.delete(phone as string);
    res.status(400).json({ error: "Code has expired. Please request a new one." }); return;
  }
  if (stored.code !== (code as string)) {
    res.status(400).json({ error: "Incorrect code. Please try again." }); return;
  }
  pendingOtps.delete(phone as string);

  const [admin] = await db.select().from(adminUsersTable);
  if (!admin) { res.status(500).json({ error: "Admin account not found" }); return; }

  const resetToken = crypto.randomBytes(32).toString("hex");
  resetTokens.set(resetToken, { adminId: admin.id, expiresAt: Date.now() + 10 * 60 * 1000 });
  req.log.info({ adminId: admin.id }, "PIN reset token issued");
  res.json({ resetToken });
});

// ── POST /auth/forgot-pin/reset-pin ──────────────────────────────────────────
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

  const pinHash = await bcrypt.hash(pin as string, 12);
  await db.update(adminUsersTable).set({ pinHash }).where(eq(adminUsersTable.id, tokenData.adminId));
  req.log.info({ adminId: tokenData.adminId }, "Admin PIN updated");
  res.json({ success: true });
});

// ── Member OTP login ─────────────────────────────────────────────────────────
const memberOtps = new Map<string, { code: string; expiresAt: number; memberId: number }>();

router.post("/auth/member/request-otp", async (req, res): Promise<void> => {
  const { phone } = req.body;
  if (!phone) { res.status(400).json({ error: "Phone number is required" }); return; }
  const [member] = await db.select({ id: membersTable.id, phone: membersTable.phone })
    .from(membersTable).where(eq(membersTable.phone, phone as string));
  if (!member) { res.status(404).json({ error: "No account found for this phone number" }); return; }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  memberOtps.set(phone as string, { code, expiresAt: Date.now() + 10 * 60 * 1000, memberId: member.id });
  logger.info({ phone, code }, "📱 [SIMULATED SMS] Member Login Code");
  console.log(`\n${"━".repeat(44)}\n  📱 BMMFS Member Login  |  To: ${phone}\n  Code: ${code}\n${"━".repeat(44)}\n`);
  res.json({ success: true, devCode: code });
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
  req.log.info({ memberId: stored.memberId }, "Member signed in via OTP");
  res.json({ success: true, memberId: stored.memberId });
});

// ── POST /auth/change-pin ─────────────────────────────────────────────────────
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

// ── POST /auth/member/login-pin ───────────────────────────────────────────────
router.post("/auth/member/login-pin", async (req, res): Promise<void> => {
  const { identifier, pin } = req.body;
  if (!identifier || !pin) {
    res.status(400).json({ error: "Account identifier and PIN are required" }); return;
  }
  if (!/^\d{4}$/.test(pin as string)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" }); return;
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
  res.json({ success: true, memberId: member.id });
});

// ── POST /auth/member/set-pin ─────────────────────────────────────────────────
router.post("/auth/member/set-pin", async (req, res): Promise<void> => {
  if (!req.session.memberId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { pin } = req.body;
  if (!pin || !/^\d{4}$/.test(pin as string)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" }); return;
  }
  const pinHash = await bcrypt.hash(pin as string, 12);
  await db.update(membersTable).set({ memberPinHash: pinHash }).where(eq(membersTable.id, req.session.memberId));
  req.log.info({ memberId: req.session.memberId }, "Member PIN updated");
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
  if (member.memberPinHash) {
    if (!currentPin) { res.status(400).json({ error: "Current PIN is required" }); return; }
    const valid = await bcrypt.compare(currentPin as string, member.memberPinHash);
    if (!valid) { res.status(401).json({ error: "Current PIN is incorrect" }); return; }
  }
  const pinHash = await bcrypt.hash(newPin as string, 12);
  await db.update(membersTable).set({ memberPinHash: pinHash }).where(eq(membersTable.id, req.session.memberId));
  req.log.info({ memberId: req.session.memberId }, "Member PIN changed");
  res.json({ success: true });
});

// ── POST /auth/member/:memberId/reset-pin ─────────────────────────────────────
router.post("/auth/member/:memberId/reset-pin", async (req, res): Promise<void> => {
  if (!req.session.adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const memberId = parseInt(req.params.memberId as string, 10);
  if (isNaN(memberId)) { res.status(400).json({ error: "Invalid member ID" }); return; }
  await db.update(membersTable).set({ memberPinHash: null }).where(eq(membersTable.id, memberId));
  req.log.info({ adminId: req.session.adminId, memberId }, "Admin reset member PIN");
  res.json({ success: true });
});

// ── GET /auth/member/me ───────────────────────────────────────────────────────
router.get("/auth/member/me", async (req, res): Promise<void> => {
  if (!req.session.memberId) { res.status(401).json({ error: "Not authenticated" }); return; }
  res.json({ memberId: req.session.memberId, phone: req.session.memberPhone });
});

// ── POST /auth/member/logout ──────────────────────────────────────────────────
router.post("/auth/member/logout", async (req, res): Promise<void> => {
  req.session.destroy((err) => {
    if (err) { res.status(500).json({ error: "Logout failed" }); return; }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

export default router;
