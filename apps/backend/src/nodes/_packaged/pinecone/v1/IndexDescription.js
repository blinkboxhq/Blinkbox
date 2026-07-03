/**
 * PINECONE — Index (control-plane) resource. New for parity: listIndexes,
 * describeIndex, createIndex, deleteIndex against the fixed control-plane host
 * https://api.pinecone.io (not user-supplied, so no SSRF guard needed).
 * Handlers receive (config, apiKey).
 */
import axios from "axios";
import { buildHeaders } from "../GenericFunctions.js";

const CONTROL_PLANE = "https://api.pinecone.io";

async function opListIndexes(_config, apiKey) {
  const res = await axios.get(`${CONTROL_PLANE}/indexes`, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { indexes: res.data?.indexes || [], count: res.data?.indexes?.length ?? 0 };
}

async function opDescribeIndex(config, apiKey) {
  if (!config.indexName) return { success: false, error: "Pinecone describeIndex: 'indexName' is required.", skipped: true };
  const res = await axios.get(`${CONTROL_PLANE}/indexes/${encodeURIComponent(config.indexName)}`, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { index: res.data, host: res.data?.host, dimension: res.data?.dimension, metric: res.data?.metric, status: res.data?.status };
}

async function opCreateIndex(config, apiKey) {
  if (!config.indexName) return { success: false, error: "Pinecone createIndex: 'indexName' is required.", skipped: true };
  const dimension = parseInt(config.dimension);
  if (!Number.isInteger(dimension) || dimension <= 0) return { success: false, error: "Pinecone createIndex: 'dimension' must be a positive integer.", skipped: true };
  const body = {
    name: config.indexName,
    dimension,
    metric: config.metric || "cosine",
    spec: {
      serverless: {
        cloud: config.cloud || "aws",
        region: config.region || "us-east-1",
      },
    },
  };
  const res = await axios.post(`${CONTROL_PLANE}/indexes`, body, { headers: buildHeaders(apiKey), timeout: 30000 });
  return { created: true, index: res.data, host: res.data?.host, name: config.indexName };
}

async function opDeleteIndex(config, apiKey) {
  if (!config.indexName) return { success: false, error: "Pinecone deleteIndex: 'indexName' is required.", skipped: true };
  await axios.delete(`${CONTROL_PLANE}/indexes/${encodeURIComponent(config.indexName)}`, { headers: buildHeaders(apiKey), timeout: 15000 });
  return { deleted: true, name: config.indexName };
}

export const indexOperations = {
  listIndexes: opListIndexes,
  describeIndex: opDescribeIndex,
  createIndex: opCreateIndex,
  deleteIndex: opDeleteIndex,
};
