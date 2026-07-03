/**
 * Gemini — model operations: embeddings, listModels (op).
 * Handlers receive `(config, input, apiKey)`.
 * Bodies moved verbatim from the monolith.
 */
import axios from "axios";
import { MODELS_URL } from "../GenericFunctions.js";

async function opEmbeddings(config, input, apiKey) {
  const { model = "gemini-embedding-001" } = config;
  const raw = config.text || input?.text || input?.content || (typeof input === "string" ? input : "");
  if (!raw) return { success: false, error: "Gemini embeddings: 'text' is required.", skipped: true };

  const texts = Array.isArray(raw) ? raw : [raw];
  const requests = texts.map(t => ({
    model: `models/${model}`,
    content: { parts: [{ text: String(t) }] },
    ...(config.dimensions ? { outputDimensionality: Number(config.dimensions) } : {}),
  }));

  const response = await axios.post(
    `${MODELS_URL}/${model}:batchEmbedContents`,
    { requests },
    { headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, timeout: 60000 },
  );

  const vectors = (response.data.embeddings || []).map(e => e.values);
  return {
    embeddings: Array.isArray(raw) ? vectors : vectors[0],
    dimensions: vectors[0]?.length || 0,
    count: vectors.length, model, provider: "gemini", operation: "embeddings",
  };
}

async function opListModels(config, input, apiKey) {
  const response = await axios.get(MODELS_URL, {
    headers: { "x-goog-api-key": apiKey }, timeout: 30000, params: { pageSize: 200 },
  });
  const models = (response.data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).some(x => x === "generateContent" || x === "embedContent"))
    .map(m => ({
      id: (m.name || "").replace(/^models\//, ""),
      displayName: m.displayName,
      inputTokenLimit: m.inputTokenLimit,
      outputTokenLimit: m.outputTokenLimit,
    }))
    .filter(m => m.id);
  return { models, count: models.length, provider: "gemini", operation: "listModels" };
}

export const modelOperations = {
  embeddings: opEmbeddings,
  listModels: opListModels,
};
