/**
 * ZENDESK NODE — nuclear dispatch
 *
 * Auth: API token + agent email stored in vault as JSON { "email": "...", "token": "..." }
 * (or raw token with config.email). Basic auth: `${email}/token` : `${token}`.
 * Per-account base: https://{subdomain}.zendesk.com/api/v2
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const skip = (op, msg) => ({ success: false, error: `Zendesk ${op}: ${msg}`, skipped: true });
const lim = (v, d = 100) => Math.min(Number(v ?? d) || d, 100);
const enc = encodeURIComponent;
const csv = (v) => (Array.isArray(v) ? v : String(v || "").split(",").map((s) => s.trim()).filter(Boolean));
const num = (v) => (v === undefined || v === null || v === "" ? undefined : parseInt(v, 10));

function need(config, key, op) {
  if (config[key] === undefined || config[key] === null || config[key] === "") return skip(op, `'${key}' is required.`);
  return null;
}

function parseJson(value, op, field) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Zendesk ${op}: '${field}' must be valid JSON.`);
  }
}

async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Zendesk");
  let token, email;
  try {
    const j = JSON.parse(raw);
    token = j.token;
    email = j.email;
  } catch {
    token = raw;
  }
  return { token, email };
}

/* ---------------- Tickets ---------------- */
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

/* ---------------- Users ---------------- */
function buildUser(config) {
  const u = {};
  if (config.name) u.name = config.name;
  if (config.email) u.email = config.email;
  if (config.role) u.role = config.role;
  if (config.phone) u.phone = config.phone;
  if (config.externalId) u.external_id = config.externalId;
  if (config.organizationId) u.organization_id = num(config.organizationId);
  if (config.tags) u.tags = csv(config.tags);
  if (config.notes) u.notes = config.notes;
  return u;
}
async function opListUsers(config, { api }) {
  const params = { per_page: lim(config.limit) };
  if (config.role) params["role[]"] = config.role;
  const { data } = await api.get(`/users.json`, { params });
  return { success: true, users: data.users || [], count: data.count };
}
async function opGetUser(config, { api }) {
  const g = need(config, "userId", "getUser"); if (g) return g;
  const { data } = await api.get(`/users/${enc(config.userId)}.json`);
  return data.user;
}
async function opCreateUser(config, { api }) {
  const n = need(config, "name", "createUser"); if (n) return n;
  const e = need(config, "email", "createUser"); if (e) return e;
  const user = buildUser(config);
  user.role = user.role || "end-user";
  const { data } = await api.post(`/users.json`, { user });
  return data.user;
}
async function opUpdateUser(config, { api }) {
  const g = need(config, "userId", "updateUser"); if (g) return g;
  const { data } = await api.put(`/users/${enc(config.userId)}.json`, { user: buildUser(config) });
  return data.user;
}
async function opDeleteUser(config, { api }) {
  const g = need(config, "userId", "deleteUser"); if (g) return g;
  const { data } = await api.delete(`/users/${enc(config.userId)}.json`);
  return data.user || { success: true, deleted: config.userId };
}
async function opCreateOrUpdateUser(config, { api }) {
  const e = need(config, "email", "createOrUpdateUser"); if (e) return e;
  const user = buildUser(config);
  user.name = user.name || config.email;
  const { data } = await api.post(`/users/create_or_update.json`, { user });
  return data.user;
}
async function opSearchUsers(config, { api }) {
  const q = need(config, "query", "searchUsers"); if (q) return q;
  const { data } = await api.get(`/users/search.json`, { params: { query: config.query, per_page: lim(config.limit) } });
  return { success: true, users: data.users || [], count: data.count };
}
async function opListUserTickets(config, { api }) {
  const g = need(config, "userId", "listUserTickets"); if (g) return g;
  const which = config.ticketRole === "assigned" ? "assigned" : config.ticketRole === "ccd" ? "ccd" : "requested";
  const { data } = await api.get(`/users/${enc(config.userId)}/tickets/${which}.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, tickets: data.tickets || [], count: data.count };
}
async function opAddUserTags(config, { api }) {
  const g = need(config, "userId", "addUserTags"); if (g) return g;
  const t = need(config, "tags", "addUserTags"); if (t) return t;
  const { data } = await api.put(`/users/${enc(config.userId)}/tags.json`, { tags: csv(config.tags) });
  return { success: true, tags: data.tags };
}

/* ---------------- Organizations ---------------- */
function buildOrg(config) {
  const o = {};
  if (config.name) o.name = config.name;
  if (config.domainNames) o.domain_names = csv(config.domainNames);
  if (config.externalId) o.external_id = config.externalId;
  if (config.notes) o.notes = config.notes;
  if (config.tags) o.tags = csv(config.tags);
  const fields = parseJson(config.organizationFields, "buildOrg", "organizationFields");
  if (fields) o.organization_fields = fields;
  return o;
}
async function opListOrganizations(config, { api }) {
  const { data } = await api.get(`/organizations.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, organizations: data.organizations || [], count: data.count };
}
async function opGetOrganization(config, { api }) {
  const g = need(config, "organizationId", "getOrganization"); if (g) return g;
  const { data } = await api.get(`/organizations/${enc(config.organizationId)}.json`);
  return data.organization;
}
async function opCreateOrganization(config, { api }) {
  const n = need(config, "name", "createOrganization"); if (n) return n;
  const { data } = await api.post(`/organizations.json`, { organization: buildOrg(config) });
  return data.organization;
}
async function opUpdateOrganization(config, { api }) {
  const g = need(config, "organizationId", "updateOrganization"); if (g) return g;
  const { data } = await api.put(`/organizations/${enc(config.organizationId)}.json`, { organization: buildOrg(config) });
  return data.organization;
}
async function opDeleteOrganization(config, { api }) {
  const g = need(config, "organizationId", "deleteOrganization"); if (g) return g;
  await api.delete(`/organizations/${enc(config.organizationId)}.json`);
  return { success: true, deleted: config.organizationId };
}
async function opSearchOrganizations(config, { api }) {
  const q = need(config, "query", "searchOrganizations"); if (q) return q;
  const { data } = await api.get(`/organizations/search.json`, { params: { name: config.query } });
  return { success: true, organizations: data.organizations || [], count: data.count };
}
async function opListOrganizationTickets(config, { api }) {
  const g = need(config, "organizationId", "listOrganizationTickets"); if (g) return g;
  const { data } = await api.get(`/organizations/${enc(config.organizationId)}/tickets.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, tickets: data.tickets || [], count: data.count };
}

/* ---------------- Groups ---------------- */
async function opListGroups(config, { api }) {
  const { data } = await api.get(`/groups.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, groups: data.groups || [], count: data.count };
}
async function opGetGroup(config, { api }) {
  const g = need(config, "groupId", "getGroup"); if (g) return g;
  const { data } = await api.get(`/groups/${enc(config.groupId)}.json`);
  return data.group;
}
async function opCreateGroup(config, { api }) {
  const n = need(config, "name", "createGroup"); if (n) return n;
  const { data } = await api.post(`/groups.json`, { group: { name: config.name, description: config.description } });
  return data.group;
}
async function opUpdateGroup(config, { api }) {
  const g = need(config, "groupId", "updateGroup"); if (g) return g;
  const group = {};
  if (config.name) group.name = config.name;
  if (config.description) group.description = config.description;
  const { data } = await api.put(`/groups/${enc(config.groupId)}.json`, { group });
  return data.group;
}
async function opDeleteGroup(config, { api }) {
  const g = need(config, "groupId", "deleteGroup"); if (g) return g;
  await api.delete(`/groups/${enc(config.groupId)}.json`);
  return { success: true, deleted: config.groupId };
}

/* ---------------- Fields / Macros / Views ---------------- */
async function opListTicketFields(config, { api }) {
  const { data } = await api.get(`/ticket_fields.json`);
  return { success: true, ticket_fields: data.ticket_fields || [] };
}
async function opCreateTicketField(config, { api }) {
  const t = need(config, "fieldType", "createTicketField"); if (t) return t;
  const l = need(config, "title", "createTicketField"); if (l) return l;
  const { data } = await api.post(`/ticket_fields.json`, { ticket_field: { type: config.fieldType, title: config.title } });
  return data.ticket_field;
}
async function opListMacros(config, { api }) {
  const { data } = await api.get(`/macros.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, macros: data.macros || [], count: data.count };
}
async function opApplyMacro(config, { api }) {
  const t = need(config, "ticketId", "applyMacro"); if (t) return t;
  const m = need(config, "macroId", "applyMacro"); if (m) return m;
  const { data } = await api.get(`/tickets/${enc(config.ticketId)}/macros/${enc(config.macroId)}/apply.json`);
  return data.result || data;
}
async function opListViews(config, { api }) {
  const { data } = await api.get(`/views.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, views: data.views || [], count: data.count };
}
async function opExecuteView(config, { api }) {
  const v = need(config, "viewId", "executeView"); if (v) return v;
  const { data } = await api.get(`/views/${enc(config.viewId)}/tickets.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, tickets: data.tickets || [], count: data.count };
}
async function opCountView(config, { api }) {
  const v = need(config, "viewId", "countView"); if (v) return v;
  const { data } = await api.get(`/views/${enc(config.viewId)}/count.json`);
  return { success: true, count: data.view_count?.value ?? data.view_count };
}

/* ---------------- Search / Satisfaction ---------------- */
async function opSearch(config, { api }) {
  const q = need(config, "query", "search"); if (q) return q;
  const { data } = await api.get(`/search.json`, { params: { query: config.query, per_page: lim(config.limit) } });
  return { success: true, results: data.results || [], count: data.count };
}
async function opSearchTickets(config, { api }) {
  const q = need(config, "query", "searchTickets"); if (q) return q;
  const { data } = await api.get(`/search.json`, { params: { query: `type:ticket ${config.query}`, per_page: lim(config.limit) } });
  return { success: true, results: data.results || [], count: data.count };
}
async function opListSatisfactionRatings(config, { api }) {
  const { data } = await api.get(`/satisfaction_ratings.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, satisfaction_ratings: data.satisfaction_ratings || [], count: data.count };
}

/* ---------------- Help Center (Guide) ---------------- */
async function opListArticles(config, { api }) {
  const { data } = await api.get(`/help_center/articles.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, articles: data.articles || [], count: data.count };
}
async function opGetArticle(config, { api }) {
  const a = need(config, "articleId", "getArticle"); if (a) return a;
  const { data } = await api.get(`/help_center/articles/${enc(config.articleId)}.json`);
  return data.article;
}
async function opCreateArticle(config, { api }) {
  const s = need(config, "sectionId", "createArticle"); if (s) return s;
  const t = need(config, "title", "createArticle"); if (t) return t;
  const article = { title: config.title, body: config.body || "", locale: config.locale || "en-us" };
  if (config.permissionGroupId) article.permission_group_id = num(config.permissionGroupId);
  if (config.userSegmentId) article.user_segment_id = num(config.userSegmentId);
  const { data } = await api.post(`/help_center/sections/${enc(config.sectionId)}/articles.json`, { article });
  return data.article;
}
async function opUpdateArticle(config, { api }) {
  const a = need(config, "articleId", "updateArticle"); if (a) return a;
  const article = {};
  if (config.title) article.title = config.title;
  if (config.body) article.body = config.body;
  const { data } = await api.put(`/help_center/articles/${enc(config.articleId)}.json`, { article });
  return data.article;
}
async function opDeleteArticle(config, { api }) {
  const a = need(config, "articleId", "deleteArticle"); if (a) return a;
  await api.delete(`/help_center/articles/${enc(config.articleId)}.json`);
  return { success: true, deleted: config.articleId };
}
async function opListSections(config, { api }) {
  const { data } = await api.get(`/help_center/sections.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, sections: data.sections || [], count: data.count };
}
async function opCreateSection(config, { api }) {
  const c = need(config, "categoryId", "createSection"); if (c) return c;
  const n = need(config, "name", "createSection"); if (n) return n;
  const { data } = await api.post(`/help_center/categories/${enc(config.categoryId)}/sections.json`, {
    section: { name: config.name, description: config.description, locale: config.locale || "en-us" },
  });
  return data.section;
}
async function opListCategories(config, { api }) {
  const { data } = await api.get(`/help_center/categories.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, categories: data.categories || [], count: data.count };
}
async function opCreateCategory(config, { api }) {
  const n = need(config, "name", "createCategory"); if (n) return n;
  const { data } = await api.post(`/help_center/categories.json`, {
    category: { name: config.name, description: config.description, locale: config.locale || "en-us" },
  });
  return data.category;
}

const OPERATIONS = {
  listTickets: opListTickets, getTicket: opGetTicket, createTicket: opCreateTicket,
  updateTicket: opUpdateTicket, deleteTicket: opDeleteTicket, markTicketSpam: opMarkTicketSpam,
  mergeTickets: opMergeTickets, listTicketComments: opListTicketComments,
  addComment: opAddComment, replyTicket: opAddComment,
  assignTicket: opAssignTicket, closeTicket: opCloseTicket,
  addTicketTags: opAddTicketTags, removeTicketTags: opRemoveTicketTags,
  countTickets: opCountTickets, listTicketAudits: opListTicketAudits,

  listUsers: opListUsers, getUser: opGetUser, createUser: opCreateUser, updateUser: opUpdateUser,
  deleteUser: opDeleteUser, createOrUpdateUser: opCreateOrUpdateUser, searchUsers: opSearchUsers,
  listUserTickets: opListUserTickets, addUserTags: opAddUserTags,

  listOrganizations: opListOrganizations, getOrganization: opGetOrganization,
  createOrganization: opCreateOrganization, updateOrganization: opUpdateOrganization,
  deleteOrganization: opDeleteOrganization, searchOrganizations: opSearchOrganizations,
  listOrganizationTickets: opListOrganizationTickets,

  listGroups: opListGroups, getGroup: opGetGroup, createGroup: opCreateGroup,
  updateGroup: opUpdateGroup, deleteGroup: opDeleteGroup,

  listTicketFields: opListTicketFields, createTicketField: opCreateTicketField,
  listMacros: opListMacros, applyMacro: opApplyMacro,
  listViews: opListViews, executeView: opExecuteView, countView: opCountView,

  search: opSearch, searchTickets: opSearchTickets, listSatisfactionRatings: opListSatisfactionRatings,

  listArticles: opListArticles, getArticle: opGetArticle, createArticle: opCreateArticle,
  updateArticle: opUpdateArticle, deleteArticle: opDeleteArticle,
  listSections: opListSections, createSection: opCreateSection,
  listCategories: opListCategories, createCategory: opCreateCategory,
};

function handleError(err) {
  if (err.message?.startsWith("Zendesk")) throw err;
  const status = err.response?.status;
  const desc = err.response?.data?.description || err.response?.data?.error || JSON.stringify(err.response?.data?.details || err.message);
  if (status === 401) throw new Error("Zendesk: Invalid email or API token.");
  if (status === 403) throw new Error(`Zendesk: Forbidden — ${desc}. Check your agent permissions.`);
  if (status === 404) throw new Error(`Zendesk: Resource not found — ${desc}`);
  if (status === 409) throw new Error(`Zendesk: Conflict — ${desc}`);
  if (status === 422) throw new Error(`Zendesk: Validation error — ${desc}`);
  if (status === 429) throw new Error("Zendesk: Rate limit exceeded. Retry later.");
  if (status >= 500) throw new Error(`Zendesk: Server error (${status}) — try again later.`);
  throw new Error(`Zendesk: ${status || err.code} — ${err.message}`);
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || "listTickets";
    const handler = OPERATIONS[op];
    if (!handler) return { success: false, error: `Zendesk: Unknown operation "${op}".`, skipped: true };

    const subdomain = config.subdomain || input?.subdomain || "";
    if (!subdomain) return { success: false, error: "Zendesk: 'subdomain' is required (e.g. 'mycompany').", skipped: true };
    if (!config.credentialId) return { success: false, error: "Zendesk: No credential selected.", skipped: true };

    let token, email;
    try {
      ({ token, email } = await getCreds(config.credentialId, context.workspaceId));
    } catch (e) {
      return { success: false, error: `Zendesk: Could not resolve credential — ${e.message}`, skipped: true };
    }
    email = email || config.email;
    if (!token) return { success: false, error: "Zendesk: API token missing from credential.", skipped: true };
    if (!email) return { success: false, error: "Zendesk: Agent email missing — store credential as JSON { email, token }.", skipped: true };

    const sub = String(subdomain).replace(/\.zendesk\.com.*$/, "").replace(/^https?:\/\//, "");
    const api = axios.create({
      baseURL: `https://${sub}.zendesk.com/api/v2`,
      auth: { username: `${email}/token`, password: token },
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    try {
      return await handler(config, { api });
    } catch (err) {
      handleError(err);
    }
  },
};
