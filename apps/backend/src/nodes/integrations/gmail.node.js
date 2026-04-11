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
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Gmail");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
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

// Build a RFC 2822 email, base64url-encoded
function buildRawEmail({ to, from, subject, body, html, replyTo, threadId, inReplyTo, references }) {
  const contentType = html ? "text/html" : "text/plain";
  const lines = [
    `From: ${from || "me"}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    references ? `References: ${references}` : null,
    `Subject: ${subject || ""}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${contentType}; charset=UTF-8`,
    "",
    body || "",
  ].filter((l) => l !== null);

  const raw = lines.join("\r\n");
  return Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function opSendEmail(config, token) {
  if (!config.to) throw new Error("Gmail sendEmail: 'to' is required.");
  const raw = buildRawEmail(config);
  const body = { raw };
  if (config.threadId) body.threadId = config.threadId;
  const response = await axios.post(`${BASE}/messages/send`, body, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { messageId: response.data.id, threadId: response.data.threadId, labelIds: response.data.labelIds };
}

async function opReadEmail(config, token) {
  if (!config.messageId) throw new Error("Gmail readEmail: 'messageId' is required.");
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
  if (!config.query) throw new Error("Gmail searchEmails: 'query' is required (e.g. 'from:user@example.com is:unread').");
  const response = await axios.get(`${BASE}/messages`, {
    headers: auth(token),
    params: { q: config.query, maxResults: Math.min(config.maxResults || 10, 100) },
    timeout: 15000,
  });
  const messages = response.data.messages || [];
  return { messages, total: response.data.resultSizeEstimate || messages.length };
}

async function opCreateDraft(config, token) {
  if (!config.to) throw new Error("Gmail createDraft: 'to' is required.");
  const raw = buildRawEmail(config);
  const response = await axios.post(`${BASE}/drafts`, { message: { raw } }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { draftId: response.data.id, messageId: response.data.message?.id };
}

async function opReplyToEmail(config, token) {
  if (!config.to) throw new Error("Gmail replyToEmail: 'to' is required.");
  if (!config.threadId) throw new Error("Gmail replyToEmail: 'threadId' is required.");
  const raw = buildRawEmail(config);
  const response = await axios.post(`${BASE}/messages/send`, { raw, threadId: config.threadId }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { messageId: response.data.id, threadId: response.data.threadId };
}

async function opMarkRead(config, token) {
  if (!config.messageId) throw new Error("Gmail markRead: 'messageId' is required.");
  await axios.post(`${BASE}/messages/${encodeURIComponent(config.messageId)}/modify`, {
    removeLabelIds: ["UNREAD"],
  }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { messageId: config.messageId, marked: "read" };
}

async function opDeleteEmail(config, token) {
  if (!config.messageId) throw new Error("Gmail deleteEmail: 'messageId' is required.");
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
