/**
 * TEAMS — online-meeting & chat resource. createMeeting preserved verbatim
 * from the monolith; getMeeting, listChats, getChat, sendChatMessage and
 * listChatMessages added for parity. Handlers receive (config, client).
 */
import { buildAttendees, messageBody, num, mapMessage } from "../GenericFunctions.js";

async function opCreateMeeting(config, client) {
  const { subject, startDateTime, endDateTime, attendees } = config;
  if (!subject) return { success: false, error: "Teams createMeeting: 'subject' is required.", skipped: true };
  if (!startDateTime) return { success: false, error: "Teams createMeeting: 'startDateTime' is required.", skipped: true };
  if (!endDateTime) return { success: false, error: "Teams createMeeting: 'endDateTime' is required.", skipped: true };
  const body = { subject, startDateTime, endDateTime };
  if (attendees) body.participants = { attendees: buildAttendees(attendees) };
  const res = await client.post(`/me/onlineMeetings`, body);
  return {
    success: true,
    id: res.data.id,
    subject: res.data.subject,
    joinUrl: res.data.joinWebUrl,
    startDateTime: res.data.startDateTime,
    endDateTime: res.data.endDateTime,
  };
}

async function opGetMeeting(config, client) {
  const { meetingId } = config;
  if (!meetingId) return { success: false, error: "Teams getMeeting: 'meetingId' is required.", skipped: true };
  const res = await client.get(`/me/onlineMeetings/${client.enc(meetingId)}`);
  return {
    success: true,
    id: res.data.id,
    subject: res.data.subject,
    joinUrl: res.data.joinWebUrl,
    startDateTime: res.data.startDateTime,
    endDateTime: res.data.endDateTime,
  };
}

async function opListChats(config, client) {
  const top = num(config.limit, 20);
  const res = await client.get(`/me/chats?$top=${top}`);
  return {
    success: true,
    count: res.data.value.length,
    chats: res.data.value.map((c) => ({ id: c.id, topic: c.topic, chatType: c.chatType, webUrl: c.webUrl })),
  };
}

async function opGetChat(config, client) {
  const { chatId } = config;
  if (!chatId) return { success: false, error: "Teams getChat: 'chatId' is required.", skipped: true };
  const res = await client.get(`/chats/${client.enc(chatId)}`);
  return { success: true, id: res.data.id, topic: res.data.topic, chatType: res.data.chatType, webUrl: res.data.webUrl };
}

async function opSendChatMessage(config, client) {
  const { chatId, content } = config;
  if (!chatId) return { success: false, error: "Teams sendChatMessage: 'chatId' is required.", skipped: true };
  if (!content) return { success: false, error: "Teams sendChatMessage: 'content' is required.", skipped: true };
  const res = await client.post(`/chats/${client.enc(chatId)}/messages`, { body: messageBody(content, config.isHtml) });
  return { success: true, id: res.data.id, createdDateTime: res.data.createdDateTime };
}

async function opListChatMessages(config, client) {
  const { chatId } = config;
  if (!chatId) return { success: false, error: "Teams listChatMessages: 'chatId' is required.", skipped: true };
  const top = num(config.limit, 20);
  const res = await client.get(`/chats/${client.enc(chatId)}/messages?$top=${top}`);
  return { success: true, count: res.data.value.length, messages: res.data.value.map(mapMessage) };
}

export const meetingOperations = {
  createMeeting: opCreateMeeting,
  getMeeting: opGetMeeting,
  listChats: opListChats,
  getChat: opGetChat,
  sendChatMessage: opSendChatMessage,
  listChatMessages: opListChatMessages,
};
