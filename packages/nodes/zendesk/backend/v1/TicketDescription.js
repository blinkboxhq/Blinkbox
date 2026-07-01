/**
 * Zendesk — Tickets.
 */
import { skip, need, lim, enc, csv, num, parseJson } from "../GenericFunctions.js";

async function opListTickets(config, { api }) {
  const { data } = await api.get(`/tickets.json`, {
    params: { per_page: lim(config.limit), sort_by: config.sortBy || "created_at", sort_order: config.sortOrder || "desc" },
  });
  return { success: true, tickets: data.tickets || [], count: data.count, next_page: data.next_page };
}
async function opGetTicket(config, { api }) {
  const g = need(config, "ticketId", "getTicket"); if (g) return g;
  const { data } = await api.get(`/tickets/${enc(config.ticketId)}.json`);
  return data.ticket;
}
function buildTicket(config, op) {
  const t = {};
  if (config.subject) t.subject = config.subject;
  const body = config.description || config.body;
  if (body) t.comment = { body, public: config.public !== false };
  if (config.priority) t.priority = config.priority;
  if (config.type) t.type = config.type;
  if (config.status) t.status = config.status;
  if (config.assigneeId) t.assignee_id = num(config.assigneeId);
  if (config.groupId) t.group_id = num(config.groupId);
  if (config.requesterEmail) t.requester = { email: config.requesterEmail, name: config.requesterName || config.requesterEmail };
  if (config.tags) t.tags = csv(config.tags);
  const custom = parseJson(config.customFields, op, "customFields");
  if (custom) t.custom_fields = custom;
  return t;
}
async function opCreateTicket(config, { api }) {
  const s = need(config, "subject", "createTicket"); if (s) return s;
  if (!config.description && !config.body) return skip("createTicket", "'description' (ticket body) is required.");
  const { data } = await api.post(`/tickets.json`, { ticket: buildTicket(config, "createTicket") });
  return data.ticket;
}
async function opUpdateTicket(config, { api }) {
  const g = need(config, "ticketId", "updateTicket"); if (g) return g;
  const update = buildTicket(config, "updateTicket");
  if (config.comment) update.comment = { body: config.comment, public: config.public !== false };
  if (!Object.keys(update).length) return skip("updateTicket", "provide at least one field to update.");
  const { data } = await api.put(`/tickets/${enc(config.ticketId)}.json`, { ticket: update });
  return data.ticket;
}
async function opDeleteTicket(config, { api }) {
  const g = need(config, "ticketId", "deleteTicket"); if (g) return g;
  await api.delete(`/tickets/${enc(config.ticketId)}.json`);
  return { success: true, deleted: config.ticketId };
}
async function opMarkTicketSpam(config, { api }) {
  const g = need(config, "ticketId", "markTicketSpam"); if (g) return g;
  await api.put(`/tickets/${enc(config.ticketId)}/mark_as_spam.json`);
  return { success: true, ticketId: config.ticketId, spam: true };
}
async function opMergeTickets(config, { api }) {
  const g = need(config, "ticketId", "mergeTickets"); if (g) return g;
  const s = need(config, "sourceIds", "mergeTickets"); if (s) return s;
  const ids = csv(config.sourceIds).map((x) => num(x));
  const { data } = await api.post(`/tickets/${enc(config.ticketId)}/merge.json`, {
    ids, target_comment: config.targetComment, source_comment: config.sourceComment,
  });
  return data.job_status || { success: true };
}
async function opListTicketComments(config, { api }) {
  const g = need(config, "ticketId", "listTicketComments"); if (g) return g;
  const { data } = await api.get(`/tickets/${enc(config.ticketId)}/comments.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, comments: data.comments || [], count: data.count };
}
async function opAddComment(config, { api }) {
  const g = need(config, "ticketId", "addComment"); if (g) return g;
  const body = config.body || config.comment;
  if (!body) return skip("addComment", "reply 'body' is required.");
  const update = { comment: { body, public: config.public !== false } };
  if (config.status) update.status = config.status;
  const { data } = await api.put(`/tickets/${enc(config.ticketId)}.json`, { ticket: update });
  return data.ticket;
}
async function opAssignTicket(config, { api }) {
  const g = need(config, "ticketId", "assignTicket"); if (g) return g;
  const a = need(config, "assigneeId", "assignTicket"); if (a) return a;
  const ticket = { assignee_id: num(config.assigneeId) };
  if (config.groupId) ticket.group_id = num(config.groupId);
  const { data } = await api.put(`/tickets/${enc(config.ticketId)}.json`, { ticket });
  return data.ticket;
}
async function opCloseTicket(config, { api }) {
  const g = need(config, "ticketId", "closeTicket"); if (g) return g;
  const { data } = await api.put(`/tickets/${enc(config.ticketId)}.json`, { ticket: { status: config.status || "closed" } });
  return data.ticket;
}
async function opAddTicketTags(config, { api }) {
  const g = need(config, "ticketId", "addTicketTags"); if (g) return g;
  const t = need(config, "tags", "addTicketTags"); if (t) return t;
  const { data } = await api.put(`/tickets/${enc(config.ticketId)}/tags.json`, { tags: csv(config.tags) });
  return { success: true, tags: data.tags };
}
async function opRemoveTicketTags(config, { api }) {
  const g = need(config, "ticketId", "removeTicketTags"); if (g) return g;
  const t = need(config, "tags", "removeTicketTags"); if (t) return t;
  const { data } = await api.delete(`/tickets/${enc(config.ticketId)}/tags.json`, { data: { tags: csv(config.tags) } });
  return { success: true, tags: data.tags };
}
async function opCountTickets(config, { api }) {
  const { data } = await api.get(`/tickets/count.json`);
  return { success: true, count: data.count?.value ?? data.count };
}
async function opListTicketAudits(config, { api }) {
  const g = need(config, "ticketId", "listTicketAudits"); if (g) return g;
  const { data } = await api.get(`/tickets/${enc(config.ticketId)}/audits.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, audits: data.audits || [] };
}

export const ticketOperations = {
  listTickets: opListTickets, getTicket: opGetTicket, createTicket: opCreateTicket,
  updateTicket: opUpdateTicket, deleteTicket: opDeleteTicket, markTicketSpam: opMarkTicketSpam,
  mergeTickets: opMergeTickets, listTicketComments: opListTicketComments,
  addComment: opAddComment, replyTicket: opAddComment,
  assignTicket: opAssignTicket, closeTicket: opCloseTicket,
  addTicketTags: opAddTicketTags, removeTicketTags: opRemoveTicketTags,
  countTickets: opCountTickets, listTicketAudits: opListTicketAudits,
};
