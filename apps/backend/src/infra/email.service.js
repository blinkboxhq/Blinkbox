import nodemailer from "nodemailer";

const APP_URL    = process.env.VITE_APP_URL || "https://blinkbox.net";
const APP_NAME   = "Blinkbox";
const BRAND_CLR  = "#7c3aed";
const BRAND_DARK = "#5b21b6";

// ─── Send ─────────────────────────────────────────────────────────────────────
// Primary: Resend REST API (fetch — no SMTP, no port issues)
// Fallback: nodemailer → Gmail SMTP
async function send({ to, subject, html }) {
  const fromName = process.env.EMAIL_FROM_NAME || "Blinkbox";
  const fromAddr = process.env.EMAIL_FROM_ADDR || process.env.ALERT_EMAIL_FROM;

  if (!fromAddr) {
    console.error("[Email] EMAIL_FROM_ADDR not set — cannot send email");
    return;
  }

  const from = `${fromName} <${fromAddr}>`;

  // ── Resend REST API (preferred) ──────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(`[Email] Resend API error ${res.status}:`, JSON.stringify(data));
      } else {
        console.log(`[Email] Sent via Resend — id:${data.id} to:${to} subject:"${subject}"`);
      }
      return;
    } catch (err) {
      console.error("[Email] Resend fetch failed:", err.message);
    }
  }

  // ── Gmail SMTP fallback ──────────────────────────────────────────────────
  if (process.env.ALERT_EMAIL_FROM && process.env.ALERT_EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: process.env.ALERT_EMAIL_FROM, pass: process.env.ALERT_EMAIL_PASS },
      });
      await transporter.sendMail({ from, to, subject, html });
      console.log(`[Email] Sent via Gmail SMTP to:${to} subject:"${subject}"`);
    } catch (err) {
      console.error("[Email] Gmail SMTP failed:", err.message);
    }
    return;
  }

  console.error("[Email] No transport configured (set RESEND_API_KEY or ALERT_EMAIL_FROM+ALERT_EMAIL_PASS)");
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const BG   = `#000000`;
const CARD = `#0f0f0f`;
const BDR  = `#1c1c1c`;
const TXT  = `#ffffff`;
const MUT  = `#6b6b6b`;
const ACC  = `#7c3aed`;

function layout({ preheader = "", subject = "", body = "" }) {
  const appUrl = process.env.VITE_APP_URL || "https://blinkbox.net";
  const year   = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:${FONT};-webkit-text-size-adjust:100%;color:${TXT}">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${BG}">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}">
    <tr>
      <td align="center" style="padding:48px 16px 64px;background:${BG}">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">

          <!-- wordmark -->
          <tr>
            <td style="padding:0 0 32px">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:8px;font-size:18px;line-height:1">&#9889;</td>
                  <td style="vertical-align:middle">
                    <span style="font-size:15px;font-weight:700;color:${TXT};letter-spacing:-0.02em;font-family:${FONT}">blinkbox</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- card -->
          <tr>
            <td style="background:${CARD};border:1px solid ${BDR};border-radius:8px;overflow:hidden">
              <div style="height:2px;background:${ACC}"></div>
              ${body}
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:left">
              <p style="margin:0;font-size:11px;color:#333333;line-height:1.7;font-family:${FONT}">
                &copy; ${year} Blinkbox &nbsp;&middot;&nbsp;
                <a href="${appUrl}/privacy" style="color:#333333;text-decoration:none">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="${appUrl}/terms" style="color:#333333;text-decoration:none">Terms</a>
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#2a2a2a;font-family:${FONT}">You're receiving this because you have a Blinkbox account.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(href, label) {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
      <tr>
        <td style="background:${ACC};border-radius:6px" bgcolor="${ACC}">
          <a href="${href}" target="_blank"
            style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;font-family:${FONT};letter-spacing:-0.01em;white-space:nowrap">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

const divider = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0"><tr><td style="height:1px;background:${BDR}"></td></tr></table>`;

function row(label, value) {
  return `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${BDR};font-size:12px;font-weight:600;color:#444444;width:110px;font-family:${FONT};vertical-align:top">${label}</td>
      <td style="padding:11px 0;border-bottom:1px solid ${BDR};font-size:12px;color:${MUT};font-family:monospace;vertical-align:top;word-break:break-all">${value}</td>
    </tr>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═════════════════════════════════════════════════════════════════════════════

export function buildRegistrationEmail({ name, verifyUrl }) {
  const n = name.split(" ")[0];
  const body = `
    <div style="padding:40px 40px 36px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${ACC};text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT}">Account created</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TXT};letter-spacing:-0.02em;line-height:1.3;font-family:${FONT}">Verify your email, ${n}.</h1>
      <p style="margin:0;font-size:14px;color:${MUT};line-height:1.75;font-family:${FONT}">
        Your account is ready. Click below to verify your email address and activate your workspace.
      </p>
      ${btn(verifyUrl, "Verify email")}
      ${divider}
      <p style="margin:0 0 6px;font-size:12px;color:#333333;font-family:${FONT}">This link expires in 24 hours.</p>
      <p style="margin:0;font-size:11px;color:#2a2a2a;line-height:1.6;font-family:${FONT};word-break:break-all">
        Or copy: ${verifyUrl}
      </p>
    </div>`;

  return {
    subject: `Verify your Blinkbox email`,
    html: layout({ preheader: `${n}, verify your email to activate your Blinkbox account.`, subject: `Verify your Blinkbox email`, body }),
  };
}

export function buildVerificationEmail({ name, verifyUrl }) {
  const n = name.split(" ")[0];
  const body = `
    <div style="padding:40px 40px 36px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${ACC};text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT}">Email verification</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TXT};letter-spacing:-0.02em;line-height:1.3;font-family:${FONT}">New verification link, ${n}.</h1>
      <p style="margin:0;font-size:14px;color:${MUT};line-height:1.75;font-family:${FONT}">Here's your new verification link. It expires in 24 hours.</p>
      ${btn(verifyUrl, "Verify email")}
      ${divider}
      <p style="margin:0;font-size:11px;color:#2a2a2a;line-height:1.6;font-family:${FONT};word-break:break-all">
        Or copy: ${verifyUrl}
      </p>
    </div>`;

  return {
    subject: `Verify your Blinkbox email`,
    html: layout({ preheader: `New verification link for your Blinkbox account.`, subject: `Verify your Blinkbox email`, body }),
  };
}

export function buildWelcomeEmail({ name }) {
  const n = name.split(" ")[0];
  const appUrl = process.env.VITE_APP_URL || "https://blinkbox.net";
  const body = `
    <div style="padding:40px 40px 36px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${ACC};text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT}">You're in</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TXT};letter-spacing:-0.02em;line-height:1.3;font-family:${FONT}">Welcome to Blinkbox, ${n}.</h1>
      <p style="margin:0;font-size:14px;color:${MUT};line-height:1.75;font-family:${FONT}">
        Your workspace is live. Build your first automation — connect a trigger, chain your actions, run it.
      </p>
      ${btn(`${appUrl}/dashboard`, "Open workspace")}
      ${divider}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${[
          ["Triggers", "Webhook, cron, email, or manual — start any workflow instantly."],
          ["250+ nodes", "HTTP, database, AI, email, Slack, and hundreds more."],
          ["Live logs", "See every step's input and output in real time."],
        ].map(([t, d]) => `
          <tr>
            <td style="padding:0 0 18px;vertical-align:top">
              <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#888888;font-family:${FONT}">${t}</p>
              <p style="margin:0;font-size:13px;color:#333333;line-height:1.6;font-family:${FONT}">${d}</p>
            </td>
          </tr>`).join("")}
      </table>
    </div>`;

  return {
    subject: `Welcome to Blinkbox`,
    html: layout({ preheader: `Your Blinkbox workspace is ready, ${n}.`, subject: `Welcome to Blinkbox`, body }),
  };
}

export function buildPasswordResetEmail({ name, resetUrl }) {
  const n = name.split(" ")[0];
  const body = `
    <div style="padding:40px 40px 36px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${ACC};text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT}">Password reset</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TXT};letter-spacing:-0.02em;line-height:1.3;font-family:${FONT}">Reset your password, ${n}.</h1>
      <p style="margin:0;font-size:14px;color:${MUT};line-height:1.75;font-family:${FONT}">
        We received a request to reset your password. This link expires in 15 minutes.
      </p>
      ${btn(resetUrl, "Reset password")}
      ${divider}
      <p style="margin:0 0 6px;font-size:12px;color:#333333;font-family:${FONT}">Didn't request this? Ignore this email — your password hasn't changed.</p>
      <p style="margin:0;font-size:11px;color:#2a2a2a;line-height:1.6;font-family:${FONT};word-break:break-all">
        Or copy: ${resetUrl}
      </p>
    </div>`;

  return {
    subject: `Reset your Blinkbox password`,
    html: layout({ preheader: `Password reset link — expires in 15 minutes.`, subject: `Reset your Blinkbox password`, body }),
  };
}

export function buildPasswordChangedEmail({ name }) {
  const n = name.split(" ")[0];
  const appUrl = process.env.VITE_APP_URL || "https://blinkbox.net";
  const body = `
    <div style="padding:40px 40px 36px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${ACC};text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT}">Security</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TXT};letter-spacing:-0.02em;line-height:1.3;font-family:${FONT}">Password updated, ${n}.</h1>
      <p style="margin:0;font-size:14px;color:${MUT};line-height:1.75;font-family:${FONT}">
        Your Blinkbox password was successfully changed. You can sign in with your new password now.
      </p>
      ${btn(`${appUrl}/login`, "Sign in")}
      ${divider}
      <p style="margin:0;font-size:12px;color:#333333;line-height:1.7;font-family:${FONT}">
        Wasn't you? Reset your password immediately and contact us.
      </p>
    </div>`;

  return {
    subject: `Your Blinkbox password was changed`,
    html: layout({ preheader: `Password successfully updated on your Blinkbox account.`, subject: `Password changed`, body }),
  };
}

export function buildLoginAlertEmail({ name, ip, userAgent, time }) {
  const n = name.split(" ")[0];
  const appUrl = process.env.VITE_APP_URL || "https://blinkbox.net";
  const ua = (userAgent || "Unknown").slice(0, 80);
  const body = `
    <div style="padding:40px 40px 36px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${ACC};text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT}">Security alert</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TXT};letter-spacing:-0.02em;line-height:1.3;font-family:${FONT}">New sign-in, ${n}.</h1>
      <p style="margin:0 0 28px;font-size:14px;color:${MUT};line-height:1.75;font-family:${FONT}">
        A new sign-in was detected on your Blinkbox account.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BDR}">
        ${row("Time", time)}
        ${row("IP address", ip || "Unknown")}
        ${row("Device", ua)}
      </table>
      ${btn(`${appUrl}/login`, "Secure my account")}
      ${divider}
      <p style="margin:0;font-size:12px;color:#333333;font-family:${FONT}">If this was you, no action is needed.</p>
    </div>`;

  return {
    subject: `New sign-in to your Blinkbox account`,
    html: layout({ preheader: `New sign-in detected from ${ip || "unknown location"}.`, subject: `Sign-in alert`, body }),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SEND HELPERS
// ═════════════════════════════════════════════════════════════════════════════

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
    const googleBody = layout({
      preheader: `${firstName}, your account uses Google Sign-In — no password to reset.`,
      subject: `Password reset — ${APP_NAME}`,
      body: `
        <div style="padding:40px 40px 36px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${ACC};text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT}">Password reset</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TXT};letter-spacing:-0.02em;line-height:1.3;font-family:${FONT}">This account uses Google, ${firstName}.</h1>
          <p style="margin:0;font-size:14px;color:${MUT};line-height:1.75;font-family:${FONT}">
            You signed up with Google Sign-In so there's no password to reset. Sign in with Google instead.
          </p>
          ${btn(resetUrl, "Sign in with Google")}
          ${divider}
          <p style="margin:0;font-size:12px;color:#333333;font-family:${FONT}">Didn't request this? You can safely ignore it.</p>
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
