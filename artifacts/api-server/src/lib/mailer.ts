import { logger } from "./logger";

const NOTIFY_EMAILS = ["edrickwaiswa@gmail.com", "kakembob1@gmail.com"];

function getBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0].trim();
    return `https://${first}`;
  }
  return "http://localhost:80";
}

function buildEmailHtml(params: {
  adminName: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  timeStr: string;
  approveUrl: string;
  denyUrl: string;
}): string {
  const { adminName, ipAddress, userAgent, timeStr, approveUrl, denyUrl } = params;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
    <div style="background:#0f2557;padding:24px 28px;display:flex;align-items:center;gap:14px;">
      <div>
        <h1 style="margin:0;color:#c9a144;font-size:20px;letter-spacing:0.04em;">🔐 Admin Login Request</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.60);font-size:13px;">Bash M. Money And Financial Services Ltd</p>
      </div>
    </div>
    <div style="background:#fff;padding:28px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.5;">
        A login attempt was made to the admin dashboard. Please review and approve or deny access.
      </p>
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-weight:700;color:#374151;font-size:13px;width:120px;">Admin</td>
          <td style="padding:10px 14px;color:#111827;font-size:13px;">${adminName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:700;color:#374151;font-size:13px;">IP Address</td>
          <td style="padding:10px 14px;color:#111827;font-family:monospace;font-size:13px;">${ipAddress}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-weight:700;color:#374151;font-size:13px;">Time</td>
          <td style="padding:10px 14px;color:#111827;font-size:13px;">${timeStr}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:700;color:#374151;font-size:13px;">Device</td>
          <td style="padding:10px 14px;color:#6b7280;font-size:11px;">${userAgent.substring(0, 90)}</td>
        </tr>
      </table>
      <div style="background:#fff8e1;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;color:#92400e;font-size:13px;">⏱ This request expires in <strong>10 minutes</strong>. If you did not initiate this, deny immediately.</p>
      </div>
      <div style="display:flex;gap:12px;">
        <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;">✅ Approve Access</a>
        &nbsp;&nbsp;
        <a href="${denyUrl}" style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;">❌ Deny Access</a>
      </div>
      <p style="margin:28px 0 0;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
        This is an automated security alert from Bash M. Money And Financial Services Ltd. Do not share these links.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendPasswordResetEmail(params: {
  toEmail: string;
  adminName: string;
  code: string;
}): Promise<{ sent: boolean }> {
  const { toEmail, adminName, code } = params;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
    <div style="background:#B03060;padding:24px 28px;">
      <h1 style="margin:0;color:#fff;font-size:18px;letter-spacing:0.04em;">🔑 Password Reset Code</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.65);font-size:13px;">Bash M. Money And Financial Services Ltd</p>
    </div>
    <div style="background:#fff;padding:28px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.5;">Hello ${adminName},</p>
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.5;">
        We received a request to reset the password for your admin account. Enter the code below to continue.
      </p>
      <div style="background:#fdf2f8;border:2px solid #B03060;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#B03060;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Your reset code</p>
        <p style="margin:0;color:#0f2557;font-size:36px;font-weight:900;letter-spacing:0.3em;font-family:monospace;">${code}</p>
        <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">Expires in 10 minutes</p>
      </div>
      <div style="background:#fff8e1;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;color:#92400e;font-size:13px;">⚠️ If you did not request this, your account may be at risk. Contact your system administrator immediately.</p>
      </div>
      <p style="margin:0;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
        This is an automated security email from Bash M. Money And Financial Services Ltd. Do not share this code.
      </p>
    </div>
  </div>
</body>
</html>`;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    logger.warn({ to: toEmail }, "SMTP not configured — password reset email could not be sent. Set SMTP_USER and SMTP_PASS secrets.");
    return { sent: false };
  }
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: `"BMMFS Security" <${smtpUser}>`,
      to: toEmail,
      subject: "🔑 Your BMMFS Admin Password Reset Code",
      html,
      text: `BMMFS Password Reset\n\nHello ${adminName},\n\nYour reset code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, contact your administrator immediately.`,
    });
    logger.info({ to: toEmail }, "Password reset email sent");
    return { sent: true };
  } catch (err) {
    logger.error({ err, to: toEmail }, "SMTP send failed for password reset email");
    return { sent: false };
  }
}

export async function sendLoginApprovalEmail(params: {
  adminName: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  attemptTime: Date;
}): Promise<void> {
  const { adminName, token, ipAddress, userAgent, attemptTime } = params;
  const base = getBaseUrl();
  const approveUrl = `${base}/api/auth/login-request/${token}/approve`;
  const denyUrl = `${base}/api/auth/login-request/${token}/deny`;
  const timeStr = attemptTime.toUTCString();

  const html = buildEmailHtml({ adminName, token, ipAddress, userAgent, timeStr, approveUrl, denyUrl });
  const text = [
    "BMMFS — Admin Login Request",
    "",
    `Admin:   ${adminName}`,
    `IP:      ${ipAddress}`,
    `Time:    ${timeStr}`,
    `Device:  ${userAgent.substring(0, 80)}`,
    "",
    `APPROVE: ${approveUrl}`,
    `DENY:    ${denyUrl}`,
    "",
    "This link expires in 10 minutes.",
  ].join("\n");

  // Try to send via nodemailer SMTP if credentials are configured
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: "gmail",
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"BMMFS Security" <${smtpUser}>`,
        to: NOTIFY_EMAILS.join(", "),
        subject: "🔐 Admin Login Request — Action Required [BMMFS]",
        html,
        text,
      });
      logger.info({ to: NOTIFY_EMAILS, token }, "Security approval email sent");
      return;
    } catch (err) {
      logger.error({ err }, "SMTP send failed — falling back to console");
    }
  }

  // Fallback: rich console log (works in dev; add SMTP_USER + SMTP_PASS secrets for real email)
  const line = "═".repeat(64);
  console.log(`\n${line}`);
  console.log(`  🔐  BMMFS — Admin Login Approval Request`);
  console.log(`  📧  [Add SMTP_USER + SMTP_PASS secrets to enable real email]`);
  console.log(line);
  console.log(`  To:      ${NOTIFY_EMAILS.join(", ")}`);
  console.log(`  Admin:   ${adminName}`);
  console.log(`  IP:      ${ipAddress}`);
  console.log(`  Time:    ${timeStr}`);
  console.log(line);
  console.log(`  ✅ APPROVE: ${approveUrl}`);
  console.log(`  ❌ DENY:    ${denyUrl}`);
  console.log(`${line}\n`);
}
