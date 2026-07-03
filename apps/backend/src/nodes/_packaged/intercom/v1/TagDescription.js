/**
 * INTERCOM — Tag & Event resource. addTag / createEvent preserved verbatim
 * from the monolith; listTags, removeTag and listEvents added for parity.
 * Handlers receive (config, { api }).
 */
import { parseJson } from "../GenericFunctions.js";

async function opAddTag(config, { api }) {
  if (!config.contactId) return { success: false, error: "Intercom addTag: contactId required.", skipped: true };
  if (!config.tagName) return { success: false, error: "Intercom addTag: tagName required.", skipped: true };
  const tagRes = await api.post("/tags", { name: config.tagName });
  const tagId = tagRes.data.id;
  const { data } = await api.post(`/contacts/${config.contactId}/tags`, { id: tagId });
  return { success: true, tagId, tagName: config.tagName, contact: data };
}

async function opRemoveTag(config, { api }) {
  if (!config.contactId) return { success: false, error: "Intercom removeTag: contactId required.", skipped: true };
  if (!config.tagId) return { success: false, error: "Intercom removeTag: tagId required.", skipped: true };
  const { data } = await api.delete(`/contacts/${config.contactId}/tags/${config.tagId}`);
  return { success: true, tagId: config.tagId, contact: data };
}

async function opListTags(_config, { api }) {
  const { data } = await api.get("/tags");
  return { success: true, tags: data.data ?? [], total: (data.data ?? []).length };
}

async function opCreateEvent(config, { api }) {
  if (!config.eventName) return { success: false, error: "Intercom createEvent: eventName required.", skipped: true };
  if (!config.userId) return { success: false, error: "Intercom createEvent: userId required.", skipped: true };
  const body = {
    event_name: config.eventName,
    created_at: Math.floor(Date.now() / 1000),
    user_id: config.userId,
  };
  const meta = parseJson(config.metadata, "metadata");
  if (meta) body.metadata = meta;
  await api.post("/events", body);
  return { success: true, event_name: config.eventName, user_id: config.userId };
}

async function opListEvents(config, { api }) {
  if (!config.userId) return { success: false, error: "Intercom listEvents: userId required.", skipped: true };
  const { data } = await api.get("/events", { params: { type: "user", user_id: config.userId } });
  return { success: true, events: data.events ?? [], pages: data.pages };
}

export const tagOperations = {
  addTag: opAddTag,
  removeTag: opRemoveTag,
  listTags: opListTags,
  createEvent: opCreateEvent,
  listEvents: opListEvents,
};
