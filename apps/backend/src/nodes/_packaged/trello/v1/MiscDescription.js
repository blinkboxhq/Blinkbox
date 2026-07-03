/**
 * Trello — Checklist, Label, and Member resources.
 */
import { req } from "../GenericFunctions.js";

/* ---- Checklist ---- */
async function opListChecklists(config, client) {
  if (!config.cardId) return { success: false, error: "Trello listChecklists: 'cardId' is required.", skipped: true };
  const data = await req(client, "GET", `/cards/${encodeURIComponent(config.cardId)}/checklists`);
  return { success: true, checklists: data };
}

async function opCreateChecklist(config, client) {
  if (!config.cardId || !config.name) return { success: false, error: "Trello createChecklist: 'cardId' and 'name' are required.", skipped: true };
  const data = await req(client, "POST", `/cards/${encodeURIComponent(config.cardId)}/checklists`, { params: { name: config.name } });
  return { success: true, checklist: data };
}

async function opGetChecklist(config, client) {
  if (!config.checklistId) return { success: false, error: "Trello getChecklist: 'checklistId' is required.", skipped: true };
  const data = await req(client, "GET", `/checklists/${encodeURIComponent(config.checklistId)}`);
  return { success: true, checklist: data };
}

async function opDeleteChecklist(config, client) {
  if (!config.checklistId) return { success: false, error: "Trello deleteChecklist: 'checklistId' is required.", skipped: true };
  await req(client, "DELETE", `/checklists/${encodeURIComponent(config.checklistId)}`);
  return { success: true, deleted: true, id: config.checklistId };
}

async function opAddChecklistItem(config, client) {
  if (!config.checklistId || !config.name) return { success: false, error: "Trello addChecklistItem: 'checklistId' and 'name' are required.", skipped: true };
  const params = { name: config.name };
  if (config.checked != null) params.checked = config.checked;
  if (config.position) params.pos = config.position;
  const data = await req(client, "POST", `/checklists/${encodeURIComponent(config.checklistId)}/checkItems`, { params });
  return { success: true, item: data };
}

async function opUpdateChecklistItem(config, client) {
  if (!config.cardId || !config.checkItemId) return { success: false, error: "Trello updateChecklistItem: 'cardId' and 'checkItemId' are required.", skipped: true };
  const params = {};
  if (config.name != null) params.name = config.name;
  if (config.state) params.state = config.state;
  if (config.position) params.pos = config.position;
  const data = await req(client, "PUT", `/cards/${encodeURIComponent(config.cardId)}/checkItem/${encodeURIComponent(config.checkItemId)}`, { params });
  return { success: true, item: data };
}

async function opDeleteChecklistItem(config, client) {
  if (!config.checklistId || !config.checkItemId) return { success: false, error: "Trello deleteChecklistItem: 'checklistId' and 'checkItemId' are required.", skipped: true };
  await req(client, "DELETE", `/checklists/${encodeURIComponent(config.checklistId)}/checkItems/${encodeURIComponent(config.checkItemId)}`);
  return { success: true, deleted: true, id: config.checkItemId };
}

/* ---- Label ---- */
async function opCreateLabel(config, client) {
  if (!config.boardId || !config.labelName) return { success: false, error: "Trello createLabel: 'boardId' and 'labelName' are required.", skipped: true };
  const params = { idBoard: config.boardId, name: config.labelName, color: config.labelColor || "null" };
  const data = await req(client, "POST", `/labels`, { params });
  return { success: true, label: data };
}

async function opUpdateLabel(config, client) {
  if (!config.labelId) return { success: false, error: "Trello updateLabel: 'labelId' is required.", skipped: true };
  const params = {};
  if (config.labelName != null) params.name = config.labelName;
  if (config.labelColor) params.color = config.labelColor;
  const data = await req(client, "PUT", `/labels/${encodeURIComponent(config.labelId)}`, { params });
  return { success: true, label: data };
}

async function opDeleteLabel(config, client) {
  if (!config.labelId) return { success: false, error: "Trello deleteLabel: 'labelId' is required.", skipped: true };
  await req(client, "DELETE", `/labels/${encodeURIComponent(config.labelId)}`);
  return { success: true, deleted: true, id: config.labelId };
}

/* ---- Member ---- */
async function opGetMe(config, client) {
  const data = await req(client, "GET", `/members/me`);
  return { success: true, member: data };
}

async function opGetMember(config, client) {
  if (!config.memberId) return { success: false, error: "Trello getMember: 'memberId' is required.", skipped: true };
  const data = await req(client, "GET", `/members/${encodeURIComponent(config.memberId)}`);
  return { success: true, member: data };
}

export const miscOperations = {
  listChecklists: opListChecklists,
  createChecklist: opCreateChecklist,
  getChecklist: opGetChecklist,
  deleteChecklist: opDeleteChecklist,
  addChecklistItem: opAddChecklistItem,
  updateChecklistItem: opUpdateChecklistItem,
  deleteChecklistItem: opDeleteChecklistItem,
  createLabel: opCreateLabel,
  updateLabel: opUpdateLabel,
  deleteLabel: opDeleteLabel,
  getMe: opGetMe,
  getMember: opGetMember,
};
