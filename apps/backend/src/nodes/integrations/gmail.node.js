/**
 * GMAIL NODE
 *
 * Operations:
 *   sendEmail    — Send an email (default)
 *   readEmail    — Get a single email by message ID
 *   searchEmails — Search emails (Gmail query syntax)
 *   createDraft  — Create a draft email
 *   replyToEmail — Reply to an existing thread
 *   markRead     — Mark message(s) as read
 *   deleteEmail  — Move to trash
 *
 * Auth: Google OAuth2 credential
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Gmail");
}

function handleError(err) {
  if (err.message.startsWith("Gmail")) throw err;
  const status = err.response?.status;
  if (status === 401 || status === 403) throw new Error("Gmail: Invalid or expired token. Re-connect your Google account.");
  if (status === 404) throw new Error("Gmail: Message not found.");
  if (status === 400) {
    const msg = err.response?.data?.error?.message || "Bad request";
    throw new Error(`Gmail: ${msg}`);
  }
  throw new Error(`Gmail failed: ${status || err.code} — ${err.message}`);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function toBase64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Build a RFC 2822 email, base64url-encoded.
// Supports file attachments via config.attachments: [{dataUrl, mimeType, name}]
function buildRawEmail({ to, from, subject, body, html, replyTo, inReplyTo, references, attachments }) {
  const boundary = `bb_boundary_${Date.now().toString(36)}`;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const bodyContentType = html ? "text/html" : "text/plain";

  const headers = [
    `From: ${from || "me"}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    references ? `References: ${references}` : null,
    `Subject: ${subject || ""}`,
    `MIME-Version: 1.0`,
    hasAttachments
      ? `Content-Type: multipart/mixed; boundary="${boundary}"`
      : `Content-Type: ${bodyContentType}; charset=UTF-8`,
    "",
  ].filter((l) => l !== null).join("\r\n");

  if (!hasAttachments) {
    return toBase64url(Buffer.from(headers + "\r\n" + (body || "")));
  }

  const bodyPart = [
    `--${boundary}`,
    `Content-Type: ${bodyContentType}; charset=UTF-8`,
    "",
    body || "",
  ].join("\r\n");

  const attachParts = attachments.map((a) => {
    const base64Data = a.dataUrl.includes(",") ? a.dataUrl.split(",")[1] : a.dataUrl;
    const filename = a.name || "attachment";
    return [
      `--${boundary}`,
      `Content-Type: ${a.mimeType || "application/octet-stream"}; name="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      base64Data,
    ].join("\r\n");
  });

  const raw = [headers, bodyPart, ...attachParts, `--${boundary}--`].join("\r\n");
  return toBase64url(Buffer.from(raw));
}

async function opSendEmail(config, token) {
  if (!config.to) return { success: false, error: "Gmail sendEmail: 'to' is required.", skipped: true };
  const raw = buildRawEmail(config);
  const body = { raw };
  if (config.threadId) body.threadId = config.threadId;
  const response = await axios.post(`${BASE}/messages/send`, body, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 30000,
  });
  return { messageId: response.data.id, threadId: response.data.threadId, labelIds: response.data.labelIds };
}

async function opReadEmail(config, token) {
  if (!config.messageId) return { success: false, error: "Gmail readEmail: 'messageId' is required.", skipped: true };
  const response = await axios.get(`${BASE}/messages/${encodeURIComponent(config.messageId)}`, {
    headers: auth(token),
    params: { format: "full" },
    timeout: 15000,
  });
  const msg = response.data;
  const headers = Object.fromEntries((msg.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
  const bodyData = msg.payload?.body?.data || msg.payload?.parts?.[0]?.body?.data || "";
  const bodyText = bodyData ? Buffer.from(bodyData, "base64").toString("utf-8") : "";
  return {
    messageId: msg.id,
    threadId: msg.threadId,
    from: headers["from"],
    to: headers["to"],
    subject: headers["subject"],
    date: headers["date"],
    body: bodyText,
    snippet: msg.snippet,
    labelIds: msg.labelIds,
  };
}

async function opSearchEmails(config, token) {
  if (!config.query) return { success: false, error: "Gmail searchEmails: 'query' is required (e.g. 'from:user@example.com is:unread').", skipped: true };
  const response = await axios.get(`${BASE}/messages`, {
    headers: auth(token),
    params: { q: config.query, maxResults: Math.min(config.maxResults || 10, 100) },
    timeout: 15000,
  });
  const messages = response.data.messages || [];
  return { messages, total: response.data.resultSizeEstimate || messages.length };
}

async function opCreateDraft(config, token) {
  if (!config.to) return { success: false, error: "Gmail createDraft: 'to' is required.", skipped: true };
  const raw = buildRawEmail(config);
  const response = await axios.post(`${BASE}/drafts`, { message: { raw } }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { draftId: response.data.id, messageId: response.data.message?.id };
}

async function opReplyToEmail(config, token) {
  if (!config.to) return { success: false, error: "Gmail replyToEmail: 'to' is required.", skipped: true };
  if (!config.threadId) return { success: false, error: "Gmail replyToEmail: 'threadId' is required.", skipped: true };
  const raw = buildRawEmail(config);
  const response = await axios.post(`${BASE}/messages/send`, { raw, threadId: config.threadId }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { messageId: response.data.id, threadId: response.data.threadId };
}

async function opMarkRead(config, token) {
  if (!config.messageId) return { success: false, error: "Gmail markRead: 'messageId' is required.", skipped: true };
  await axios.post(`${BASE}/messages/${encodeURIComponent(config.messageId)}/modify`, {
    removeLabelIds: ["UNREAD"],
  }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { messageId: config.messageId, marked: "read" };
}

async function opDeleteEmail(config, token) {
  if (!config.messageId) return { success: false, error: "Gmail deleteEmail: 'messageId' is required.", skipped: true };
  await axios.post(`${BASE}/messages/${encodeURIComponent(config.messageId)}/trash`, {}, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { messageId: config.messageId, trashed: true };
}

const OPERATIONS = {
  sendEmail: opSendEmail,
  readEmail: opReadEmail,
  searchEmails: opSearchEmails,
  createDraft: opCreateDraft,
  replyToEmail: opReplyToEmail,
  markRead: opMarkRead,
  deleteEmail: opDeleteEmail,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendEmail";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Gmail: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const token = await getToken(config.credentialId, context.workspaceId);
    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};
