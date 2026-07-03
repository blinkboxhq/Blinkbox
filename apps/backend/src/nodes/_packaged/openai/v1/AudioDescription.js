/**
 * OpenAI — audio operations: textToSpeech, transcribeAudio, translateAudio.
 * Handlers receive `(config, input, apiKey)`.
 * Bodies moved verbatim from the monolith.
 */
import axios from "axios";
import { BASE, resolveFileToBuffer } from "../GenericFunctions.js";

async function opTextToSpeech(config, input, apiKey) {
  const { model = "tts-1", voice = "alloy", format = "mp3", speed = 1 } = config;
  const text = config.text || config.prompt || input?.text || (typeof input === "string" ? input : "");
  if (!text) return { success: false, error: "OpenAI textToSpeech: 'text' is required.", skipped: true };

  const response = await axios.post(
    `${BASE}/audio/speech`,
    { model, input: String(text).substring(0, 4096), voice, response_format: format, speed: Number(speed) || 1 },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, responseType: "arraybuffer", timeout: 120000 },
  );

  const buf = Buffer.from(response.data);
  const mimeMap = { mp3: "audio/mpeg", opus: "audio/opus", aac: "audio/aac", flac: "audio/flac", wav: "audio/wav", pcm: "audio/pcm" };
  const contentType = mimeMap[format] || "audio/mpeg";
  const base64 = buf.toString("base64");
  return {
    filename: `openai-tts-${Date.now()}.${format}`,
    contentType,
    base64,
    dataUri: `data:${contentType};base64,${base64}`,
    sizeBytes: buf.length,
    model,
    provider: "openai",
    operation: "textToSpeech",
  };
}

async function opTranscribeAudio(config, input, apiKey) {
  const { model = "whisper-1", language } = config;
  const ref = config.fileInput || config.audioUrl || input?.audioUrl || input?.url || input?.dataUri || input?.base64;
  const audioBuffer = await resolveFileToBuffer(ref, { label: "audioUrl" });

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", audioBuffer, { filename: "audio.mp3", contentType: "audio/mpeg" });
  form.append("model", model);
  if (language) form.append("language", language);
  if (config.prompt) form.append("prompt", config.prompt);
  const wantTimestamps = config.timestamps === true || config.timestamps === "true";
  form.append("response_format", wantTimestamps ? "verbose_json" : "json");
  if (wantTimestamps) form.append("timestamp_granularities[]", "segment");

  const response = await axios.post(`${BASE}/audio/transcriptions`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  return {
    transcript: response.data.text || "",
    language: response.data.language || language || "auto",
    duration: response.data.duration,
    segments: response.data.segments,
    model,
    provider: "openai",
    operation: "transcribeAudio",
  };
}

async function opTranslateAudio(config, input, apiKey) {
  const ref = config.fileInput || config.audioUrl || input?.audioUrl || input?.url || input?.dataUri || input?.base64;
  const audioBuffer = await resolveFileToBuffer(ref, { label: "audioUrl" });

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", audioBuffer, { filename: "audio.mp3", contentType: "audio/mpeg" });
  form.append("model", "whisper-1");
  if (config.prompt) form.append("prompt", config.prompt);
  form.append("response_format", "json");

  const response = await axios.post(`${BASE}/audio/translations`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  return { translation: response.data.text || "", model: "whisper-1", provider: "openai", operation: "translateAudio" };
}

export const audioOperations = {
  textToSpeech: opTextToSpeech,
  transcribeAudio: opTranscribeAudio,
  translateAudio: opTranslateAudio,
};
