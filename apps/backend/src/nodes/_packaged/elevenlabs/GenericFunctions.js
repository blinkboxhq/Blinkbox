/**
 * ELEVENLABS — shared primitives. Resolves the API-key credential and maps
 * errors verbatim. All handlers are normalized to (config, apiKey); the audio
 * endpoints set their own responseType. Auth uses the xi-api-key header.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://api.elevenlabs.io/v1";

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "ElevenLabs");
}

export function jsonHeaders(apiKey) {
  return { "xi-api-key": apiKey, "Content-Type": "application/json" };
}

export function authHeaders(apiKey) {
  return { "xi-api-key": apiKey };
}

export function num(v, fallback) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function handleError(err) {
  if (err.message?.startsWith("ElevenLabs")) throw err;
  if (err.response?.status === 401) throw new Error("ElevenLabs: Invalid API key.");
  if (err.response?.status === 403) throw new Error("ElevenLabs: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error("ElevenLabs: Resource not found — check voice ID or endpoint.");
  if (err.response?.status === 422) throw new Error(`ElevenLabs: ${err.response?.data?.detail?.message || "Unprocessable entity."}`);
  if (err.response?.status === 429) throw new Error("ElevenLabs: Rate limit exceeded.");
  if (err.response?.status >= 500) throw new Error(`ElevenLabs: Server error (${err.response.status}) — try again later.`);
  throw new Error(`ElevenLabs failed: ${err.response?.status || err.code} — ${err.message}`);
}
