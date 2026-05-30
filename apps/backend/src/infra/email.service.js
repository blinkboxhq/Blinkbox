import nodemailer from "nodemailer";

// ─── Transporter ─────────────────────────────────────────────────────────────
// Priority: Resend → custom SMTP → Gmail fallback
function createTransport() {
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: process.env.RESEND_API_KEY },
    });
  }
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  if (process.env.ALERT_EMAIL_FROM && process.env.ALERT_EMAIL_PASS) {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: process.env.ALERT_EMAIL_FROM, pass: process.env.ALERT_EMAIL_PASS },
    });
  }
  return null;
}

const FROM_NAME  = process.env.EMAIL_FROM_NAME || "Blinkbox";
const FROM_ADDR  = process.env.EMAIL_FROM_ADDR || process.env.SMTP_USER || process.env.ALERT_EMAIL_FROM;
const APP_URL    = process.env.VITE_APP_URL    || "https://blinkbox.net";
const APP_NAME   = "Blinkbox";
const BRAND_CLR  = "#7c3aed";
const BRAND_DARK = "#5b21b6";

// ─── Base layout ─────────────────────────────────────────────────────────────
function layout({ preheader = "", subject = "", body = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%">

  <!--[if mso]><table width="100%"><tr><td><![endif]-->

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f4f4f6;line-height:1px">${preheader}&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;</div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f6;min-width:100%">
    <tr>
      <td align="center" style="padding:40px 16px 48px">

        <!-- Content column -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

          <!-- ── Logo header ── -->
          <tr>
            <td style="padding:0 0 28px">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px">
                    <div style="width:34px;height:34px;background:linear-gradient(135deg,${BRAND_CLR},${BRAND_DARK});border-radius:9px;text-align:center;line-height:34px;font-size:18px;font-weight:900;color:#fff;display:inline-block">⚡</div>
                  </td>
                  <td style="vertical-align:middle">
                    <span style="font-size:16px;font-weight:800;color:#18181b;letter-spacing:-0.03em">${APP_NAME}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Card ── -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
              ${body}
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:28px 0 0;text-align:center">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af">
                © 2026 ${APP_NAME} ·
                <a href="${APP_URL}/privacy" style="color:#9ca3af;text-decoration:underline">Privacy</a> ·
                <a href="${APP_URL}/terms" style="color:#9ca3af;text-decoration:underline">Terms</a>
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db">You received this because you have a ${APP_NAME} account.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

// ─── Button ───────────────────────────────────────────────────────────────────
function btn(href, label, color = BRAND_CLR) {
  return `
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="border-radius:10px;background:${color}" bgcolor="${color}">
          <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:-0.01em;white-space:nowrap" target="_blank">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

// ─── Divider ─────────────────────────────────────────────────────────────────
const divider = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0"><tr><td style="height:1px;background:#f3f4f6"></td></tr></table>`;

// ─── Info box ─────────────────────────────────────────────────────────────────
function infoBox(text, color = "#f5f3ff", borderColor = "#ddd6fe", textColor = "#5b21b6") {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
      <tr>
        <td style="background:${color};border-radius:10px;border-left:4px solid ${borderColor};padding:14px 18px">
          <p style="margin:0;font-size:13px;color:${textColor};line-height:1.6">${text}</p>
        </td>
      </tr>
    </table>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═════════════════════════════════════════════════════════════════════════════

// 1. VERIFICATION EMAIL ───────────────────────────────────────────────────────
export function buildVerificationEmail({ name, verifyUrl }) {
  const firstName = name.split(" ")[0];
  const body = `
    <!-- Top accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,${BRAND_CLR},#a855f7)"></div>

    <div style="padding:40px 44px 44px">
      <!-- Icon -->
      <div style="width:52px;height:52px;background:#f5f3ff;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px">📬</div>

      <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.03em">Verify your email, ${firstName}</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7">
        You're one step away from unlocking your ${APP_NAME} workspace. Click the button below to confirm your email address.
      </p>

      ${btn(verifyUrl, "Verify my email →")}

      ${infoBox("This link expires in <strong>24 hours</strong>. After that you'll need to request a new one.")}

      ${divider}

      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6">
        If you didn't create an account, you can safely ignore this email — nothing will happen.
        <br/>Having trouble? Copy and paste this URL into your browser:<br/>
        <span style="font-size:11px;color:#d1d5db;word-break:break-all">${verifyUrl}</span>
      </p>
    </div>
  `;

  return {
    subject: `Verify your ${APP_NAME} email`,
    html: layout({
      preheader: `Hi ${firstName}, please verify your email to activate your ${APP_NAME} account.`,
      subject: `Verify your ${APP_NAME} email`,
      body,
    }),
  };
}

// 2. WELCOME EMAIL ────────────────────────────────────────────────────────────
export function buildWelcomeEmail({ name }) {
  const firstName = name.split(" ")[0];
  const dashUrl = `${APP_URL}/dashboard`;
  const body = `
    <!-- Top accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,#059669,#34d399)"></div>

    <div style="padding:40px 44px 44px">
      <!-- Icon -->
      <div style="width:52px;height:52px;background:#ecfdf5;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px">🎉</div>

      <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.03em">You're in, ${firstName}!</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7">
        Your email is verified and your workspace is ready. ${APP_NAME} lets you build powerful automations — no code needed.
      </p>

      ${btn(dashUrl, "Go to my workspace →", "#059669")}

      ${divider}

      <!-- Quick start steps -->
      <p style="margin:0 0 18px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em">Get started in 3 steps</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${[
          ["⚡", "Add a trigger", "Start with a Webhook, Cron, or manual trigger to kick off your workflow."],
          ["🔗", "Connect actions", "Chain HTTP requests, email sends, database writes, and 200+ more actions."],
          ["🚀", "Run & monitor", "Execute your workflow and inspect every step's output in real time."],
        ].map(([icon, title, desc]) => `
          <tr>
            <td style="padding:0 0 18px">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:40px;vertical-align:top;padding-top:2px">
                    <div style="width:32px;height:32px;background:#f9fafb;border-radius:8px;text-align:center;line-height:32px;font-size:16px">${icon}</div>
                  </td>
                  <td style="padding-left:12px;vertical-align:top">
                    <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827">${title}</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5">${desc}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `).join("")}
      </table>

      ${divider}

      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6">
        Questions? Reply to this email — we read every message.
      </p>
    </div>
  `;

  return {
    subject: `Welcome to ${APP_NAME}! Your workspace is ready 🎉`,
    html: layout({
      preheader: `Your ${APP_NAME} workspace is live. Start building automations right now.`,
      subject: `Welcome to ${APP_NAME}!`,
      body,
    }),
  };
}

// 3. PASSWORD RESET EMAIL ─────────────────────────────────────────────────────
export function buildPasswordResetEmail({ name, resetUrl }) {
  const firstName = name.split(" ")[0];
  const body = `
    <!-- Top accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></div>

    <div style="padding:40px 44px 44px">
      <!-- Icon -->
      <div style="width:52px;height:52px;background:#fffbeb;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px">🔑</div>

      <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.03em">Reset your password</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7">
        Hi ${firstName}, we received a request to reset your password. Click the button below to choose a new one.
      </p>

      ${btn(resetUrl, "Reset my password →", "#d97706")}

      ${infoBox("⏱ This link expires in <strong>15 minutes</strong> for your security.", "#fffbeb", "#fcd34d", "#92400e")}

      ${divider}

      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6">
        If you didn't request a password reset, you can safely ignore this — your password hasn't changed.
        <br/>For security, never share this link with anyone.
        <br/><br/>
        Trouble clicking? Copy and paste:<br/>
        <span style="font-size:11px;color:#d1d5db;word-break:break-all">${resetUrl}</span>
      </p>
    </div>
  `;

  return {
    subject: `Reset your ${APP_NAME} password`,
    html: layout({
      preheader: `Password reset requested. This link expires in 15 minutes.`,
      subject: `Reset your ${APP_NAME} password`,
      body,
    }),
  };
}

// 4. PASSWORD CHANGED EMAIL ───────────────────────────────────────────────────
export function buildPasswordChangedEmail({ name }) {
  const firstName = name.split(" ")[0];
  const loginUrl  = `${APP_URL}/login`;
  const body = `
    <!-- Top accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,#059669,#34d399)"></div>

    <div style="padding:40px 44px 44px">
      <!-- Icon -->
      <div style="width:52px;height:52px;background:#ecfdf5;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px">✅</div>

      <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.03em">Password changed</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7">
        Hi ${firstName}, your ${APP_NAME} password was successfully updated. You can now sign in with your new password.
      </p>

      ${btn(loginUrl, "Sign in →", "#059669")}

      ${infoBox("🔐 <strong>Wasn't you?</strong> If you didn't change your password, secure your account immediately by resetting it again and contact us.", "#fef2f2", "#fca5a5", "#991b1b")}

      ${divider}

      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6">
        For your security, this is an automated notification. Password changes take effect immediately.
      </p>
    </div>
  `;

  return {
    subject: `Your ${APP_NAME} password has been changed`,
    html: layout({
      preheader: `Your password was successfully updated. If this wasn't you, secure your account immediately.`,
      subject: `Password changed — ${APP_NAME}`,
      body,
    }),
  };
}

// 5. LOGIN ALERT EMAIL ────────────────────────────────────────────────────────
export function buildLoginAlertEmail({ name, ip, userAgent, time }) {
  const firstName = name.split(" ")[0];
  const resetUrl  = `${APP_URL}/login`;
  const body = `
    <!-- Top accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,#3b82f6,#6366f1)"></div>

    <div style="padding:40px 44px 44px">
      <!-- Icon -->
      <div style="width:52px;height:52px;background:#eff6ff;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px">🔐</div>

      <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.03em">New sign-in detected</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7">
        Hi ${firstName}, we noticed a new sign-in to your ${APP_NAME} account. Here are the details:
      </p>

      <!-- Detail table -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:24px">
        ${[
          ["🕐 Time", time],
          ["📍 IP Address", ip || "Unknown"],
          ["🖥 Device", (userAgent || "Unknown").slice(0, 60)],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:12px 18px;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #f3f4f6;width:120px">${label}</td>
            <td style="padding:12px 18px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;font-family:'Courier New',monospace">${value}</td>
          </tr>
        `).join("")}
      </table>

      ${infoBox("✅ If this was you, no action needed. If you didn't sign in, reset your password immediately.", "#eff6ff", "#bfdbfe", "#1e40af")}

      ${btn(resetUrl, "Secure my account →", "#1d4ed8")}

      ${divider}

      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6">
        You're receiving this security alert because login notifications are enabled for your account.
      </p>
    </div>
  `;

  return {
    subject: `New sign-in to your ${APP_NAME} account`,
    html: layout({
      preheader: `A new sign-in was detected on your account from ${ip || "an unknown location"}.`,
      subject: `Sign-in alert — ${APP_NAME}`,
      body,
    }),
  };
}

// 6. REGISTRATION EMAIL (thanks for joining + verify) ─────────────────────────
export function buildRegistrationEmail({ name, verifyUrl }) {
  const firstName = name.split(" ")[0];
  const body = `
    <!-- Top accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,${BRAND_CLR},#a855f7,#ec4899)"></div>

    <div style="padding:40px 44px 44px">
      <!-- Icon -->
      <div style="width:52px;height:52px;background:#f5f3ff;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px">🚀</div>

      <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.03em">Thanks for joining, ${firstName}!</h1>
      <p style="margin:0 0 8px;font-size:15px;color:#6b7280;line-height:1.7">
        You're almost ready to start building automations. Your account has been created — just one quick step left.
      </p>
      <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.7">
        Click the button below to verify your email and unlock your workspace.
      </p>

      ${btn(verifyUrl, "Verify my email & get started →")}

      ${infoBox("⏱ This link expires in <strong>24 hours</strong>. After that you'll need to request a new one from the sign-in page.")}

      ${divider}

      <!-- What's waiting for you -->
      <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em">What's waiting for you</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${[
          ["⚡", "250+ nodes", "Connect any app or API without writing code."],
          ["🔄", "Unlimited runs", "Automate as much as you need — no per-task limits."],
          ["📊", "Live execution logs", "See every step's output in real time."],
        ].map(([icon, title, desc]) => `
          <tr>
            <td style="padding:0 0 14px">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:38px;vertical-align:top">
                    <span style="font-size:18px">${icon}</span>
                  </td>
                  <td style="vertical-align:top">
                    <span style="font-size:13px;font-weight:700;color:#111827">${title}</span>
                    <span style="font-size:13px;color:#9ca3af"> — ${desc}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `).join("")}
      </table>

      ${divider}

      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6">
        Didn't create this account? You can safely ignore this email — nothing will happen.
        <br/>Trouble clicking the button? Copy this into your browser:<br/>
        <span style="font-size:11px;color:#d1d5db;word-break:break-all">${verifyUrl}</span>
      </p>
    </div>
  `;

  return {
    subject: `Thanks for joining ${APP_NAME} — please verify your email`,
    html: layout({
      preheader: `Hi ${firstName}! Your ${APP_NAME} account is ready. Verify your email to get started.`,
      subject: `Thanks for joining ${APP_NAME}`,
      body,
    }),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SEND HELPERS
// ═════════════════════════════════════════════════════════════════════════════

async function send({ to, subject, html }) {
  const transporter = createTransport();
  if (!transporter) {
    console.warn("[Email] No email transporter configured — skipping send");
    return;
  }
  try {
    await transporter.sendMail({ from: `"${FROM_NAME}" <${FROM_ADDR}>`, to, subject, html });
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
  }
}

export async function sendRegistrationEmail(user, verifyUrl) {
  const { subject, html } = buildRegistrationEmail({ name: user.name, verifyUrl });
  await send({ to: user.email, subject, html });
}

export async function sendVerificationEmail(user, verifyUrl) {
  const { subject, html } = buildVerificationEmail({ name: user.name, verifyUrl });
  await send({ to: user.email, subject, html });
}

export async function sendWelcomeEmail(user) {
  const { subject, html } = buildWelcomeEmail({ name: user.name });
  await send({ to: user.email, subject, html });
}

export async function sendPasswordResetEmail(user, resetUrl, opts = {}) {
  if (opts.googleOnly) {
    const firstName = user.name.split(" ")[0];
    const { html } = buildPasswordResetEmail({ name: user.name, resetUrl });
    const googleBody = layout({
      preheader: `${firstName}, your account uses Google Sign-In — no password to reset.`,
      subject: `Password reset — ${APP_NAME}`,
      body: `
        <div style="height:4px;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></div>
        <div style="padding:40px 44px 44px">
          <div style="width:52px;height:52px;background:#fffbeb;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px">ℹ️</div>
          <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.03em">Your account uses Google Sign-In</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7">
            Hi ${firstName}, you signed up with Google so there's no password to reset. Just click below to sign in with your Google account.
          </p>
          ${btn(resetUrl, "Sign in with Google →", "#1d4ed8")}
          <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6">If you didn't request this, you can safely ignore it.</p>
        </div>
      `,
    });
    await send({
      to: user.email,
      subject: `Password reset request — ${APP_NAME}`,
      html: googleBody,
    });
    return;
  }
  const { subject, html } = buildPasswordResetEmail({ name: user.name, resetUrl });
  await send({ to: user.email, subject, html });
}

export async function sendPasswordChangedEmail(user) {
  const { subject, html } = buildPasswordChangedEmail({ name: user.name });
  await send({ to: user.email, subject, html });
}

export async function sendLoginAlertEmail(user, { ip, userAgent }) {
  const time = new Date().toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
  const { subject, html } = buildLoginAlertEmail({ name: user.name, ip, userAgent, time });
  await send({ to: user.email, subject, html });
}
