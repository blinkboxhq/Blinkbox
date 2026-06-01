/**
 * ELEVENLABS NODE
 * Operations: textToSpeech, listVoices
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.elevenlabs.io/v1";

function handleError(err) {
  if (err.message?.startsWith("ElevenLabs")) throw err;
  if (err.response?.status === 401) throw new Error("ElevenLabs: Invalid API key.");
  if (err.response?.status === 403) throw new Error("ElevenLabs: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error("ElevenLabs: Resource not found — check voice ID or endpoint.");
  if (err.response?.status === 422) throw new Error(`ElevenLabs: ${err.response?.data?.detail?.message || "Unprocessable entity."}`);
  if (err.response?.status === 429) throw new Error("ElevenLabs: Rate limit exceeded.");
  if (err.response?.status >= 500) throw new Error(`ElevenLabs: Server error (${err.response.status}) — try again later.`);
  throw new Error(`ElevenLabs failed: ${err.response?.status || err.code} — ${err.message}`);
}

async function opTextToSpeech(config, apiKey) {
  if (!config.text) return { success: false, error: "ElevenLabs textToSpeech: 'text' is required.", skipped: true };
  const voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM";
  const model = config.model || "eleven_monolingual_v1";

  const res = await axios.post(
    `${BASE}/text-to-speech/${voiceId}`,
    {
      text: config.text,
      model_id: model,
      voice_settings: {
        stability: parseFloat(config.stability ?? 0.5),
        similarity_boost: parseFloat(config.similarityBoost ?? 0.75),
      },
    },
    {
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      responseType: "arraybuffer",
      timeout: 30000,
    },
  );

  const audioBase64 = Buffer.from(res.data).toString("base64");
  return {
    audioBase64,
    mimeType: "audio/mpeg",
    voiceId,
    model,
    characterCount: config.text.length,
  };
}

async function opListVoices(apiKey) {
  const res = await axios.get(`${BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
    timeout: 10000,
  });
  return {
    voices: res.data.voices.map((v) => ({ voiceId: v.voice_id, name: v.name, category: v.category })),
    count: res.data.voices.length,
  };
}

const OPERATIONS = { textToSpeech: opTextToSpeech, listVoices: opListVoices };

export default {
  async run(config, input, context = {}) {
    const { credentialId } = config;

    if (!credentialId) return { success: false, error: "ElevenLabs: No credential selected.", skipped: true };

    const operation = config.operation || "textToSpeech";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`ElevenLabs: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    let apiKey;
    try {
      apiKey = await getOAuthToken(credentialId, context.workspaceId, "ElevenLabs");
    } catch (e) {
      return { success: false, error: `ElevenLabs: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return operation === "listVoices" ? await handler(apiKey) : await handler(config, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};
