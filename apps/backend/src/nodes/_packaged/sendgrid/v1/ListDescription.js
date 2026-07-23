/**
 * SendGrid — Marketing Lists operations: list, create, delete.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth } from "../GenericFunctions.js";

async function opListLists(config, token) {
  const response = await axios.get(`${BASE}/marketing/lists`, { headers: auth(token), params: { page_size: Math.min(config.maxResults || 50, 1000) }, timeout: 120000 });
  return { lists: response.data.result || [] };
}

async function opCreateList(config, token) {
  if (!config.listName) return { success: false, error: "SendGrid createList: 'listName' is required.", skipped: true };
  const response = await axios.post(`${BASE}/marketing/lists`, { name: config.listName }, { headers: auth(token), timeout: 120000 });
  return { listId: response.data.id, name: response.data.name };
}

async function opDeleteList(config, token) {
  if (!config.listId) return { success: false, error: "SendGrid deleteList: 'listId' is required.", skipped: true };
  await axios.delete(`${BASE}/marketing/lists/${encodeURIComponent(config.listId)}`, { headers: auth(token), params: { delete_contacts: !!config.deleteContacts }, timeout: 120000 });
  return { listId: config.listId, deleted: true };
}

export const listOperations = {
  listLists: opListLists,
  createList: opCreateList,
  deleteList: opDeleteList,
};
