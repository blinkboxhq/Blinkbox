/**
 * PINECONE — Vector resource. upsert / query / delete / fetchById preserved
 * verbatim from the monolith; update, describeIndexStats and listVectors added
 * for parity with the data-plane API. Handlers receive (config, apiKey).
 */
import axios from "axios";
import { assertIndexHost, buildHeaders, parseArray, parseObject } from "../GenericFunctions.js";
import { assertSafeUrlResolved } from "../../../../utils/ssrf.js";

async function opUpsert(config, apiKey) {
  let vectors = config.vectors;
  if (typeof vectors === "string") { try { vectors = JSON.parse(vectors); } catch { vectors = []; } }
  if (!Array.isArray(vectors) || vectors.length === 0) throw new Error("Pinecone upsert: 'vectors' must be a non-empty array.");

  const host = config.indexHost;
  await assertIndexHost(host);

  const body = { vectors };
  if (config.namespace) body.namespace = config.namespace;

  const res = await axios.post(`${host}/vectors/upsert`, body, { headers: buildHeaders(apiKey), timeout: 30000 });
  return { upsertedCount: res.data.upsertedCount ?? vectors.length, namespace: config.namespace || "" };
}

async function opQuery(config, apiKey) {
  const host = config.indexHost;
  if (!host) return { success: false, error: "Pinecone: 'indexHost' is required.", skipped: true };
  await assertSafeUrlResolved(host);

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
  await assertSafeUrlResolved(host);

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
  await assertSafeUrlResolved(host);

  let ids = config.ids;
  if (typeof ids === "string") { try { ids = JSON.parse(ids); } catch { ids = [ids]; } }
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("Pinecone fetchById: 'ids' must be a non-empty array.");

  const params = new URLSearchParams();
  ids.forEach((id) => params.append("ids", id));
  if (config.namespace) params.set("namespace", config.namespace);

  const res = await axios.get(`${host}/vectors/fetch?${params.toString()}`, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { vectors: res.data.vectors || {}, namespace: config.namespace || "" };
}

async function opUpdate(config, apiKey) {
  const host = config.indexHost;
  if (!host) return { success: false, error: "Pinecone: 'indexHost' is required.", skipped: true };
  await assertSafeUrlResolved(host);
  if (!config.id) return { success: false, error: "Pinecone update: 'id' is required.", skipped: true };

  const body = { id: config.id };
  const values = parseArray(config.values, null);
  if (Array.isArray(values) && values.length) body.values = values;
  const setMetadata = parseObject(config.setMetadata);
  if (setMetadata) body.setMetadata = setMetadata;
  if (config.namespace) body.namespace = config.namespace;

  await axios.post(`${host}/vectors/update`, body, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { updated: true, id: config.id, namespace: config.namespace || "" };
}

async function opDescribeIndexStats(config, apiKey) {
  const host = config.indexHost;
  if (!host) return { success: false, error: "Pinecone: 'indexHost' is required.", skipped: true };
  await assertSafeUrlResolved(host);

  const body = {};
  const filter = parseObject(config.filter);
  if (filter) body.filter = filter;

  const res = await axios.post(`${host}/describe_index_stats`, body, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { stats: res.data, namespaces: res.data?.namespaces || {}, dimension: res.data?.dimension, totalVectorCount: res.data?.totalVectorCount };
}

async function opListVectors(config, apiKey) {
  const host = config.indexHost;
  if (!host) return { success: false, error: "Pinecone: 'indexHost' is required.", skipped: true };
  await assertSafeUrlResolved(host);

  const params = new URLSearchParams();
  if (config.namespace) params.set("namespace", config.namespace);
  if (config.prefix) params.set("prefix", config.prefix);
  params.set("limit", String(parseInt(config.limit) || 100));
  if (config.paginationToken) params.set("paginationToken", config.paginationToken);

  const res = await axios.get(`${host}/vectors/list?${params.toString()}`, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { vectors: res.data.vectors || [], pagination: res.data.pagination || null, namespace: config.namespace || "" };
}

export const vectorOperations = {
  upsert: opUpsert,
  query: opQuery,
  delete: opDelete,
  fetchById: opFetchById,
  update: opUpdate,
  describeIndexStats: opDescribeIndexStats,
  listVectors: opListVectors,
};
