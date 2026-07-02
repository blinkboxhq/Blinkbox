/**
 * Gmail — messages: send/reply/forward, read/search, read-state, star, archive,
 * trash/untrash. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth, buildRawEmail, modifyLabels } from "../GenericFunctions.js";

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

async function opDeleteEmail(config, token) {
  if (!config.messageId) return { success: false, error: "Gmail deleteEmail: 'messageId' is required.", skipped: true };
  await axios.post(`${BASE}/messages/${encodeURIComponent(config.messageId)}/trash`, {}, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { messageId: config.messageId, trashed: true };
}

async function opUntrashEmail(config, token) {
  if (!config.messageId) return { success: false, error: "Gmail untrashEmail: 'messageId' is required.", skipped: true };
  await axios.post(`${BASE}/messages/${encodeURIComponent(config.messageId)}/untrash`, {}, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { messageId: config.messageId, untrashed: true };
}

export const messageOperations = {
  sendEmail: opSendEmail,
  replyToEmail: opReplyToEmail,
  forwardEmail: opForwardEmail,
  readEmail: opReadEmail,
  searchEmails: opSearchEmails,
  markRead: opMarkRead,
  markUnread: opMarkUnread,
  starEmail: opStarEmail,
  unstarEmail: opUnstarEmail,
  archiveEmail: opArchiveEmail,
  deleteEmail: opDeleteEmail,
  untrashEmail: opUntrashEmail,
};
