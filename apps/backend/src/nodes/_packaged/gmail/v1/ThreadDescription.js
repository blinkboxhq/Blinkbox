/**
 * Gmail — threads: get/list. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth } from "../GenericFunctions.js";

async function opGetThread(config, token) {
  if (!config.threadId) return { success: false, error: "Gmail getThread: 'threadId' is required.", skipped: true };
  const response = await axios.get(`${BASE}/threads/${encodeURIComponent(config.threadId)}`, {
    headers: auth(token),
    params: { format: config.format || "metadata" },
    timeout: 15000,
  });
  return { threadId: response.data.id, messages: response.data.messages || [], historyId: response.data.historyId };
}

async function opListThreads(config, token) {
  const response = await axios.get(`${BASE}/threads`, {
    headers: auth(token),
    params: { q: config.query || undefined, maxResults: Math.min(config.maxResults || 10, 100) },
    timeout: 15000,
  });
  return { threads: response.data.threads || [], total: response.data.resultSizeEstimate || 0 };
}

export const threadOperations = {
  getThread: opGetThread,
  listThreads: opListThreads,
};
