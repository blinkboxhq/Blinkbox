/**
 * ELEVENLABS — Voice, Model, User & History resources. listVoices preserved
 * verbatim from the monolith (now normalized to the (config, apiKey) signature);
 * getVoice, deleteVoice, editVoiceSettings, getDefaultVoiceSettings, listModels,
 * getUser, getSubscription, listHistory, getHistoryItem, deleteHistoryItem added
 * for parity. Handlers receive (config, apiKey).
 */
import axios from "axios";
import { BASE, authHeaders, jsonHeaders, num } from "../GenericFunctions.js";

async function opListVoices(config, apiKey) {
  const res = await axios.get(`${BASE}/voices`, { headers: authHeaders(apiKey), timeout: 10000 });
  return {
    voices: res.data.voices.map((v) => ({ voiceId: v.voice_id, name: v.name, category: v.category })),
    count: res.data.voices.length,
  };
}

async function opGetVoice(config, apiKey) {
  if (!config.voiceId) return { success: false, error: "ElevenLabs getVoice: 'voiceId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/voices/${encodeURIComponent(config.voiceId)}`, { headers: authHeaders(apiKey), timeout: 10000 });
  return res.data;
}

async function opDeleteVoice(config, apiKey) {
  if (!config.voiceId) return { success: false, error: "ElevenLabs deleteVoice: 'voiceId' is required.", skipped: true };
  await axios.delete(`${BASE}/voices/${encodeURIComponent(config.voiceId)}`, { headers: authHeaders(apiKey), timeout: 10000 });
  return { deleted: true, voiceId: config.voiceId };
}

async function opEditVoiceSettings(config, apiKey) {
  if (!config.voiceId) return { success: false, error: "ElevenLabs editVoiceSettings: 'voiceId' is required.", skipped: true };
  const body = {
    stability: num(config.stability, 0.5),
    similarity_boost: num(config.similarityBoost, 0.75),
  };
  if (config.style !== undefined) body.style = num(config.style, 0);
  if (config.useSpeakerBoost !== undefined) body.use_speaker_boost = config.useSpeakerBoost === true;
  await axios.post(`${BASE}/voices/${encodeURIComponent(config.voiceId)}/settings/edit`, body, { headers: jsonHeaders(apiKey), timeout: 10000 });
  return { updated: true, voiceId: config.voiceId, settings: body };
}

async function opGetDefaultVoiceSettings(config, apiKey) {
  const res = await axios.get(`${BASE}/voices/settings/default`, { headers: authHeaders(apiKey), timeout: 10000 });
  return res.data;
}

async function opListModels(config, apiKey) {
  const res = await axios.get(`${BASE}/models`, { headers: authHeaders(apiKey), timeout: 10000 });
  return { models: res.data ?? [], count: Array.isArray(res.data) ? res.data.length : 0 };
}

async function opGetUser(config, apiKey) {
  const res = await axios.get(`${BASE}/user`, { headers: authHeaders(apiKey), timeout: 10000 });
  return res.data;
}

async function opGetSubscription(config, apiKey) {
  const res = await axios.get(`${BASE}/user/subscription`, { headers: authHeaders(apiKey), timeout: 10000 });
  return res.data;
}

async function opListHistory(config, apiKey) {
  const params = { page_size: Math.min(num(config.pageSize, 100), 1000) };
  if (config.voiceId) params.voice_id = config.voiceId;
  if (config.startAfterHistoryItemId) params.start_after_history_item_id = config.startAfterHistoryItemId;
  const res = await axios.get(`${BASE}/history`, { headers: authHeaders(apiKey), params, timeout: 10000 });
  return { history: res.data.history ?? [], hasMore: res.data.has_more ?? false, lastHistoryItemId: res.data.last_history_item_id };
}

async function opGetHistoryItem(config, apiKey) {
  if (!config.historyItemId) return { success: false, error: "ElevenLabs getHistoryItem: 'historyItemId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/history/${encodeURIComponent(config.historyItemId)}`, { headers: authHeaders(apiKey), timeout: 10000 });
  return res.data;
}

async function opDeleteHistoryItem(config, apiKey) {
  if (!config.historyItemId) return { success: false, error: "ElevenLabs deleteHistoryItem: 'historyItemId' is required.", skipped: true };
  await axios.delete(`${BASE}/history/${encodeURIComponent(config.historyItemId)}`, { headers: authHeaders(apiKey), timeout: 10000 });
  return { deleted: true, historyItemId: config.historyItemId };
}

export const voiceOperations = {
  listVoices: opListVoices,
  getVoice: opGetVoice,
  deleteVoice: opDeleteVoice,
  editVoiceSettings: opEditVoiceSettings,
  getDefaultVoiceSettings: opGetDefaultVoiceSettings,
  listModels: opListModels,
  getUser: opGetUser,
  getSubscription: opGetSubscription,
  listHistory: opListHistory,
  getHistoryItem: opGetHistoryItem,
  deleteHistoryItem: opDeleteHistoryItem,
};
