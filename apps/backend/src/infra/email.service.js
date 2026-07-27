/**
 * Email transport and send helpers.
 *
 * Design lives in infra/email/theme.js, copy in infra/email/templates.js.
 * This file only decides how a message leaves the building — and it never
 * throws, because no email is worth failing a signup or a webhook over.
 */

import nodemailer from "nodemailer";
import { toText } from "./email/theme.js";
import * as T from "./email/templates.js";

// ─── Send ─────────────────────────────────────────────────────────────────────
// Primary: Resend REST API (fetch — no SMTP, no port issues)
// Fallback: nodemailer → Gmail SMTP
async function send({ to, subject, html, text }) {
  const fromName = process.env.EMAIL_FROM_NAME || "Blinkbox";
  const fromAddr = process.env.EMAIL_FROM_ADDR || process.env.ALERT_EMAIL_FROM;

  if (!fromAddr) {
    console.error("[Email] EMAIL_FROM_ADDR not set — cannot send email");
    return;
  }

  const from = `${fromName} <${fromAddr}>`;
  // Spam filters penalise HTML-only mail, and every template can produce a
  // readable plain-text twin from the markup it already built.
  const plain = text || (html ? toText(html) : undefined);

  // ── Resend REST API (preferred) ──────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html, text: plain }),
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
      await transporter.sendMail({ from, to, subject, html, text: plain });
      console.log(`[Email] Sent via Gmail SMTP to:${to} subject:"${subject}"`);
    } catch (err) {
      console.error("[Email] Gmail SMTP failed:", err.message);
    }
    return;
  }

  console.error("[Email] No transport configured (set RESEND_API_KEY or ALERT_EMAIL_FROM+ALERT_EMAIL_PASS)");
}

/**
 * Build → send, in one step. A user without an email address is skipped
 * silently: it happens on legacy records and is not an error worth logging
 * on every execution.
 */
async function deliver(user, built) {
  const to = typeof user === "string" ? user : user?.email;
  if (!to || !built) return;
  await send({ to, subject: built.subject, html: built.html });
}

export { send };

// ─── Onboarding & identity ───────────────────────────────────────────────────

export const sendRegistrationEmail = (user, verifyUrl) =>
  deliver(user, T.buildRegistrationEmail(user, verifyUrl));

export const sendVerificationEmail = (user, verifyUrl) =>
  deliver(user, T.buildVerificationEmail(user, verifyUrl));

export const sendWelcomeEmail = (user) => deliver(user, T.buildWelcomeEmail(user));

// ─── Security ────────────────────────────────────────────────────────────────

export const sendPasswordResetEmail = (user, resetUrl, opts = {}) =>
  deliver(
    user,
    opts.googleOnly ? T.buildGoogleOnlyResetEmail(user) : T.buildPasswordResetEmail(user, resetUrl),
  );

export const sendPasswordChangedEmail = (user) => deliver(user, T.buildPasswordChangedEmail(user));

export const sendLoginAlertEmail = (user, meta = {}) =>
  deliver(user, T.buildLoginAlertEmail(user, meta));

export const sendSecureAccountEmail = (user, meta = {}) =>
  deliver(user, T.buildSecureAccountEmail(user, meta));

export const sendSecurityCodeEmail = (user, code) =>
  deliver(user, T.buildSecurityCodeEmail(user, code));

// ─── Subscription lifecycle ──────────────────────────────────────────────────

export const sendProWelcomeEmail = (user, meta = {}) =>
  deliver(user, T.buildProWelcomeEmail(user, meta));

export const sendRenewalReminderEmail = (user, meta = {}) =>
  deliver(user, T.buildRenewalReminderEmail(user, meta));

export const sendInvoiceEmail = (user, meta = {}) => deliver(user, T.buildInvoiceEmail(user, meta));

export const sendPaymentFailedEmail = (user, meta = {}) =>
  deliver(user, T.buildPaymentFailedEmail(user, meta));

export const sendProEndingSoonEmail = (user, periodEnd) =>
  deliver(user, T.buildProEndingSoonEmail(user, periodEnd));

export const sendProEndedEmail = (user, meta = {}) => deliver(user, T.buildProEndedEmail(user, meta));

// ─── Credits ─────────────────────────────────────────────────────────────────

export const sendTopUpReceiptEmail = (user, meta = {}) =>
  deliver(user, T.buildTopUpReceiptEmail(user, meta));

export const sendAutoTopUpEmail = (user, meta = {}) =>
  deliver(user, T.buildAutoTopUpEmail(user, meta));

export const sendLowBalanceEmail = (user, meta = {}) =>
  deliver(user, T.buildLowBalanceEmail(user, meta));

export const sendAutoRechargeDisabledEmail = (user, meta = {}) =>
  deliver(user, T.buildAutoRechargeDisabledEmail(user, meta));

// ─── Digest & announcements ──────────────────────────────────────────────────

export const sendWeeklyDigestEmail = (user, meta = {}) =>
  deliver(user, T.buildWeeklyDigestEmail(user, meta));

export const sendPlanUpdateEmail = (user, meta = {}) =>
  deliver(user, T.buildPlanUpdateEmail(user, meta));

// Builders stay reachable for previews and tests.
export * from "./email/templates.js";
