/**
 * TEAMS — channel message resource. sendMessage / sendCard / replyMessage
 * preserved verbatim from the monolith; listMessages, getMessage, listReplies,
 * updateMessage, deleteMessage and softDeleteMessage added for parity.
 * Handlers receive (config, client).
 */
import { messageBody, mapMessage, num } from "../GenericFunctions.js";

async function opSendMessage(config, client) {
  const { teamId, channelId, content } = config;
  if (!teamId) return { success: false, error: "Teams sendMessage: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams sendMessage: 'channelId' is required.", skipped: true };
  if (!content) return { success: false, error: "Teams sendMessage: 'content' is required.", skipped: true };
  const res = await client.post(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages`,
    { body: messageBody(content, config.isHtml) },
  );
  return { success: true, id: res.data.id, createdDateTime: res.data.createdDateTime, webUrl: res.data.webUrl };
}

async function opSendCard(config, client) {
  const { teamId, channelId, card } = config;
  if (!teamId) return { success: false, error: "Teams sendCard: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams sendCard: 'channelId' is required.", skipped: true };
  if (!card) return { success: false, error: "Teams sendCard: 'card' (Adaptive Card JSON) is required.", skipped: true };
  let parsedCard;
  try {
    parsedCard = typeof card === "string" ? JSON.parse(card) : card;
  } catch {
    return { success: false, error: "Teams sendCard: 'card' is not valid JSON.", skipped: true };
  }
  const res = await client.post(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages`,
    {
      body: { contentType: "html", content: "<attachment id=\"1\"></attachment>" },
      attachments: [
        { id: "1", contentType: "application/vnd.microsoft.card.adaptive", content: JSON.stringify(parsedCard) },
      ],
    },
  );
  return { success: true, id: res.data.id, createdDateTime: res.data.createdDateTime, webUrl: res.data.webUrl };
}

async function opReplyMessage(config, client) {
  const { teamId, channelId, messageId, content } = config;
  if (!teamId) return { success: false, error: "Teams replyMessage: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams replyMessage: 'channelId' is required.", skipped: true };
  if (!messageId) return { success: false, error: "Teams replyMessage: 'messageId' is required.", skipped: true };
  if (!content) return { success: false, error: "Teams replyMessage: 'content' is required.", skipped: true };
  const res = await client.post(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages/${client.enc(messageId)}/replies`,
    { body: messageBody(content, config.isHtml) },
  );
  return { success: true, id: res.data.id, createdDateTime: res.data.createdDateTime };
}

async function opListMessages(config, client) {
  const { teamId, channelId } = config;
  if (!teamId) return { success: false, error: "Teams listMessages: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams listMessages: 'channelId' is required.", skipped: true };
  const top = num(config.limit, 20);
  const res = await client.get(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages?$top=${top}`,
  );
  return { success: true, count: res.data.value.length, messages: res.data.value.map(mapMessage) };
}

async function opGetMessage(config, client) {
  const { teamId, channelId, messageId } = config;
  if (!teamId) return { success: false, error: "Teams getMessage: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams getMessage: 'channelId' is required.", skipped: true };
  if (!messageId) return { success: false, error: "Teams getMessage: 'messageId' is required.", skipped: true };
  const res = await client.get(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages/${client.enc(messageId)}`,
  );
  return { success: true, ...mapMessage(res.data) };
}

async function opListReplies(config, client) {
  const { teamId, channelId, messageId } = config;
  if (!teamId) return { success: false, error: "Teams listReplies: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams listReplies: 'channelId' is required.", skipped: true };
  if (!messageId) return { success: false, error: "Teams listReplies: 'messageId' is required.", skipped: true };
  const res = await client.get(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages/${client.enc(messageId)}/replies`,
  );
  return { success: true, count: res.data.value.length, replies: res.data.value.map(mapMessage) };
}

async function opUpdateMessage(config, client) {
  const { teamId, channelId, messageId, content } = config;
  if (!teamId) return { success: false, error: "Teams updateMessage: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams updateMessage: 'channelId' is required.", skipped: true };
  if (!messageId) return { success: false, error: "Teams updateMessage: 'messageId' is required.", skipped: true };
  if (!content) return { success: false, error: "Teams updateMessage: 'content' is required.", skipped: true };
  await client.patch(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages/${client.enc(messageId)}`,
    { body: messageBody(content, config.isHtml) },
  );
  return { success: true, id: messageId, updated: true };
}

async function opDeleteMessage(config, client) {
  const { teamId, channelId, messageId } = config;
  if (!teamId) return { success: false, error: "Teams deleteMessage: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams deleteMessage: 'channelId' is required.", skipped: true };
  if (!messageId) return { success: false, error: "Teams deleteMessage: 'messageId' is required.", skipped: true };
  await client.post(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages/${client.enc(messageId)}/softDelete`,
    {},
  );
  return { success: true, id: messageId, deleted: true };
}

async function opUndoDeleteMessage(config, client) {
  const { teamId, channelId, messageId } = config;
  if (!teamId) return { success: false, error: "Teams undoDeleteMessage: 'teamId' is required.", skipped: true };
  if (!channelId) return { success: false, error: "Teams undoDeleteMessage: 'channelId' is required.", skipped: true };
  if (!messageId) return { success: false, error: "Teams undoDeleteMessage: 'messageId' is required.", skipped: true };
  await client.post(
    `/teams/${client.enc(teamId)}/channels/${client.enc(channelId)}/messages/${client.enc(messageId)}/undoSoftDelete`,
    {},
  );
  return { success: true, id: messageId, restored: true };
}

export const messageOperations = {
  sendMessage: opSendMessage,
  sendCard: opSendCard,
  replyMessage: opReplyMessage,
  listMessages: opListMessages,
  getMessage: opGetMessage,
  listReplies: opListReplies,
  updateMessage: opUpdateMessage,
  deleteMessage: opDeleteMessage,
  undoDeleteMessage: opUndoDeleteMessage,
};
