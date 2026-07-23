/**
 * OpenAI — model operations: listModels (op), fineTune.
 * Handlers receive `(config, input, apiKey)`.
 * Bodies moved verbatim from the monolith.
 */
import axios from "axios";
import { BASE } from "../GenericFunctions.js";

async function opListModels(config, input, apiKey) {
  const response = await axios.get(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000,
  });
  let ids = (response.data.data || []).map((m) => m.id).filter(Boolean);
  const filter = config.filter || "all";
  if (filter === "gpt") ids = ids.filter((id) => id.startsWith("gpt") || id.startsWith("o1") || id.startsWith("o3"));
  else if (filter === "embedding") ids = ids.filter((id) => id.includes("embedding"));
  else if (filter === "image") ids = ids.filter((id) => id.includes("image") || id.startsWith("dall-e"));
  ids.sort();
  return { models: ids, count: ids.length, provider: "openai", operation: "listModels" };
}

async function opFineTune(config, input, apiKey) {
  const trainingFile = config.trainingFile || input?.trainingFile;
  if (!trainingFile) return { success: false, error: "OpenAI fineTune: 'trainingFile' (uploaded file ID) is required.", skipped: true };
  const body = { model: config.model || "gpt-4o-mini-2024-07-18", training_file: trainingFile };
  if (config.validationFile) body.validation_file = config.validationFile;
  if (config.suffix) body.suffix = config.suffix;

  const response = await axios.post(`${BASE}/fine_tuning/jobs`, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000,
  });
  const job = response.data || {};
  return { jobId: job.id, status: job.status, model: job.model, fineTunedModel: job.fine_tuned_model || null, provider: "openai", operation: "fineTune" };
}

export const modelOperations = {
  listModels: opListModels,
  fineTune: opFineTune,
};
