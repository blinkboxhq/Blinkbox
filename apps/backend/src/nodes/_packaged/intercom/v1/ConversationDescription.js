/**
 * INTERCOM — Conversation & message resource. sendMessage / createConversation
 * / list / get / reply / close preserved verbatim from the monolith;
 * assignConversation, snoozeConversation, openConversation and searchConversations
 * added for parity. Handlers receive (config, { api }).
 */
import { perPage } from "../GenericFunctions.js";

async function opSendMessage(config, { api }) {
  if (!config.contactId) return { success: false, error: "Intercom sendMessage: contactId required.", skipped: true };
  if (!config.body) return { success: false, error: "Intercom sendMessage: body required.", skipped: true };
  if (!config.adminId) return { success: false, error: "Intercom sendMessage: adminId required to send messages.", skipped: true };
  const { data } = await api.post("/messages", {
    message_type: config.messageType || "inapp",
    subject: config.subject || "",
    body: config.body,
    template: "plain",
    from: { type: "admin", id: String(config.adminId) },
    to: { type: config.role === "lead" ? "lead" : "user", id: config.contactId },
  });
  return { success: true, id: data.id, type: data.type };
}

async function opCreateConversation(config, { api }) {
  if (!config.body) return { success: false, error: "Intercom createConversation: body required.", skipped: true };
  const toId = config.contactId || config.userId;
  if (!toId) return { success: false, error: "Intercom createConversation: contactId required.", skipped: true };
  if (!config.adminId) return { success: false, error: "Intercom createConversation: adminId required.", skipped: true };
  const { data } = await api.post("/messages", {
    message_type: config.messageType || "inapp",
    body: config.body,
    from: { type: "admin", id: String(config.adminId) },
    to: { type: "user", id: toId },
  });
  return { success: true, id: data.id, type: data.type };
}

async function opListConversations(config, { api }) {
  const { data } = await api.get("/conversations", { params: { per_page: perPage(config.limit) } });
  return { success: true, conversations: data.conversations ?? [], total: data.total_count };
}

async function opGetConversation(config, { api }) {
  if (!config.conversationId) return { success: false, error: "Intercom getConversation: conversationId required.", skipped: true };
  const { data } = await api.get(`/conversations/${config.conversationId}`);
  return { success: true, ...data };
}

async function opReplyConversation(config, { api }) {
  if (!config.conversationId) return { success: false, error: "Intercom replyConversation: conversationId required.", skipped: true };
  if (!config.body) return { success: false, error: "Intercom replyConversation: body required.", skipped: true };
  const replyBody = { message_type: "comment", body: config.body };
  if (config.adminId) {
    replyBody.type = "admin";
    replyBody.admin_id = String(config.adminId);
  } else if (config.contactId) {
    replyBody.type = "user";
    replyBody.intercom_user_id = config.contactId;
  } else {
    return { success: false, error: "Intercom replyConversation: adminId or contactId required to identify the replier.", skipped: true };
  }
  const { data } = await api.post(`/conversations/${config.conversationId}/reply`, replyBody);
  return { success: true, id: data.id, type: data.type };
}

async function opCloseConversation(config, { api }) {
  if (!config.conversationId) return { success: false, error: "Intercom closeConversation: conversationId required.", skipped: true };
  if (!config.adminId) return { success: false, error: "Intercom closeConversation: adminId required.", skipped: true };
  const { data } = await api.post(`/conversations/${config.conversationId}/parts`, {
    message_type: "close",
    type: "admin",
    admin_id: String(config.adminId),
  });
  return { success: true, id: data.id, state: "closed" };
}

async function opOpenConversation(config, { api }) {
  if (!config.conversationId) return { success: false, error: "Intercom openConversation: conversationId required.", skipped: true };
  if (!config.adminId) return { success: false, error: "Intercom openConversation: adminId required.", skipped: true };
  const { data } = await api.post(`/conversations/${config.conversationId}/parts`, {
    message_type: "open",
    type: "admin",
    admin_id: String(config.adminId),
  });
  return { success: true, id: data.id, state: "open" };
}

async function opAssignConversation(config, { api }) {
  if (!config.conversationId) return { success: false, error: "Intercom assignConversation: conversationId required.", skipped: true };
  if (!config.adminId) return { success: false, error: "Intercom assignConversation: adminId (assigner) required.", skipped: true };
  if (!config.assigneeId) return { success: false, error: "Intercom assignConversation: assigneeId (admin or team) required.", skipped: true };
  const { data } = await api.post(`/conversations/${config.conversationId}/parts`, {
    message_type: "assignment",
    type: "admin",
    admin_id: String(config.adminId),
    assignee_id: String(config.assigneeId),
  });
  return { success: true, id: data.id, assigneeId: config.assigneeId };
}

async function opSnoozeConversation(config, { api }) {
  if (!config.conversationId) return { success: false, error: "Intercom snoozeConversation: conversationId required.", skipped: true };
  if (!config.adminId) return { success: false, error: "Intercom snoozeConversation: adminId required.", skipped: true };
  if (!config.snoozedUntil) return { success: false, error: "Intercom snoozeConversation: snoozedUntil (unix timestamp) required.", skipped: true };
  const { data } = await api.post(`/conversations/${config.conversationId}/parts`, {
    message_type: "snoozed",
    type: "admin",
    admin_id: String(config.adminId),
    snoozed_until: Number(config.snoozedUntil),
  });
  return { success: true, id: data.id, state: "snoozed" };
}

async function opSearchConversations(config, { api }) {
  if (!config.field || config.value === undefined) {
    return { success: false, error: "Intercom searchConversations: 'field' and 'value' are required.", skipped: true };
  }
  const body = {
    query: { field: config.field, operator: config.operator || "=", value: config.value },
    pagination: { per_page: perPage(config.limit) },
  };
  const { data } = await api.post("/conversations/search", body);
  return { success: true, conversations: data.conversations ?? [], total: data.total_count };
}

export const conversationOperations = {
  sendMessage: opSendMessage,
  createConversation: opCreateConversation,
  listConversations: opListConversations,
  getConversation: opGetConversation,
  replyConversation: opReplyConversation,
  closeConversation: opCloseConversation,
  openConversation: opOpenConversation,
  assignConversation: opAssignConversation,
  snoozeConversation: opSnoozeConversation,
  searchConversations: opSearchConversations,
};
