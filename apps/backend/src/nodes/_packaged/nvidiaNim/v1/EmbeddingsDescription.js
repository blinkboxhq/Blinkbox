/**
 * NVIDIA NIM — embeddings operation. Hits the dedicated /embeddings endpoint
 * (NIM embedding models require an input_type: query | passage).
 * Handler receives `(config, input, apiKey)`. Body moved verbatim from the monolith.
 */
import axios from "axios";
import { BASE, DEFAULT_EMBED_MODEL, authHeaders } from "../GenericFunctions.js";

async function opEmbeddings(config, input, apiKey) {
  const { model = DEFAULT_EMBED_MODEL } = config;
  const text = config.input || config.text || input?.text || input?.content || (typeof input === "string" ? input : null);
  if (!text) return { success: false, error: "NVIDIA NIM embeddings: 'input' text is required.", skipped: true };

  // NIM embedding models require an input_type (query | passage).
  const inputType = config.inputType || "passage";
  const res = await axios.post(`${BASE}/embeddings`, {
    input: Array.isArray(text) ? text : [String(text)],
    model,
    encoding_format: "float",
    input_type: inputType,
  }, { headers: authHeaders(apiKey), timeout: 60000 });

  const data = res.data;
  const vectors = (data.data || []).map(d => d.embedding);
  return {
    embedding: vectors[0],
    embeddings: vectors,
    dimensions: vectors[0]?.length,
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens || 0,
    provider: "nvidiaNim",
    operation: "embeddings",
  };
}

export const embeddingsOperations = {
  embeddings: opEmbeddings,
};
