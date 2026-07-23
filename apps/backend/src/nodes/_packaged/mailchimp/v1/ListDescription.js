/**
 * Mailchimp — Audience/List + Member resources. List/audience CRUD & stats;
 * member list/get/add/update/upsert/delete/archive; member tags & activity;
 * member notes. Handlers receive `(config, client)`.
 */
import { req, memberId } from "../GenericFunctions.js";

// ── Audiences / Lists ───────────────────────────────────────────────────────

async function opListAudiences(config, client) {
  const params = { count: parseInt(config.limit) || 25, offset: parseInt(config.offset) || 0 };
  const data = await req(client, "get", "/lists", { params });
  return { lists: data.lists || [], total: data.total_items };
}

async function opGetAudience(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp getAudience: 'listId' is required.", skipped: true };
  return req(client, "get", `/lists/${encodeURIComponent(listId)}`, { timeout: 120000 });
}

async function opCreateAudience(config, client) {
  if (!config.name) return { success: false, error: "Mailchimp createAudience: 'name' is required.", skipped: true };
  if (!config.fromName || !config.fromEmail) return { success: false, error: "Mailchimp createAudience: 'fromName' and 'fromEmail' are required.", skipped: true };
  const body = {
    name: config.name,
    contact: {
      company: config.company || config.name,
      address1: config.address1 || "",
      city: config.city || "",
      state: config.state || "",
      zip: config.zip || "",
      country: config.country || "US",
    },
    permission_reminder: config.permissionReminder || "You subscribed to our list.",
    campaign_defaults: {
      from_name: config.fromName,
      from_email: config.fromEmail,
      subject: config.defaultSubject || "",
      language: config.language || "en",
    },
    email_type_option: config.emailTypeOption === true || config.emailTypeOption === "true",
  };
  const data = await req(client, "post", "/lists", { body, timeout: 120000 });
  return { id: data.id, name: data.name, memberCount: data.stats?.member_count };
}

async function opUpdateAudience(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp updateAudience: 'listId' is required.", skipped: true };
  const body = {};
  if (config.name) body.name = config.name;
  if (config.permissionReminder) body.permission_reminder = config.permissionReminder;
  const contact = {};
  if (config.company) contact.company = config.company;
  if (config.address1) contact.address1 = config.address1;
  if (config.city) contact.city = config.city;
  if (config.country) contact.country = config.country;
  if (Object.keys(contact).length) body.contact = contact;
  const data = await req(client, "patch", `/lists/${encodeURIComponent(listId)}`, { body, timeout: 120000 });
  return { id: data.id, name: data.name };
}

async function opDeleteAudience(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp deleteAudience: 'listId' is required.", skipped: true };
  await req(client, "delete", `/lists/${encodeURIComponent(listId)}`, { timeout: 120000 });
  return { success: true, listId, deleted: true };
}

async function opGetAudienceStats(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp getAudienceStats: 'listId' is required.", skipped: true };
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}`, { timeout: 120000 });
  return { id: data.id, name: data.name, stats: data.stats };
}

// ── Members ─────────────────────────────────────────────────────────────────

async function opListSubscribers(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp listSubscribers: 'listId' is required.", skipped: true };
  const params = { count: parseInt(config.limit) || 50, offset: parseInt(config.offset) || 0 };
  if (config.memberStatus) params.status = config.memberStatus;
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}/members`, { params });
  return { members: data.members || [], total: data.total_items };
}

async function opGetSubscriber(config, client) {
  const listId = config.listId;
  const email = config.email || config.subscriberHash;
  if (!listId) return { success: false, error: "Mailchimp getSubscriber: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp getSubscriber: 'email' is required.", skipped: true };
  return req(client, "get", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}`, { timeout: 120000 });
}

function buildMergeFields(config) {
  const merge = {};
  if (config.firstName) merge.FNAME = config.firstName;
  if (config.lastName) merge.LNAME = config.lastName;
  if (config.mergeFields) {
    const extra = typeof config.mergeFields === "string" ? safeJson(config.mergeFields) : config.mergeFields;
    if (extra && typeof extra === "object") Object.assign(merge, extra);
  }
  return merge;
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

async function opAddSubscriber(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp addSubscriber: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp addSubscriber: 'email' is required.", skipped: true };
  const merge = buildMergeFields(config);
  const body = {
    email_address: email,
    status: config.status || "subscribed",
    ...(Object.keys(merge).length ? { merge_fields: merge } : {}),
    ...(config.tags ? { tags: String(config.tags).split(",").map(s => s.trim()).filter(Boolean) } : {}),
  };
  const data = await req(client, "post", `/lists/${encodeURIComponent(listId)}/members`, { body, timeout: 120000 });
  return { id: data.id, email: data.email_address, status: data.status };
}

async function opUpdateSubscriber(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp updateSubscriber: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp updateSubscriber: 'email' is required.", skipped: true };
  const body = {};
  if (config.status) body.status = config.status;
  const merge = buildMergeFields(config);
  if (Object.keys(merge).length) body.merge_fields = merge;
  const data = await req(client, "patch", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}`, { body, timeout: 120000 });
  return { id: data.id, email: data.email_address, status: data.status };
}

async function opUpsertSubscriber(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp upsertSubscriber: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp upsertSubscriber: 'email' is required.", skipped: true };
  const merge = buildMergeFields(config);
  const body = {
    email_address: email,
    status_if_new: config.status || "subscribed",
    ...(config.status ? { status: config.status } : {}),
    ...(Object.keys(merge).length ? { merge_fields: merge } : {}),
  };
  const data = await req(client, "put", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}`, { body, timeout: 120000 });
  return { id: data.id, email: data.email_address, status: data.status };
}

async function opDeleteSubscriber(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp deleteSubscriber: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp deleteSubscriber: 'email' is required.", skipped: true };
  await req(client, "post", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}/actions/delete-permanent`, { body: {}, timeout: 120000 });
  return { success: true, email, deleted: true };
}

async function opArchiveSubscriber(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp archiveSubscriber: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp archiveSubscriber: 'email' is required.", skipped: true };
  await req(client, "delete", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}`, { timeout: 120000 });
  return { success: true, email, archived: true };
}

async function opGetSubscriberActivity(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp getSubscriberActivity: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp getSubscriberActivity: 'email' is required.", skipped: true };
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}/activity-feed`, {
    params: { count: parseInt(config.limit) || 50 },
    timeout: 120000,
  });
  return { activity: data.activity || [], total: data.total_items };
}

// ── Member tags ─────────────────────────────────────────────────────────────

async function opGetSubscriberTags(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp getSubscriberTags: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp getSubscriberTags: 'email' is required.", skipped: true };
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}/tags`, { timeout: 120000 });
  return { tags: data.tags || [], total: data.total_items };
}

async function updateTags(config, client, status, label) {
  const listId = config.listId;
  const email = config.email;
  const tags = String(config.tags || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!listId) return { success: false, error: `Mailchimp ${label}: 'listId' is required.`, skipped: true };
  if (!email) return { success: false, error: `Mailchimp ${label}: 'email' is required.`, skipped: true };
  if (tags.length === 0) return { success: false, error: `Mailchimp ${label}: 'tags' (comma-separated) are required.`, skipped: true };
  await req(client, "post", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}/tags`, {
    body: { tags: tags.map(name => ({ name, status })) },
    timeout: 120000,
  });
  return { success: true, email, tags, status };
}

async function opAddSubscriberTags(config, client) { return updateTags(config, client, "active", "addSubscriberTags"); }
async function opRemoveSubscriberTags(config, client) { return updateTags(config, client, "inactive", "removeSubscriberTags"); }

// ── Member notes ────────────────────────────────────────────────────────────

async function opListSubscriberNotes(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp listSubscriberNotes: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp listSubscriberNotes: 'email' is required.", skipped: true };
  const data = await req(client, "get", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}/notes`, {
    params: { count: parseInt(config.limit) || 25 },
    timeout: 120000,
  });
  return { notes: data.notes || [], total: data.total_items };
}

async function opCreateSubscriberNote(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp createSubscriberNote: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp createSubscriberNote: 'email' is required.", skipped: true };
  if (!config.note) return { success: false, error: "Mailchimp createSubscriberNote: 'note' text is required.", skipped: true };
  const data = await req(client, "post", `/lists/${encodeURIComponent(listId)}/members/${memberId(email)}/notes`, {
    body: { note: String(config.note).substring(0, 1000) },
    timeout: 120000,
  });
  return { id: data.id, note: data.note, createdAt: data.created_at };
}

export const listOperations = {
  listAudiences: opListAudiences,
  getAudience: opGetAudience,
  createAudience: opCreateAudience,
  updateAudience: opUpdateAudience,
  deleteAudience: opDeleteAudience,
  getAudienceStats: opGetAudienceStats,
  listSubscribers: opListSubscribers,
  getSubscriber: opGetSubscriber,
  addSubscriber: opAddSubscriber,
  updateSubscriber: opUpdateSubscriber,
  upsertSubscriber: opUpsertSubscriber,
  deleteSubscriber: opDeleteSubscriber,
  archiveSubscriber: opArchiveSubscriber,
  getSubscriberActivity: opGetSubscriberActivity,
  getSubscriberTags: opGetSubscriberTags,
  addSubscriberTags: opAddSubscriberTags,
  removeSubscriberTags: opRemoveSubscriberTags,
  listSubscriberNotes: opListSubscriberNotes,
  createSubscriberNote: opCreateSubscriberNote,
};
