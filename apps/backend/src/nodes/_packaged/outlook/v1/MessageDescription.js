/**
 * OUTLOOK — Message resource. send / reply / forward / get / list / move /
 * flag / delete / markRead / getAttachments. The original monolith's six
 * message ops (sendEmail, replyEmail, getEmail, listEmails, moveEmail,
 * flagEmail) are preserved verbatim in behaviour; the rest are parity
 * additions. Handlers receive (config, client).
 */
import { buildRecipients, messageBody, mapMessage, num } from "../GenericFunctions.js";

async function opSendEmail(config, client) {
  const { to, cc, bcc, subject, body, isHtml } = config;
  if (!to) return { success: false, error: "Outlook sendEmail: 'to' is required.", skipped: true };
  if (!subject) return { success: false, error: "Outlook sendEmail: 'subject' is required.", skipped: true };

  const message = {
    subject,
    body: messageBody(body, isHtml),
    toRecipients: buildRecipients(to),
  };
  if (cc) message.ccRecipients = buildRecipients(cc);
  if (bcc) message.bccRecipients = buildRecipients(bcc);

  await client.post(`/me/sendMail`, { message, saveToSentItems: config.saveToSentItems !== false });
  return { success: true, operation: "sendEmail", to, subject };
}

async function opReplyEmail(config, client) {
  const { messageId, to, body, isHtml } = config;
  if (!messageId) return { success: false, error: "Outlook replyEmail: 'messageId' is required.", skipped: true };
  if (!to) return { success: false, error: "Outlook replyEmail: 'to' is required.", skipped: true };

  await client.post(`/me/messages/${client.enc(messageId)}/reply`, {
    message: { toRecipients: buildRecipients(to), body: messageBody(body, isHtml) },
  });
  return { success: true, operation: "replyEmail", messageId };
}

async function opReplyAll(config, client) {
  const { messageId, comment } = config;
  if (!messageId) return { success: false, error: "Outlook replyAll: 'messageId' is required.", skipped: true };
  await client.post(`/me/messages/${client.enc(messageId)}/replyAll`, { comment: comment || "" });
  return { success: true, operation: "replyAll", messageId };
}

async function opForwardEmail(config, client) {
  const { messageId, to, comment } = config;
  if (!messageId) return { success: false, error: "Outlook forwardEmail: 'messageId' is required.", skipped: true };
  if (!to) return { success: false, error: "Outlook forwardEmail: 'to' is required.", skipped: true };
  await client.post(`/me/messages/${client.enc(messageId)}/forward`, {
    toRecipients: buildRecipients(to),
    comment: comment || "",
  });
  return { success: true, operation: "forwardEmail", messageId, to };
}

async function opGetEmail(config, client) {
  const { messageId } = config;
  if (!messageId) return { success: false, error: "Outlook getEmail: 'messageId' is required.", skipped: true };

  const res = await client.get(`/me/messages/${client.enc(messageId)}`);
  const m = res.data;
  return {
    success: true,
    id: m.id,
    subject: m.subject,
    from: m.from?.emailAddress?.address,
    receivedDateTime: m.receivedDateTime,
    bodyPreview: m.bodyPreview,
    isRead: m.isRead,
    body: m.body?.content,
  };
}

async function opListEmails(config, client) {
  const limit = num(config.limit, 20);
  const filter = config.filter || "";
  const folder = config.folderId || config.folder;
  const params = { $top: limit, $orderby: "receivedDateTime desc" };
  if (filter) params.$filter = filter;
  if (config.search) params.$search = `"${config.search}"`;

  const path = folder
    ? `/me/mailFolders/${client.enc(folder)}/messages`
    : `/me/messages`;
  const res = await client.get(path, params);
  return {
    success: true,
    count: res.data.value.length,
    messages: res.data.value.map(mapMessage),
  };
}

async function opMoveEmail(config, client) {
  const { messageId, destinationId } = config;
  if (!messageId) return { success: false, error: "Outlook moveEmail: 'messageId' is required.", skipped: true };
  if (!destinationId) return { success: false, error: "Outlook moveEmail: 'destinationId' (folder ID or well-known name) is required.", skipped: true };

  const res = await client.post(`/me/messages/${client.enc(messageId)}/move`, { destinationId });
  return { success: true, id: res.data.id, subject: res.data.subject };
}

async function opFlagEmail(config, client) {
  const { messageId } = config;
  if (!messageId) return { success: false, error: "Outlook flagEmail: 'messageId' is required.", skipped: true };
  const flagged = config.flagged !== false;
  const res = await client.patch(`/me/messages/${client.enc(messageId)}`, {
    flag: { flagStatus: flagged ? "flagged" : "notFlagged" },
  });
  return { success: true, id: res.data.id, flagStatus: res.data.flag?.flagStatus };
}

async function opMarkRead(config, client) {
  const { messageId } = config;
  if (!messageId) return { success: false, error: "Outlook markRead: 'messageId' is required.", skipped: true };
  const isRead = config.isRead !== false;
  const res = await client.patch(`/me/messages/${client.enc(messageId)}`, { isRead });
  return { success: true, id: res.data.id, isRead: res.data.isRead };
}

async function opDeleteEmail(config, client) {
  const { messageId } = config;
  if (!messageId) return { success: false, error: "Outlook deleteEmail: 'messageId' is required.", skipped: true };
  await client.del(`/me/messages/${client.enc(messageId)}`);
  return { success: true, deleted: true, messageId };
}

async function opGetMessageAttachments(config, client) {
  const { messageId } = config;
  if (!messageId) return { success: false, error: "Outlook getMessageAttachments: 'messageId' is required.", skipped: true };
  const res = await client.get(`/me/messages/${client.enc(messageId)}/attachments`);
  return {
    success: true,
    messageId,
    count: res.data.value.length,
    attachments: res.data.value.map((a) => ({
      id: a.id,
      name: a.name,
      contentType: a.contentType,
      size: a.size,
      isInline: a.isInline,
      contentBytes: a.contentBytes,
    })),
  };
}

export const messageOperations = {
  sendEmail: opSendEmail,
  replyEmail: opReplyEmail,
  replyAll: opReplyAll,
  forwardEmail: opForwardEmail,
  getEmail: opGetEmail,
  listEmails: opListEmails,
  moveEmail: opMoveEmail,
  flagEmail: opFlagEmail,
  markRead: opMarkRead,
  deleteEmail: opDeleteEmail,
  getMessageAttachments: opGetMessageAttachments,
};
