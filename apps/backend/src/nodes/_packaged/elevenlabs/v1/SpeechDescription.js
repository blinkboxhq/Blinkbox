/**
 * ELEVENLABS — Speech resource. textToSpeech preserved verbatim from the
 * monolith; textToSpeechStream, speechToSpeech and soundGeneration added for
 * parity, all returning base64 audio. Handlers receive (config, apiKey).
 */
import axios from "axios";
import { BASE, jsonHeaders, num } from "../GenericFunctions.js";

async function opTextToSpeech(config, apiKey) {
  if (!config.text) return { success: false, error: "ElevenLabs textToSpeech: 'text' is required.", skipped: true };
  const voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM";
  const model = config.model || "eleven_monolingual_v1";

  const res = await axios.post(
    `${BASE}/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      text: config.text,
      model_id: model,
      voice_settings: {
        stability: num(config.stability, 0.5),
        similarity_boost: num(config.similarityBoost, 0.75),
      },
    },
    {
      headers: jsonHeaders(apiKey),
      responseType: "arraybuffer",
      timeout: 120000,
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

async function opTextToSpeechStream(config, apiKey) {
  if (!config.text) return { success: false, error: "ElevenLabs textToSpeechStream: 'text' is required.", skipped: true };
  const voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM";
  const model = config.model || "eleven_monolingual_v1";
  const res = await axios.post(
    `${BASE}/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
    {
      text: config.text,
      model_id: model,
      voice_settings: {
        stability: num(config.stability, 0.5),
        similarity_boost: num(config.similarityBoost, 0.75),
      },
    },
    { headers: jsonHeaders(apiKey), responseType: "arraybuffer", timeout: 120000 },
  );
  return {
    audioBase64: Buffer.from(res.data).toString("base64"),
    mimeType: "audio/mpeg",
    voiceId,
    model,
    characterCount: config.text.length,
  };
}

async function opSpeechToSpeech(config, apiKey) {
  if (!config.audioBase64) return { success: false, error: "ElevenLabs speechToSpeech: 'audioBase64' is required.", skipped: true };
  const voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM";
  const model = config.model || "eleven_english_sts_v2";
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("audio", Buffer.from(config.audioBase64, "base64"), { filename: "input.mp3", contentType: "audio/mpeg" });
  form.append("model_id", model);
  const res = await axios.post(`${BASE}/speech-to-speech/${encodeURIComponent(voiceId)}`, form, {
    headers: { "xi-api-key": apiKey, ...form.getHeaders() },
    responseType: "arraybuffer",
    timeout: 120000,
  });
  return { audioBase64: Buffer.from(res.data).toString("base64"), mimeType: "audio/mpeg", voiceId, model };
}

async function opSoundGeneration(config, apiKey) {
  if (!config.text) return { success: false, error: "ElevenLabs soundGeneration: 'text' is required.", skipped: true };
  const body = { text: config.text };
  if (config.durationSeconds) body.duration_seconds = num(config.durationSeconds, undefined);
  if (config.promptInfluence !== undefined) body.prompt_influence = num(config.promptInfluence, 0.3);
  const res = await axios.post(`${BASE}/sound-generation`, body, {
    headers: jsonHeaders(apiKey),
    responseType: "arraybuffer",
    timeout: 120000,
  });
  return { audioBase64: Buffer.from(res.data).toString("base64"), mimeType: "audio/mpeg", characterCount: config.text.length };
}

export const speechOperations = {
  textToSpeech: opTextToSpeech,
  textToSpeechStream: opTextToSpeechStream,
  speechToSpeech: opSpeechToSpeech,
  soundGeneration: opSoundGeneration,
};
