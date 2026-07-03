/**
 * HubSpot — Engagement resource (Notes & Tasks). createNote / createTask and
 * the engagementAssociations helper are preserved verbatim; get/update/delete/
 * list symmetry added for parity. Handlers receive (config, { api }).
 */
import { need, flat, lim } from "../GenericFunctions.js";

function engagementAssociations(c, noteType) {
  const a = [];
  const map = noteType === "task"
    ? { contactId: 204, dealId: 216, companyId: 192, ticketId: 228 }
    : { contactId: 202, dealId: 214, companyId: 190, ticketId: 226 };
  for (const [k, typeId] of Object.entries(map)) {
    if (c[k]) a.push({ to: { id: c[k] }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: typeId }] });
  }
  return a;
}

async function createEngagement(api, object, properties, associations) {
  const payload = { properties };
  if (associations?.length) payload.associations = associations;
  const r = await api.post(`/crm/v3/objects/${object}`, payload);
  return { success: true, ...flat(r.data) };
}

function opCreateNote(c, { api }) {
  const e = need(c, "body", "createNote"); if (e) return e;
  const properties = { hs_note_body: c.body, hs_timestamp: c.timestamp || new Date().toISOString() };
  return createEngagement(api, "notes", properties, engagementAssociations(c, "note"));
}
async function opGetNote(c, { api }) {
  const e = need(c, "noteId", "getNote"); if (e) return e;
  const r = await api.get(`/crm/v3/objects/notes/${encodeURIComponent(c.noteId)}`, { params: { properties: "hs_note_body,hs_timestamp" } });
  return { success: true, ...flat(r.data) };
}
async function opUpdateNote(c, { api }) {
  const e = need(c, "noteId", "updateNote"); if (e) return e;
  const properties = {};
  if (c.body !== undefined) properties.hs_note_body = c.body;
  const r = await api.patch(`/crm/v3/objects/notes/${encodeURIComponent(c.noteId)}`, { properties });
  return { success: true, ...flat(r.data) };
}
async function opDeleteNote(c, { api }) {
  const e = need(c, "noteId", "deleteNote"); if (e) return e;
  await api.delete(`/crm/v3/objects/notes/${encodeURIComponent(c.noteId)}`);
  return { success: true, deleted: true, id: c.noteId };
}
async function opListNotes(c, { api }) {
  const r = await api.get("/crm/v3/objects/notes", { params: { limit: lim(c.limit, 20), properties: "hs_note_body,hs_timestamp" } });
  return { success: true, data: (r.data.results ?? []).map(flat), count: r.data.results?.length ?? 0, paging: r.data.paging };
}

function opCreateTask(c, { api }) {
  const e = need(c, "subject", "createTask"); if (e) return e;
  const properties = {
    hs_task_subject: c.subject, hs_task_body: c.body, hs_timestamp: c.timestamp || new Date().toISOString(),
    hs_task_status: c.status || "NOT_STARTED", hs_task_priority: c.priority,
    hubspot_owner_id: c.ownerId ? String(c.ownerId) : undefined,
  };
  return createEngagement(api, "tasks", properties, engagementAssociations(c, "task"));
}
async function opGetTask(c, { api }) {
  const e = need(c, "taskId", "getTask"); if (e) return e;
  const r = await api.get(`/crm/v3/objects/tasks/${encodeURIComponent(c.taskId)}`, { params: { properties: "hs_task_subject,hs_task_body,hs_task_status,hs_task_priority,hs_timestamp,hubspot_owner_id" } });
  return { success: true, ...flat(r.data) };
}
async function opUpdateTask(c, { api }) {
  const e = need(c, "taskId", "updateTask"); if (e) return e;
  const properties = {};
  if (c.subject !== undefined) properties.hs_task_subject = c.subject;
  if (c.body !== undefined) properties.hs_task_body = c.body;
  if (c.status !== undefined) properties.hs_task_status = c.status;
  if (c.priority !== undefined) properties.hs_task_priority = c.priority;
  if (c.ownerId !== undefined) properties.hubspot_owner_id = String(c.ownerId);
  const r = await api.patch(`/crm/v3/objects/tasks/${encodeURIComponent(c.taskId)}`, { properties });
  return { success: true, ...flat(r.data) };
}
async function opDeleteTask(c, { api }) {
  const e = need(c, "taskId", "deleteTask"); if (e) return e;
  await api.delete(`/crm/v3/objects/tasks/${encodeURIComponent(c.taskId)}`);
  return { success: true, deleted: true, id: c.taskId };
}
async function opListTasks(c, { api }) {
  const r = await api.get("/crm/v3/objects/tasks", { params: { limit: lim(c.limit, 20), properties: "hs_task_subject,hs_task_status,hs_task_priority,hs_timestamp" } });
  return { success: true, data: (r.data.results ?? []).map(flat), count: r.data.results?.length ?? 0, paging: r.data.paging };
}

export const engagementOperations = {
  createNote: opCreateNote,
  addNote: opCreateNote,
  getNote: opGetNote,
  updateNote: opUpdateNote,
  deleteNote: opDeleteNote,
  listNotes: opListNotes,
  createTask: opCreateTask,
  getTask: opGetTask,
  updateTask: opUpdateTask,
  deleteTask: opDeleteTask,
  listTasks: opListTasks,
};
