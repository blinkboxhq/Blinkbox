/**
 * Pipedrive — Activity, Note, Lead, Product, Pipeline/Stage, and Filter
 * resources.
 */
import { boundLimit, num } from "../GenericFunctions.js";

/* ---- Activity ---- */
async function opListActivities(config, client) {
  const params = { limit: boundLimit(config.limit), start: Number(config.start) || 0 };
  if (config.done != null) params.done = config.done ? 1 : 0;
  if (config.userId) params.user_id = num(config.userId);
  const { data } = await client.get("/activities", { params });
  return { success: true, activities: data.data ?? [] };
}

async function opGetActivity(config, client) {
  if (!config.activityId) return { success: false, error: "Pipedrive getActivity: activityId required.", skipped: true };
  const { data } = await client.get(`/activities/${config.activityId}`);
  if (!data.data) return { success: false, error: `Pipedrive: Activity ${config.activityId} not found.`, skipped: true };
  return { success: true, ...data.data };
}

function buildActivityBody(config) {
  const body = {};
  if (config.subject != null) body.subject = config.subject;
  if (config.type) body.type = config.type;
  if (config.dueDate) body.due_date = config.dueDate;
  if (config.dueTime) body.due_time = config.dueTime;
  if (config.duration) body.duration = config.duration;
  if (config.dealId) body.deal_id = num(config.dealId);
  if (config.personId) body.person_id = num(config.personId);
  if (config.orgId) body.org_id = num(config.orgId);
  if (config.note) body.note = config.note;
  if (config.done != null) body.done = config.done ? 1 : 0;
  return body;
}

async function opCreateActivity(config, client) {
  if (!config.subject) return { success: false, error: "Pipedrive createActivity: subject required.", skipped: true };
  const { data } = await client.post("/activities", { ...buildActivityBody(config), subject: config.subject, type: config.type || "call" });
  return { success: true, id: data.data?.id, subject: data.data?.subject, type: data.data?.type };
}

async function opUpdateActivity(config, client) {
  if (!config.activityId) return { success: false, error: "Pipedrive updateActivity: activityId required.", skipped: true };
  const { data } = await client.put(`/activities/${config.activityId}`, buildActivityBody(config));
  return { success: true, id: data.data?.id, subject: data.data?.subject, done: data.data?.done };
}

async function opDeleteActivity(config, client) {
  if (!config.activityId) return { success: false, error: "Pipedrive deleteActivity: activityId required.", skipped: true };
  await client.delete(`/activities/${config.activityId}`);
  return { success: true, deleted: true, id: config.activityId };
}

/* ---- Note ---- */
async function opListNotes(config, client) {
  const params = { limit: boundLimit(config.limit), start: Number(config.start) || 0 };
  if (config.dealId) params.deal_id = num(config.dealId);
  if (config.personId) params.person_id = num(config.personId);
  if (config.orgId) params.org_id = num(config.orgId);
  const { data } = await client.get("/notes", { params });
  return { success: true, notes: data.data ?? [] };
}

async function opCreateNote(config, client) {
  if (!config.content) return { success: false, error: "Pipedrive createNote: content required.", skipped: true };
  const body = { content: config.content };
  if (config.dealId) body.deal_id = num(config.dealId);
  if (config.personId) body.person_id = num(config.personId);
  if (config.orgId) body.org_id = num(config.orgId);
  if (config.leadId) body.lead_id = config.leadId;
  const { data } = await client.post("/notes", body);
  return { success: true, id: data.data?.id, content: data.data?.content };
}

async function opUpdateNote(config, client) {
  if (!config.noteId) return { success: false, error: "Pipedrive updateNote: noteId required.", skipped: true };
  if (!config.content) return { success: false, error: "Pipedrive updateNote: content required.", skipped: true };
  const { data } = await client.put(`/notes/${config.noteId}`, { content: config.content });
  return { success: true, id: data.data?.id, content: data.data?.content };
}

async function opDeleteNote(config, client) {
  if (!config.noteId) return { success: false, error: "Pipedrive deleteNote: noteId required.", skipped: true };
  await client.delete(`/notes/${config.noteId}`);
  return { success: true, deleted: true, id: config.noteId };
}

/* ---- Lead ---- */
async function opListLeads(config, client) {
  const { data } = await client.get("/leads", { params: { limit: boundLimit(config.limit) } });
  return { success: true, leads: data.data ?? [] };
}

async function opGetLead(config, client) {
  if (!config.leadId) return { success: false, error: "Pipedrive getLead: leadId required.", skipped: true };
  const { data } = await client.get(`/leads/${config.leadId}`);
  if (!data.data) return { success: false, error: `Pipedrive: Lead ${config.leadId} not found.`, skipped: true };
  return { success: true, ...data.data };
}

async function opCreateLead(config, client) {
  if (!config.title) return { success: false, error: "Pipedrive createLead: title required.", skipped: true };
  if (!config.personId && !config.orgId)
    return { success: false, error: "Pipedrive createLead: personId or orgId required.", skipped: true };
  const body = { title: config.title };
  if (config.personId) body.person_id = num(config.personId);
  if (config.orgId) body.organization_id = num(config.orgId);
  if (config.value != null) body.value = { amount: num(config.value), currency: config.currency || "USD" };
  if (config.ownerId) body.owner_id = num(config.ownerId);
  if (config.expectedCloseDate) body.expected_close_date = config.expectedCloseDate;
  const { data } = await client.post("/leads", body);
  return { success: true, id: data.data?.id, title: data.data?.title };
}

async function opUpdateLead(config, client) {
  if (!config.leadId) return { success: false, error: "Pipedrive updateLead: leadId required.", skipped: true };
  const body = {};
  if (config.title != null) body.title = config.title;
  if (config.ownerId) body.owner_id = num(config.ownerId);
  if (config.value != null) body.value = { amount: num(config.value), currency: config.currency || "USD" };
  if (config.expectedCloseDate) body.expected_close_date = config.expectedCloseDate;
  const { data } = await client.patch(`/leads/${config.leadId}`, body);
  return { success: true, id: data.data?.id, title: data.data?.title };
}

async function opDeleteLead(config, client) {
  if (!config.leadId) return { success: false, error: "Pipedrive deleteLead: leadId required.", skipped: true };
  await client.delete(`/leads/${config.leadId}`);
  return { success: true, deleted: true, id: config.leadId };
}

/* ---- Product ---- */
async function opListProducts(config, client) {
  const { data } = await client.get("/products", { params: { limit: boundLimit(config.limit), start: Number(config.start) || 0 } });
  return { success: true, products: data.data ?? [] };
}

async function opCreateProduct(config, client) {
  if (!config.name) return { success: false, error: "Pipedrive createProduct: name required.", skipped: true };
  const body = { name: config.name };
  if (config.code) body.code = config.code;
  if (config.unit) body.unit = config.unit;
  if (config.price != null) body.prices = [{ price: num(config.price), currency: config.currency || "USD" }];
  const { data } = await client.post("/products", body);
  return { success: true, id: data.data?.id, name: data.data?.name };
}

async function opSearchProducts(config, client) {
  if (!config.term) return { success: false, error: "Pipedrive searchProducts: term required.", skipped: true };
  const { data } = await client.get("/products/search", { params: { term: config.term, limit: boundLimit(config.limit) } });
  return { success: true, items: data.data?.items ?? [] };
}

/* ---- Pipeline / Stage ---- */
async function opListPipelines(config, client) {
  const { data } = await client.get("/pipelines");
  return { success: true, pipelines: data.data ?? [] };
}

async function opListStages(config, client) {
  const params = {};
  if (config.pipelineId) params.pipeline_id = num(config.pipelineId);
  const { data } = await client.get("/stages", { params });
  return { success: true, stages: data.data ?? [] };
}

/* ---- Filter / Global search ---- */
async function opListFilters(config, client) {
  const params = {};
  if (config.filterType) params.type = config.filterType;
  const { data } = await client.get("/filters", { params });
  return { success: true, filters: data.data ?? [] };
}

async function opSearchAll(config, client) {
  if (!config.term) return { success: false, error: "Pipedrive searchAll: term required.", skipped: true };
  const params = { term: config.term, limit: boundLimit(config.limit) };
  if (config.itemTypes) params.item_types = config.itemTypes;
  const { data } = await client.get("/itemSearch", { params });
  return { success: true, items: data.data?.items ?? [] };
}

export const miscOperations = {
  listActivities: opListActivities,
  getActivity: opGetActivity,
  createActivity: opCreateActivity,
  updateActivity: opUpdateActivity,
  deleteActivity: opDeleteActivity,
  listNotes: opListNotes,
  createNote: opCreateNote,
  updateNote: opUpdateNote,
  deleteNote: opDeleteNote,
  listLeads: opListLeads,
  getLead: opGetLead,
  createLead: opCreateLead,
  updateLead: opUpdateLead,
  deleteLead: opDeleteLead,
  listProducts: opListProducts,
  createProduct: opCreateProduct,
  searchProducts: opSearchProducts,
  listPipelines: opListPipelines,
  listStages: opListStages,
  listFilters: opListFilters,
  searchAll: opSearchAll,
};
