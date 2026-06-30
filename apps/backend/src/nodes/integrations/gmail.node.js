/**
 * GMAIL NODE
 *
 * Operations: send/reply/forward, read/search, drafts (create/list/send/delete),
 *   read-state (markRead/markUnread), star/unstar, archive, trash/untrash/delete,
 *   labels (add/remove/list/create/delete), threads (get/list), getProfile.
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

async function opForwardEmail(config, token) {
  if (!config.messageId) return { success: false, error: "Gmail forwardEmail: 'messageId' is required.", skipped: true };
  if (!config.to) return { success: false, error: "Gmail forwardEmail: 'to' (recipient) is required.", skipped: true };
  const orig = await axios.get(`${BASE}/messages/${encodeURIComponent(config.messageId)}`, {
    headers: auth(token),
    params: { format: "full" },
    timeout: 15000,
  });
  const msg = orig.data;
  const oh = Object.fromEntries((msg.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
  const origData = msg.payload?.body?.data || msg.payload?.parts?.[0]?.body?.data || "";
  const origBody = origData ? Buffer.from(origData, "base64").toString("utf-8") : msg.snippet || "";
  const fwdBody =
    (config.body ? `${config.body}\r\n\r\n` : "") +
    `---------- Forwarded message ----------\r\n` +
    `From: ${oh["from"] || ""}\r\nDate: ${oh["date"] || ""}\r\nSubject: ${oh["subject"] || ""}\r\nTo: ${oh["to"] || ""}\r\n\r\n` +
    origBody;
  const raw = buildRawEmail({ ...config, subject: config.subject || `Fwd: ${oh["subject"] || ""}`, body: fwdBody });
  const response = await axios.post(`${BASE}/messages/send`, { raw }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 30000,
  });
  return { messageId: response.data.id, threadId: response.data.threadId, forwardedFrom: config.messageId };
}

async function modifyLabels(config, token, add, remove) {
  if (!config.messageId) return { success: false, error: "Gmail: 'messageId' is required.", skipped: true };
  const response = await axios.post(`${BASE}/messages/${encodeURIComponent(config.messageId)}/modify`, {
    addLabelIds: add,
    removeLabelIds: remove,
  }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { messageId: config.messageId, labelIds: response.data.labelIds };
}

async function opMarkUnread(config, token) {
  return modifyLabels(config, token, ["UNREAD"], []);
}

async function opStarEmail(config, token) {
  return modifyLabels(config, token, ["STARRED"], []);
}

async function opUnstarEmail(config, token) {
  return modifyLabels(config, token, [], ["STARRED"]);
}

async function opArchiveEmail(config, token) {
  return modifyLabels(config, token, [], ["INBOX"]);
}

async function opUntrashEmail(config, token) {
  if (!config.messageId) return { success: false, error: "Gmail untrashEmail: 'messageId' is required.", skipped: true };
  await axios.post(`${BASE}/messages/${encodeURIComponent(config.messageId)}/untrash`, {}, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { messageId: config.messageId, untrashed: true };
}

async function opAddLabel(config, token) {
  if (!config.labelId) return { success: false, error: "Gmail addLabel: 'labelId' is required.", skipped: true };
  return modifyLabels(config, token, [config.labelId], []);
}

async function opRemoveLabel(config, token) {
  if (!config.labelId) return { success: false, error: "Gmail removeLabel: 'labelId' is required.", skipped: true };
  return modifyLabels(config, token, [], [config.labelId]);
}

async function opListLabels(config, token) {
  const response = await axios.get(`${BASE}/labels`, { headers: auth(token), timeout: 10000 });
  return { labels: response.data.labels || [] };
}

async function opCreateLabel(config, token) {
  if (!config.labelName) return { success: false, error: "Gmail createLabel: 'labelName' is required.", skipped: true };
  const response = await axios.post(`${BASE}/labels`, {
    name: config.labelName,
    labelListVisibility: config.labelListVisibility || "labelShow",
    messageListVisibility: config.messageListVisibility || "show",
  }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { labelId: response.data.id, name: response.data.name };
}

async function opDeleteLabel(config, token) {
  if (!config.labelId) return { success: false, error: "Gmail deleteLabel: 'labelId' is required.", skipped: true };
  await axios.delete(`${BASE}/labels/${encodeURIComponent(config.labelId)}`, { headers: auth(token), timeout: 10000 });
  return { labelId: config.labelId, deleted: true };
}

async function opGetThread(config, token) {
  if (!config.threadId) return { success: false, error: "Gmail getThread: 'threadId' is required.", skipped: true };
  const response = await axios.get(`${BASE}/threads/${encodeURIComponent(config.threadId)}`, {
    headers: auth(token),
    params: { format: config.format || "metadata" },
    timeout: 15000,
  });
  return { threadId: response.data.id, messages: response.data.messages || [], historyId: response.data.historyId };
}

async function opListThreads(config, token) {
  const response = await axios.get(`${BASE}/threads`, {
    headers: auth(token),
    params: { q: config.query || undefined, maxResults: Math.min(config.maxResults || 10, 100) },
    timeout: 15000,
  });
  return { threads: response.data.threads || [], total: response.data.resultSizeEstimate || 0 };
}

async function opListDrafts(config, token) {
  const response = await axios.get(`${BASE}/drafts`, {
    headers: auth(token),
    params: { maxResults: Math.min(config.maxResults || 10, 100) },
    timeout: 15000,
  });
  return { drafts: response.data.drafts || [], total: response.data.resultSizeEstimate || 0 };
}

async function opSendDraft(config, token) {
  if (!config.draftId) return { success: false, error: "Gmail sendDraft: 'draftId' is required.", skipped: true };
  const response = await axios.post(`${BASE}/drafts/send`, { id: config.draftId }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 30000,
  });
  return { messageId: response.data.id, threadId: response.data.threadId, sentFromDraft: config.draftId };
}

async function opDeleteDraft(config, token) {
  if (!config.draftId) return { success: false, error: "Gmail deleteDraft: 'draftId' is required.", skipped: true };
  await axios.delete(`${BASE}/drafts/${encodeURIComponent(config.draftId)}`, { headers: auth(token), timeout: 10000 });
  return { draftId: config.draftId, deleted: true };
}

async function opGetProfile(config, token) {
  const response = await axios.get(`${BASE}/profile`, { headers: auth(token), timeout: 10000 });
  return {
    emailAddress: response.data.emailAddress,
    messagesTotal: response.data.messagesTotal,
    threadsTotal: response.data.threadsTotal,
    historyId: response.data.historyId,
  };
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
  replyToEmail: opReplyToEmail,
  forwardEmail: opForwardEmail,
  readEmail: opReadEmail,
  searchEmails: opSearchEmails,
  createDraft: opCreateDraft,
  listDrafts: opListDrafts,
  sendDraft: opSendDraft,
  deleteDraft: opDeleteDraft,
  markRead: opMarkRead,
  markUnread: opMarkUnread,
  starEmail: opStarEmail,
  unstarEmail: opUnstarEmail,
  archiveEmail: opArchiveEmail,
  deleteEmail: opDeleteEmail,
  untrashEmail: opUntrashEmail,
  addLabel: opAddLabel,
  removeLabel: opRemoveLabel,
  listLabels: opListLabels,
  createLabel: opCreateLabel,
  deleteLabel: opDeleteLabel,
  getThread: opGetThread,
  listThreads: opListThreads,
  getProfile: opGetProfile,
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
