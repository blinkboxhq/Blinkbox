import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { assertSafeUrl } from "../../utils/ssrf.js";

async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Pinecone");
}

function assertIndexHost(host) {
  if (!host) throw new Error("Pinecone: 'indexHost' is required.");
  assertSafeUrl(host);
}

function handleError(err) {
  if (err.response?.status === 401) throw new Error("Pinecone: Invalid API key.");
  if (err.response?.status === 404) throw new Error("Pinecone: Index not found. Check your index host URL.");
  if (err.response?.status === 400) throw new Error(`Pinecone: Bad request — ${err.response?.data?.message || err.message}`);
  throw new Error(`Pinecone failed: ${err.response?.status || err.code} — ${err.message}`);
}

function buildHeaders(apiKey) {
  return { "Api-Key": apiKey, "Content-Type": "application/json" };
}

async function opUpsert(config, apiKey) {
  let vectors = config.vectors;
  if (typeof vectors === "string") { try { vectors = JSON.parse(vectors); } catch { vectors = []; } }
  if (!Array.isArray(vectors) || vectors.length === 0) throw new Error("Pinecone upsert: 'vectors' must be a non-empty array.");

  const host = config.indexHost;
  assertIndexHost(host);

  const body = { vectors };
  if (config.namespace) body.namespace = config.namespace;

  const res = await axios.post(`${host}/vectors/upsert`, body, { headers: buildHeaders(apiKey), timeout: 30000 });
  return { upsertedCount: res.data.upsertedCount ?? vectors.length, namespace: config.namespace || "" };
}

async function opQuery(config, apiKey) {
  const host = config.indexHost;
  if (!host) return { success: false, error: "Pinecone: 'indexHost' is required.", skipped: true };

  let vector = config.vector;
  if (typeof vector === "string") { try { vector = JSON.parse(vector); } catch { vector = []; } }
  if (!Array.isArray(vector) || vector.length === 0) throw new Error("Pinecone query: 'vector' must be a non-empty array of numbers.");

  const body = {
    vector,
    topK: parseInt(config.topK) || 5,
    includeMetadata: config.includeMetadata !== false,
    includeValues: false,
  };
  if (config.namespace) body.namespace = config.namespace;

  const res = await axios.post(`${host}/query`, body, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { matches: res.data.matches || [], namespace: config.namespace || "" };
}

async function opDelete(config, apiKey) {
  const host = config.indexHost;
  if (!host) return { success: false, error: "Pinecone: 'indexHost' is required.", skipped: true };

  const body = {};
  if (config.deleteAll === true) {
    body.deleteAll = true;
  } else {
    let ids = config.ids;
    if (typeof ids === "string") { try { ids = JSON.parse(ids); } catch { ids = [ids]; } }
    if (!Array.isArray(ids) || ids.length === 0) throw new Error("Pinecone delete: 'ids' must be a non-empty array (or set deleteAll: true).");
    body.ids = ids;
  }
  if (config.namespace) body.namespace = config.namespace;

  await axios.post(`${host}/vectors/delete`, body, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { deleted: true, namespace: config.namespace || "" };
}

async function opFetchById(config, apiKey) {
  const host = config.indexHost;
  if (!host) return { success: false, error: "Pinecone: 'indexHost' is required.", skipped: true };

  let ids = config.ids;
  if (typeof ids === "string") { try { ids = JSON.parse(ids); } catch { ids = [ids]; } }
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("Pinecone fetchById: 'ids' must be a non-empty array.");

  const params = new URLSearchParams();
  ids.forEach((id) => params.append("ids", id));
  if (config.namespace) params.set("namespace", config.namespace);

  const res = await axios.get(`${host}/vectors/fetch?${params.toString()}`, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { vectors: res.data.vectors || {}, namespace: config.namespace || "" };
}

const OPERATIONS = { upsert: opUpsert, query: opQuery, delete: opDelete, fetchById: opFetchById };

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "query";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Pinecone: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    try {
      return await handler(config, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};
