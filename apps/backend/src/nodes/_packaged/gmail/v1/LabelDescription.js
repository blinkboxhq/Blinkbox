/**
 * Gmail — labels: add/remove on a message, list/create/delete label entities.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth, modifyLabels } from "../GenericFunctions.js";

async function opAddLabel(config, token) {
  if (!config.labelId) return { success: false, error: "Gmail addLabel: 'labelId' is required.", skipped: true };
  return modifyLabels(config, token, [config.labelId], []);
}

async function opRemoveLabel(config, token) {
  if (!config.labelId) return { success: false, error: "Gmail removeLabel: 'labelId' is required.", skipped: true };
  return modifyLabels(config, token, [], [config.labelId]);
}

async function opListLabels(config, token) {
  const response = await axios.get(`${BASE}/labels`, { headers: auth(token), timeout: 120000 });
  return { labels: response.data.labels || [] };
}

async function opCreateLabel(config, token) {
  if (!config.labelName) return { success: false, error: "Gmail createLabel: 'labelName' is required.", skipped: true };
  const response = await axios.post(`${BASE}/labels`, {
    name: config.labelName,
    labelListVisibility: config.labelListVisibility || "labelShow",
    messageListVisibility: config.messageListVisibility || "show",
  }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 120000,
  });
  return { labelId: response.data.id, name: response.data.name };
}

async function opDeleteLabel(config, token) {
  if (!config.labelId) return { success: false, error: "Gmail deleteLabel: 'labelId' is required.", skipped: true };
  await axios.delete(`${BASE}/labels/${encodeURIComponent(config.labelId)}`, { headers: auth(token), timeout: 120000 });
  return { labelId: config.labelId, deleted: true };
}

export const labelOperations = {
  addLabel: opAddLabel,
  removeLabel: opRemoveLabel,
  listLabels: opListLabels,
  createLabel: opCreateLabel,
  deleteLabel: opDeleteLabel,
};
