/**
 * NOTIFICATION HUB NODE
 * Fan-out notifications across ALL channels simultaneously.
 * Channels: Slack, Telegram, Discord, Email (Resend/SendGrid), SMS (Twilio)
 * Features: concurrent delivery, fallback channels, Redis dedup, priority levels.
 *
 * Config:
 *   message             — notification body
 *   subject             — subject line (email channels)
 *   priority            — "critical" | "normal" | "low"
 *   channels            — array of channel config objects
 *   fallbackChannels    — fired only if ALL primary channels fail
 *   dedupeWindowSeconds — skip if identical message sent within N seconds (0 = no dedup)
 *   dedupeKey           — custom dedup key (default: hash of message+channels)
 */

import axios from "axios";
import crypto from "crypto";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";
import { redis } from "../infra/redis.client.js";
import { assertSafeUrlResolved } from "../utils/ssrf.js";

function hashDedup(message, channels) {
  return crypto.createHash("md5").update(`${message}:${JSON.stringify(channels)}`).digest("hex");
}

async function getToken(credentialId, workspaceId, label) {
  if (!credentialId) return { success: false, error: `${label}: credentialId is required — configure this field.`, skipped: true };
  const cred = await resolveCredential(credentialId, workspaceId, label);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

async function sendSlack(ch, message, workspaceId) {
  const token = await getToken(ch.credentialId, workspaceId, "Slack");
  const channel = ch.channel || "#general";
  await axios.post(
    "https://slack.com/api/chat.postMessage",
    { channel, text: message },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 120000 },
  );
  return { type: "slack", channel, success: true };
}

async function sendTelegram(ch, message, workspaceId) {
  const token = await getToken(ch.credentialId, workspaceId, "Telegram");
  const chatId = ch.chatId;
  if (!chatId) return { success: false, error: "Telegram: chatId is required — configure this field.", skipped: true };
  await axios.post(
    `https://api.telegram.org/bot${token}/sendMessage`,
    { chat_id: chatId, text: message, parse_mode: "Markdown" },
    { timeout: 120000 },
  );
  return { type: "telegram", chatId, success: true };
}

async function sendDiscord(ch, message) {
  const webhookUrl = ch.webhookUrl;
  if (!webhookUrl) return { success: false, error: "Discord: webhookUrl is required.", skipped: true };
  await assertSafeUrlResolved(webhookUrl);
  await axios.post(webhookUrl, { content: message }, { timeout: 120000 });
  return { type: "discord", success: true };
}

async function sendEmail(ch, message, subject, workspaceId) {
  const to = ch.to;
  if (!to) return { success: false, error: "Email: 'to' is required.", skipped: true };

  if (ch.type === "sendgrid") {
    const token = await getToken(ch.credentialId, workspaceId, "SendGrid");
    await axios.post(
      "https://api.sendgrid.com/v3/mail/send",
      { personalizations: [{ to: [{ email: to }] }], from: { email: ch.from || "noreply@blinkbox.app" }, subject: subject || message.slice(0, 60), content: [{ type: "text/plain", value: message }] },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 120000 },
    );
  } else {
    // Resend (default email provider)
    const token = await getToken(ch.credentialId, workspaceId, "Resend");
    await axios.post(
      "https://api.resend.com/emails",
      { from: ch.from || "noreply@blinkbox.app", to: [to], subject: subject || message.slice(0, 60), text: message },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 120000 },
    );
  }
  return { type: ch.type || "email", to, success: true };
}

async function sendSms(ch, message, workspaceId) {
  const token = await getToken(ch.credentialId, workspaceId, "Twilio");
  const to = ch.to;
  const from = ch.phoneFrom;
  if (!to || !from) return { success: false, error: "SMS: 'to' and 'phoneFrom' are required.", skipped: true };

  const [accountSid, authToken] = token.split(":");
  if (!accountSid || !authToken) throw new Error("SMS: credential must be 'accountSid:authToken'");

  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    new URLSearchParams({ To: to, From: from, Body: message }).toString(),
    { auth: { username: accountSid, password: authToken }, headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 120000 },
  );
  return { type: "sms", to, success: true };
}

async function fireChannel(ch, message, subject, workspaceId) {
  switch (ch.type) {
    case "slack": return sendSlack(ch, message, workspaceId);
    case "telegram": return sendTelegram(ch, message, workspaceId);
    case "discord": return sendDiscord(ch, message);
    case "email":
    case "resend":
    case "sendgrid": return sendEmail(ch, message, subject, workspaceId);
    case "sms": return sendSms(ch, message, workspaceId);
    default: throw new Error(`Notification Hub: unknown channel type "${ch.type}"`);
  }
}

async function fireAll(channels, message, subject, workspaceId) {
  const settled = await Promise.allSettled(
    channels.map((ch) => fireChannel(ch, message, subject, workspaceId)),
  );
  return settled.map((r, i) => ({
    ...(r.status === "fulfilled" ? r.value : { type: channels[i].type, success: false }),
    error: r.status === "rejected" ? r.reason?.message : null,
    success: r.status === "fulfilled",
  }));
}

export default {
  async run(config, input, context = {}) {
    const {
      priority = "normal",
      dedupeWindowSeconds = 0,
    } = config;

    const message = config.message ?? input?.message ?? (typeof input === "string" ? input : "");
    if (!message) return { success: false, error: "Notification Hub: 'message' is required — configure this field.", skipped: true };

    const subject = config.subject ?? input?.subject ?? "";
    const channels = (config.channels || []).filter((ch) => ch.enabled !== false && ch.type);
    const fallbackChannels = (config.fallbackChannels || []).filter((ch) => ch.enabled !== false && ch.type);
    const workspaceId = context.workspaceId;

    if (channels.length === 0) return { success: false, error: "Notification Hub: at least one channel is required — configure this field.", skipped: true };

    // Deduplication
    if (parseInt(dedupeWindowSeconds) > 0) {
      const dedupeKey = config.dedupeKey
        ? `bb:notif:dedup:${workspaceId}:${config.dedupeKey}`
        : `bb:notif:dedup:${workspaceId}:${hashDedup(message, channels)}`;
      const set = await redis.set(dedupeKey, "1", "EX", parseInt(dedupeWindowSeconds), "NX");
      if (!set) return { sent: 0, failed: 0, total: 0, results: [], deduped: true, fallbackUsed: false, message, priority };
    }

    const results = await fireAll(channels, message, subject, workspaceId);
    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    let fallbackUsed = false;
    let fallbackResults = [];

    if (sent === 0 && fallbackChannels.length > 0) {
      fallbackResults = await fireAll(fallbackChannels, message, subject, workspaceId);
      fallbackUsed = true;
    }

    const allResults = [...results, ...fallbackResults];
    const totalSent = allResults.filter((r) => r.success).length;

    return {
      sent: totalSent,
      failed: allResults.filter((r) => !r.success).length,
      total: channels.length + (fallbackUsed ? fallbackChannels.length : 0),
      results: allResults,
      fallbackUsed,
      deduped: false,
      message,
      priority,
    };
  },
};
