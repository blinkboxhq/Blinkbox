/**
 * SHAREPOINT — Site & List resource. listSites preserved verbatim from the
 * monolith; getSite, listDrives, listLists, getListItems, createListItem added
 * for parity with the Microsoft Graph SharePoint surface. Handlers receive
 * (config, ctx) where ctx is { headers, siteId, input }.
 */
import axios from "axios";
import { GRAPH } from "../GenericFunctions.js";

async function opListSites(config, { headers: h }) {
  const { data } = await axios.get(`${GRAPH}/sites?search=*`, { headers: h, timeout: 15000 });
  return { sites: data.value.map((s) => ({ id: s.id, name: s.displayName, webUrl: s.webUrl })), count: data.value.length };
}

async function opGetSite(config, { headers: h, siteId }) {
  if (!siteId) return { success: false, error: "SharePoint getSite: 'siteId' required.", skipped: true };
  const { data } = await axios.get(`${GRAPH}/sites/${encodeURIComponent(siteId)}`, { headers: h, timeout: 10000 });
  return { id: data.id, name: data.displayName, webUrl: data.webUrl, description: data.description, createdDateTime: data.createdDateTime };
}

async function opListDrives(config, { headers: h, siteId }) {
  if (!siteId) return { success: false, error: "SharePoint listDrives: 'siteId' required.", skipped: true };
  const { data } = await axios.get(`${GRAPH}/sites/${encodeURIComponent(siteId)}/drives`, { headers: h, timeout: 10000 });
  return { drives: data.value.map((d) => ({ id: d.id, name: d.name, driveType: d.driveType, webUrl: d.webUrl })), count: data.value.length };
}

async function opListLists(config, { headers: h, siteId }) {
  if (!siteId) return { success: false, error: "SharePoint listLists: 'siteId' required.", skipped: true };
  const { data } = await axios.get(`${GRAPH}/sites/${encodeURIComponent(siteId)}/lists`, { headers: h, timeout: 10000 });
  return { lists: data.value.map((l) => ({ id: l.id, name: l.displayName, webUrl: l.webUrl })), count: data.value.length };
}

async function opGetListItems(config, { headers: h, siteId, input }) {
  if (!siteId) return { success: false, error: "SharePoint getListItems: 'siteId' required.", skipped: true };
  const listId = config.listId || input.listId;
  if (!listId) return { success: false, error: "SharePoint getListItems: 'listId' required.", skipped: true };
  const { data } = await axios.get(`${GRAPH}/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items?expand=fields`, { headers: h, timeout: 15000 });
  return { items: data.value.map((i) => ({ id: i.id, fields: i.fields, webUrl: i.webUrl })), count: data.value.length };
}

async function opCreateListItem(config, { headers: h, siteId, input }) {
  if (!siteId) return { success: false, error: "SharePoint createListItem: 'siteId' required.", skipped: true };
  const listId = config.listId || input.listId;
  if (!listId) return { success: false, error: "SharePoint createListItem: 'listId' required.", skipped: true };
  let fields = config.fields ?? input.fields;
  if (typeof fields === "string") {
    try { fields = JSON.parse(fields); } catch { return { success: false, error: "SharePoint createListItem: 'fields' must be valid JSON.", skipped: true }; }
  }
  if (!fields || typeof fields !== "object") return { success: false, error: "SharePoint createListItem: 'fields' object required.", skipped: true };
  const { data } = await axios.post(`${GRAPH}/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items`, { fields }, { headers: h, timeout: 15000 });
  return { id: data.id, fields: data.fields, webUrl: data.webUrl };
}

export const siteOperations = {
  listSites: opListSites,
  getSite: opGetSite,
  listDrives: opListDrives,
  listLists: opListLists,
  getListItems: opGetListItems,
  createListItem: opCreateListItem,
};
