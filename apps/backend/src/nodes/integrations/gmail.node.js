/**
 * GMAIL NODE
 *
 * Operations:
 *   sendEmail    — Send an email (default)
 *   readEmail    — Get a single email's headers by message ID (metadata only — no body)
 *   listRecent   — List recent message headers (metadata scope: no Gmail q-search)
 *   createDraft  — Create a draft email
 *   replyToEmail — Reply to an existing thread
 *
 * Scope: gmail.send + gmail.metadata (non-restricted). No body, no q-search,
 * no mark-read / trash — those require restricted gmail.readonly / gmail.modify.
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
  const apiMsg = err.response?.data?.error?.message || err.message;
  if (status === 401 || status === 403) throw new Error(`Gmail: Auth failed (${status}) — ${apiMsg}. Re-connect your Google account.`);
  if (status === 404) throw new Error(`Gmail: Message or resource not found — ${apiMsg}`);
  if (status === 400) throw new Error(`Gmail: Bad request — ${apiMsg}`);
  if (status === 429) throw new Error("Gmail: Rate limit exceeded. Slow down requests or enable exponential backoff.");
  if (status === 422) throw new Error(`Gmail: Unprocessable request — ${apiMsg}`);
  if (status >= 500) throw new Error(`Gmail: Google server error (${status}) — ${apiMsg}. Retry later.`);
  throw new Error(`Gmail: ${status || err.code || "Error"} — ${apiMsg}`);
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
    params: { format: "metadata", metadataHeaders: ["From", "To", "Subject", "Date"] },
    timeout: 15000,
  });
  const msg = response.data;
  const headers = Object.fromEntries((msg.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
  return {
    messageId: msg.id,
    threadId: msg.threadId,
    from: headers["from"],
    to: headers["to"],
    subject: headers["subject"],
    date: headers["date"],
    snippet: msg.snippet,
    labelIds: msg.labelIds,
  };
}

async function opListRecent(config, token) {
  const response = await axios.get(`${BASE}/messages`, {
    headers: auth(token),
    params: { maxResults: Math.min(config.maxResults || 10, 100) },
    timeout: 15000,
  });
  const ids = response.data.messages || [];
  const messages = [];
  for (const { id } of ids) {
    const r = await axios.get(`${BASE}/messages/${encodeURIComponent(id)}`, {
      headers: auth(token),
      params: { format: "metadata", metadataHeaders: ["From", "Subject", "Date"] },
      timeout: 15000,
    });
    const h = Object.fromEntries((r.data.payload?.headers || []).map((x) => [x.name.toLowerCase(), x.value]));
    messages.push({ messageId: r.data.id, threadId: r.data.threadId, from: h["from"], subject: h["subject"], date: h["date"], snippet: r.data.snippet, labelIds: r.data.labelIds });
  }
  return { messages, total: messages.length };
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

const OPERATIONS = {
  sendEmail: opSendEmail,
  readEmail: opReadEmail,
  listRecent: opListRecent,
  createDraft: opCreateDraft,
  replyToEmail: opReplyToEmail,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendEmail";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Gmail: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    try {
      const token = await getToken(config.credentialId, context.workspaceId);
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};
