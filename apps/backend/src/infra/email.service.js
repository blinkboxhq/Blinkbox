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

const FONT    = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const BG      = `#000000`;
const CARD    = `#0d0d0d`;
const BDR     = `#1e1e1e`;
const TXT     = `#f0f0f0`;
const MUT     = `#636363`;
const DIM     = `#333333`;
const ACC     = `#7c3aed`;
const LOGO_URL = `https://blinkbox.net/logo.svg`;

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
<body style="margin:0;padding:0;background:${BG};font-family:${FONT};-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${BG};line-height:1px">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background:${BG}">
    <tr>
      <td align="center" style="padding:52px 20px 72px;background:${BG}">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:580px">

          <!-- logo header -->
          <tr>
            <td style="padding:0 0 36px 4px">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;line-height:0">
                    <img src="${LOGO_URL}" width="32" height="32" alt="blinkbox" style="display:block;width:32px;height:32px;border:0;outline:0" />
                  </td>
                  <td style="vertical-align:middle">
                    <span style="font-size:14px;font-weight:700;color:${TXT};letter-spacing:-0.02em;font-family:${FONT}">blinkbox</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- card -->
          <tr>
            <td style="background:${CARD};border:1px solid ${BDR};border-radius:10px;overflow:hidden;mso-border-alt:none">
              <!-- violet top bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="background:${ACC};height:3px;font-size:0;line-height:0">&nbsp;</td></tr>
              </table>
              ${body}
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:28px 4px 0">
              <p style="margin:0 0 4px;font-size:11px;color:${DIM};line-height:1.6;font-family:${FONT}">
                &copy; ${year} Blinkbox&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="${appUrl}/privacy" style="color:${DIM};text-decoration:none">Privacy</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="${appUrl}/terms" style="color:${DIM};text-decoration:none">Terms</a>
              </p>
              <p style="margin:0;font-size:11px;color:#252525;line-height:1.5;font-family:${FONT}">You received this because you have a Blinkbox account.</p>
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
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:32px">
      <tr>
        <td style="background:${ACC};border-radius:7px;mso-padding-alt:0" bgcolor="${ACC}">
          <a href="${href}" target="_blank"
            style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:7px;font-family:${FONT};letter-spacing:-0.01em;white-space:nowrap;mso-hide:false">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

const divider = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0">
    <tr><td style="height:1px;background:${BDR};font-size:0;line-height:0">&nbsp;</td></tr>
  </table>`;

function row(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BDR};font-size:11px;font-weight:600;color:#3a3a3a;width:100px;font-family:${FONT};vertical-align:top;white-space:nowrap">${label}</td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BDR};font-size:11px;color:${MUT};font-family:monospace;vertical-align:top;word-break:break-all">${value}</td>
    </tr>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═════════════════════════════════════════════════════════════════════════════

const P = `padding:44px 44px`;

function label(text) {
  return `<p style="margin:0 0 10px;font-size:11px;font-weight:700;color:${ACC};text-transform:uppercase;letter-spacing:0.1em;font-family:${FONT}">${text}</p>`;
}
function heading(text) {
  return `<h1 style="margin:0 0 18px;font-size:24px;font-weight:700;color:${TXT};letter-spacing:-0.03em;line-height:1.25;font-family:${FONT}">${text}</h1>`;
}
function body(text) {
  return `<p style="margin:0;font-size:14px;color:${MUT};line-height:1.8;font-family:${FONT}">${text}</p>`;
}
function note(text) {
  return `<p style="margin:24px 0 0;font-size:12px;color:#3a3a3a;line-height:1.7;font-family:${FONT}">${text}</p>`;
}
function fallback(url) {
  return `<p style="margin:12px 0 0;font-size:11px;color:#2e2e2e;line-height:1.6;font-family:${FONT};word-break:break-all">Can't click the button? Copy this link:<br/><span style="color:#404040">${url}</span></p>`;
}

export function buildRegistrationEmail({ name, verifyUrl }) {
  const n = name.split(" ")[0];
  const bodyHtml = `
    <div style="${P} 44px">
      ${label("Account created")}
      ${heading(`Verify your email, ${n}.`)}
      ${body("Your account is ready. Verify your email to unlock your workspace and start building automations.")}
      ${btn(verifyUrl, "Verify email address")}
      ${divider}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
        <tr>
          <td style="font-size:12px;color:#3a3a3a;font-family:${FONT}">Expires in</td>
          <td style="font-size:12px;color:#555555;font-family:${FONT};text-align:right;font-weight:600">24 hours</td>
        </tr>
      </table>
      ${fallback(verifyUrl)}
    </div>`;

  return {
    subject: `Verify your Blinkbox email`,
    html: layout({ preheader: `${n}, one step left — verify your email to activate your workspace.`, subject: `Verify your Blinkbox email`, body: bodyHtml }),
  };
}

export function buildVerificationEmail({ name, verifyUrl }) {
  const n = name.split(" ")[0];
  const bodyHtml = `
    <div style="${P} 44px">
      ${label("Email verification")}
      ${heading(`New verification link, ${n}.`)}
      ${body("Here's your fresh verification link. It expires in 24 hours — click below to verify your email.")}
      ${btn(verifyUrl, "Verify email address")}
      ${divider}
      ${fallback(verifyUrl)}
    </div>`;

  return {
    subject: `Verify your Blinkbox email`,
    html: layout({ preheader: `New verification link for your Blinkbox account — expires in 24 hours.`, subject: `Verify your Blinkbox email`, body: bodyHtml }),
  };
}

export function buildWelcomeEmail({ name }) {
  const n = name.split(" ")[0];
  const appUrl = process.env.VITE_APP_URL || "https://blinkbox.net";
  const bodyHtml = `
    <div style="${P} 44px">
      ${label("You're in")}
      ${heading(`Welcome to Blinkbox, ${n}.`)}
      ${body("Your workspace is live. Build your first automation — connect a trigger, chain your actions, run it.")}
      ${btn(`${appUrl}/dashboard`, "Open my workspace")}
      ${divider}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;border-collapse:collapse">
        ${[
          ["250+ nodes", "HTTP, database, AI, email, Slack — connect anything."],
          ["Any trigger", "Webhook, cron, email, or manual — start a workflow in seconds."],
          ["Live logs", "Step-by-step output for every execution, in real time."],
        ].map(([t, d]) => `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid ${BDR};vertical-align:top;font-size:13px;font-weight:600;color:#555555;font-family:${FONT};width:120px;white-space:nowrap">${t}</td>
            <td style="padding:12px 0 12px 20px;border-bottom:1px solid ${BDR};vertical-align:top;font-size:13px;color:#3a3a3a;line-height:1.5;font-family:${FONT}">${d}</td>
          </tr>`).join("")}
      </table>
    </div>`;

  return {
    subject: `Welcome to Blinkbox`,
    html: layout({ preheader: `Your Blinkbox workspace is ready, ${n}. Start building.`, subject: `Welcome to Blinkbox`, body: bodyHtml }),
  };
}

export function buildPasswordResetEmail({ name, resetUrl }) {
  const n = name.split(" ")[0];
  const bodyHtml = `
    <div style="${P} 44px">
      ${label("Password reset")}
      ${heading(`Reset your password, ${n}.`)}
      ${body("We received a request to reset the password for your Blinkbox account. Click below to choose a new one.")}
      ${btn(resetUrl, "Reset password")}
      ${divider}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
        <tr>
          <td style="font-size:12px;color:#3a3a3a;font-family:${FONT}">Expires in</td>
          <td style="font-size:12px;color:#555555;font-family:${FONT};text-align:right;font-weight:600">15 minutes</td>
        </tr>
      </table>
      ${note("Didn't request this? Your password has not changed — you can safely ignore this email.")}
      ${fallback(resetUrl)}
    </div>`;

  return {
    subject: `Reset your Blinkbox password`,
    html: layout({ preheader: `Password reset requested — link expires in 15 minutes.`, subject: `Reset your Blinkbox password`, body: bodyHtml }),
  };
}

export function buildPasswordChangedEmail({ name }) {
  const n = name.split(" ")[0];
  const appUrl = process.env.VITE_APP_URL || "https://blinkbox.net";
  const bodyHtml = `
    <div style="${P} 44px">
      ${label("Security")}
      ${heading(`Password changed, ${n}.`)}
      ${body("Your Blinkbox password was successfully updated. You can now sign in with your new password.")}
      ${btn(`${appUrl}/login`, "Sign in")}
      ${divider}
      ${note("Wasn't you? Reset your password immediately and reach out to us — your account may be compromised.")}
    </div>`;

  return {
    subject: `Your Blinkbox password was changed`,
    html: layout({ preheader: `Your Blinkbox password was successfully updated.`, subject: `Password changed`, body: bodyHtml }),
  };
}

export function buildLoginAlertEmail({ name, ip, userAgent, time }) {
  const n = name.split(" ")[0];
  const appUrl = process.env.VITE_APP_URL || "https://blinkbox.net";
  const ua = (userAgent || "Unknown").slice(0, 90);
  const bodyHtml = `
    <div style="${P} 44px">
      ${label("Security alert")}
      ${heading(`New sign-in, ${n}.`)}
      ${body("We detected a new sign-in to your Blinkbox account. Here are the details:")}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;border-top:1px solid ${BDR};border-collapse:collapse">
        ${row("Time", time)}
        ${row("IP address", ip || "Unknown")}
        ${row("Device", ua)}
      </table>
      ${btn(`${appUrl}/login`, "Secure my account")}
      ${divider}
      ${note("If this was you, no action needed. If you don't recognise this sign-in, reset your password immediately.")}
    </div>`;

  return {
    subject: `New sign-in to your Blinkbox account`,
    html: layout({ preheader: `New sign-in from ${ip || "an unknown location"} — review if this wasn't you.`, subject: `Sign-in alert`, body: bodyHtml }),
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
        <div style="${P} 44px">
          ${label("Password reset")}
          ${heading(`This account uses Google, ${firstName}.`)}
          ${body("You signed up with Google Sign-In so there's no password to reset. Sign in with Google instead.")}
          ${btn(resetUrl, "Sign in with Google")}
          ${divider}
          ${note("Didn't request this? You can safely ignore this email.")}
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
