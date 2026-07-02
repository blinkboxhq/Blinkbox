/**
 * Gmail — drafts: create/list/send/delete. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth, buildRawEmail } from "../GenericFunctions.js";

async function opCreateDraft(config, token) {
  if (!config.to) return { success: false, error: "Gmail createDraft: 'to' is required.", skipped: true };
  const raw = buildRawEmail(config);
  const response = await axios.post(`${BASE}/drafts`, { message: { raw } }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 15000,
  });
  return { draftId: response.data.id, messageId: response.data.message?.id };
}

async function opListDrafts(config, token) {
  const response = await axios.get(`${BASE}/drafts`, {
    headers: auth(token),
    params: { maxResults: Math.min(config.maxResults || 10, 100) },
    timeout: 15000,
  });
  return { drafts: response.data.drafts || [], total: response.data.resultSizeEstimate || 0 };
}

async function opSendDraft(config, token) {
  if (!config.draftId) return { success: false, error: "Gmail sendDraft: 'draftId' is required.", skipped: true };
  const response = await axios.post(`${BASE}/drafts/send`, { id: config.draftId }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 30000,
  });
  return { messageId: response.data.id, threadId: response.data.threadId, sentFromDraft: config.draftId };
}

async function opDeleteDraft(config, token) {
  if (!config.draftId) return { success: false, error: "Gmail deleteDraft: 'draftId' is required.", skipped: true };
  await axios.delete(`${BASE}/drafts/${encodeURIComponent(config.draftId)}`, { headers: auth(token), timeout: 10000 });
  return { draftId: config.draftId, deleted: true };
}

export const draftOperations = {
  createDraft: opCreateDraft,
  listDrafts: opListDrafts,
  sendDraft: opSendDraft,
  deleteDraft: opDeleteDraft,
};
