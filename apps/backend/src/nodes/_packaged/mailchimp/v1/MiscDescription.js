/**
 * Mailchimp — remaining resources: merge fields, interest categories/groups,
 * segments, templates, reports, automations, and the account ping.
 * Handlers receive `(config, client)`.
 */
import { req, emailHash } from "../GenericFunctions.js";

// ── Merge fields ────────────────────────────────────────────────────────────

async function opListMergeFields(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp listMergeFields: 'listId' is required.", skipped: true };
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}/merge-fields`, {
    params: { count: parseInt(config.limit) || 50 },
    timeout: 120000,
  });
  return { mergeFields: data.merge_fields || [], total: data.total_items };
}

async function opCreateMergeField(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp createMergeField: 'listId' is required.", skipped: true };
  if (!config.name || !config.mergeType) return { success: false, error: "Mailchimp createMergeField: 'name' and 'mergeType' are required.", skipped: true };
  const body = {
    name: config.name,
    type: config.mergeType,
    ...(config.tag ? { tag: config.tag } : {}),
    ...(config.required !== undefined ? { required: config.required === true || config.required === "true" } : {}),
  };
  const data = await req(client, "post", `/lists/${encodeURIComponent(listId)}/merge-fields`, { body, timeout: 120000 });
  return { id: data.merge_id, tag: data.tag, name: data.name, type: data.type };
}

async function opUpdateMergeField(config, client) {
  const listId = config.listId;
  const mergeId = config.mergeId;
  if (!listId || !mergeId) return { success: false, error: "Mailchimp updateMergeField: 'listId' and 'mergeId' are required.", skipped: true };
  const body = {};
  if (config.name) body.name = config.name;
  if (config.required !== undefined) body.required = config.required === true || config.required === "true";
  const data = await req(client, "patch", `/lists/${encodeURIComponent(listId)}/merge-fields/${encodeURIComponent(mergeId)}`, { body, timeout: 120000 });
  return { id: data.merge_id, tag: data.tag, name: data.name };
}

async function opDeleteMergeField(config, client) {
  const listId = config.listId;
  const mergeId = config.mergeId;
  if (!listId || !mergeId) return { success: false, error: "Mailchimp deleteMergeField: 'listId' and 'mergeId' are required.", skipped: true };
  await req(client, "delete", `/lists/${encodeURIComponent(listId)}/merge-fields/${encodeURIComponent(mergeId)}`, { timeout: 120000 });
  return { success: true, mergeId, deleted: true };
}

// ── Interest categories (groups) ────────────────────────────────────────────

async function opListInterestCategories(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp listInterestCategories: 'listId' is required.", skipped: true };
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}/interest-categories`, {
    params: { count: parseInt(config.limit) || 50 },
    timeout: 120000,
  });
  return { categories: data.categories || [], total: data.total_items };
}

async function opCreateInterestCategory(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp createInterestCategory: 'listId' is required.", skipped: true };
  if (!config.title) return { success: false, error: "Mailchimp createInterestCategory: 'title' is required.", skipped: true };
  const data = await req(client, "post", `/lists/${encodeURIComponent(listId)}/interest-categories`, {
    body: { title: config.title, type: config.categoryType || "checkboxes" },
    timeout: 120000,
  });
  return { id: data.id, title: data.title, type: data.type };
}

async function opListInterests(config, client) {
  const listId = config.listId;
  const categoryId = config.categoryId;
  if (!listId || !categoryId) return { success: false, error: "Mailchimp listInterests: 'listId' and 'categoryId' are required.", skipped: true };
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}/interest-categories/${encodeURIComponent(categoryId)}/interests`, {
    params: { count: parseInt(config.limit) || 50 },
    timeout: 120000,
  });
  return { interests: data.interests || [], total: data.total_items };
}

// ── Segments ────────────────────────────────────────────────────────────────

async function opListSegments(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp listSegments: 'listId' is required.", skipped: true };
  const params = { count: parseInt(config.limit) || 25 };
  if (config.segmentType) params.type = config.segmentType;
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}/segments`, { params, timeout: 120000 });
  return { segments: data.segments || [], total: data.total_items };
}

async function opGetSegment(config, client) {
  const listId = config.listId;
  const segmentId = config.segmentId;
  if (!listId || !segmentId) return { success: false, error: "Mailchimp getSegment: 'listId' and 'segmentId' are required.", skipped: true };
  return req(client, "get", `/lists/${encodeURIComponent(listId)}/segments/${encodeURIComponent(segmentId)}`, { timeout: 120000 });
}

async function opCreateSegment(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp createSegment: 'listId' is required.", skipped: true };
  if (!config.name) return { success: false, error: "Mailchimp createSegment: 'name' is required.", skipped: true };
  const emails = config.staticMembers ? String(config.staticMembers).split(",").map(s => s.trim()).filter(Boolean) : [];
  const body = { name: config.name, static_segment: emails };
  const data = await req(client, "post", `/lists/${encodeURIComponent(listId)}/segments`, { body, timeout: 120000 });
  return { id: data.id, name: data.name, memberCount: data.member_count };
}

async function opUpdateSegment(config, client) {
  const listId = config.listId;
  const segmentId = config.segmentId;
  if (!listId || !segmentId) return { success: false, error: "Mailchimp updateSegment: 'listId' and 'segmentId' are required.", skipped: true };
  const body = {};
  if (config.name) body.name = config.name;
  const data = await req(client, "patch", `/lists/${encodeURIComponent(listId)}/segments/${encodeURIComponent(segmentId)}`, { body, timeout: 120000 });
  return { id: data.id, name: data.name };
}

async function opDeleteSegment(config, client) {
  const listId = config.listId;
  const segmentId = config.segmentId;
  if (!listId || !segmentId) return { success: false, error: "Mailchimp deleteSegment: 'listId' and 'segmentId' are required.", skipped: true };
  await req(client, "delete", `/lists/${encodeURIComponent(listId)}/segments/${encodeURIComponent(segmentId)}`, { timeout: 120000 });
  return { success: true, segmentId, deleted: true };
}

async function opAddSegmentMember(config, client) {
  const listId = config.listId;
  const segmentId = config.segmentId;
  const email = config.email;
  if (!listId || !segmentId) return { success: false, error: "Mailchimp addSegmentMember: 'listId' and 'segmentId' are required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp addSegmentMember: 'email' is required.", skipped: true };
  const data = await req(client, "post", `/lists/${encodeURIComponent(listId)}/segments/${encodeURIComponent(segmentId)}/members`, {
    body: { email_address: email },
    timeout: 120000,
  });
  return { id: data.id, email: data.email_address, segmentId };
}

async function opRemoveSegmentMember(config, client) {
  const listId = config.listId;
  const segmentId = config.segmentId;
  const email = config.email;
  if (!listId || !segmentId) return { success: false, error: "Mailchimp removeSegmentMember: 'listId' and 'segmentId' are required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp removeSegmentMember: 'email' is required.", skipped: true };
  await req(client, "delete", `/lists/${encodeURIComponent(listId)}/segments/${encodeURIComponent(segmentId)}/members/${emailHash(email)}`, { timeout: 120000 });
  return { success: true, email, segmentId, removed: true };
}

// ── Templates ───────────────────────────────────────────────────────────────

async function opListTemplates(config, client) {
  const params = { count: parseInt(config.limit) || 25 };
  if (config.templateType) params.type = config.templateType;
  const data = await req(client, "get", "/templates", { params, timeout: 120000 });
  return { templates: data.templates || [], total: data.total_items };
}

async function opGetTemplate(config, client) {
  const id = config.templateId;
  if (!id) return { success: false, error: "Mailchimp getTemplate: 'templateId' is required.", skipped: true };
  return req(client, "get", `/templates/${encodeURIComponent(id)}`, { timeout: 120000 });
}

async function opCreateTemplate(config, client) {
  if (!config.name) return { success: false, error: "Mailchimp createTemplate: 'name' is required.", skipped: true };
  if (!config.html) return { success: false, error: "Mailchimp createTemplate: 'html' is required.", skipped: true };
  const data = await req(client, "post", "/templates", {
    body: { name: config.name, html: config.html, ...(config.folderId ? { folder_id: config.folderId } : {}) },
    timeout: 120000,
  });
  return { id: data.id, name: data.name };
}

async function opDeleteTemplate(config, client) {
  const id = config.templateId;
  if (!id) return { success: false, error: "Mailchimp deleteTemplate: 'templateId' is required.", skipped: true };
  await req(client, "delete", `/templates/${encodeURIComponent(id)}`, { timeout: 120000 });
  return { success: true, templateId: id, deleted: true };
}

// ── Reports ─────────────────────────────────────────────────────────────────

async function opListReports(config, client) {
  const data = await req(client, "get", "/reports", {
    params: { count: parseInt(config.limit) || 25, offset: parseInt(config.offset) || 0 },
    timeout: 120000,
  });
  return { reports: data.reports || [], total: data.total_items };
}

async function opGetReport(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp getReport: 'campaignId' is required.", skipped: true };
  return req(client, "get", `/reports/${encodeURIComponent(id)}`, { timeout: 120000 });
}

async function opGetClickReports(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp getClickReports: 'campaignId' is required.", skipped: true };
  const data = await req(client, "get", `/reports/${encodeURIComponent(id)}/click-details`, {
    params: { count: parseInt(config.limit) || 50 },
    timeout: 120000,
  });
  return { urlsClicked: data.urls_clicked || [], total: data.total_items };
}

async function opGetOpenReports(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp getOpenReports: 'campaignId' is required.", skipped: true };
  const data = await req(client, "get", `/reports/${encodeURIComponent(id)}/open-details`, {
    params: { count: parseInt(config.limit) || 50 },
    timeout: 120000,
  });
  return { members: data.members || [], totalOpens: data.total_opens, total: data.total_items };
}

// ── Automations ─────────────────────────────────────────────────────────────

async function opListAutomations(config, client) {
  const data = await req(client, "get", "/automations", {
    params: { count: parseInt(config.limit) || 25 },
    timeout: 120000,
  });
  return { automations: data.automations || [], total: data.total_items };
}

async function opGetAutomation(config, client) {
  const id = config.automationId;
  if (!id) return { success: false, error: "Mailchimp getAutomation: 'automationId' is required.", skipped: true };
  return req(client, "get", `/automations/${encodeURIComponent(id)}`, { timeout: 120000 });
}

async function opStartAutomation(config, client) {
  const id = config.automationId;
  if (!id) return { success: false, error: "Mailchimp startAutomation: 'automationId' is required.", skipped: true };
  await req(client, "post", `/automations/${encodeURIComponent(id)}/actions/start-all-emails`, { body: {}, timeout: 120000 });
  return { success: true, automationId: id, started: true };
}

async function opPauseAutomation(config, client) {
  const id = config.automationId;
  if (!id) return { success: false, error: "Mailchimp pauseAutomation: 'automationId' is required.", skipped: true };
  await req(client, "post", `/automations/${encodeURIComponent(id)}/actions/pause-all-emails`, { body: {}, timeout: 120000 });
  return { success: true, automationId: id, paused: true };
}

// ── Ping ────────────────────────────────────────────────────────────────────

async function opPing(config, client) {
  const data = await req(client, "get", "/ping", { timeout: 120000 });
  return { health: data.health_status || "unknown" };
}

export const miscOperations = {
  listMergeFields: opListMergeFields,
  createMergeField: opCreateMergeField,
  updateMergeField: opUpdateMergeField,
  deleteMergeField: opDeleteMergeField,
  listInterestCategories: opListInterestCategories,
  createInterestCategory: opCreateInterestCategory,
  listInterests: opListInterests,
  listSegments: opListSegments,
  getSegment: opGetSegment,
  createSegment: opCreateSegment,
  updateSegment: opUpdateSegment,
  deleteSegment: opDeleteSegment,
  addSegmentMember: opAddSegmentMember,
  removeSegmentMember: opRemoveSegmentMember,
  listTemplates: opListTemplates,
  getTemplate: opGetTemplate,
  createTemplate: opCreateTemplate,
  deleteTemplate: opDeleteTemplate,
  listReports: opListReports,
  getReport: opGetReport,
  getClickReports: opGetClickReports,
  getOpenReports: opGetOpenReports,
  listAutomations: opListAutomations,
  getAutomation: opGetAutomation,
  startAutomation: opStartAutomation,
  pauseAutomation: opPauseAutomation,
  ping: opPing,
};
