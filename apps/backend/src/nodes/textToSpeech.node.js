import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const text = config.text || input.text || input.content || "";
    if (!text) return { success: false, error: "Text to Speech: 'text' is required.", skipped: true };

    const provider = config.provider || "openai";

    let apiKey;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Text to Speech");
      apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!apiKey) return { success: false, error: "Text to Speech: API key required.", skipped: true };

    if (provider === "elevenlabs") {
      const voiceId = config.voiceId || "pNInz6obpgDQGcFmaJgB"; // default: Adam
      const { data } = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
        { text, model_id: config.model || "eleven_multilingual_v2", voice_settings: { stability: config.stability || 0.5, similarity_boost: config.similarityBoost || 0.75 } },
        { headers: { "xi-api-key": apiKey, "Content-Type": "application/json" }, responseType: "arraybuffer", timeout: 60000 }
      );
      const base64 = Buffer.from(data).toString("base64");
      return { audioBase64: base64, mimeType: "audio/mpeg", provider: "elevenlabs", voiceId };
    }

    // OpenAI TTS
    const { data } = await axios.post("https://api.openai.com/v1/audio/speech",
      { model: config.model || "tts-1", input: text, voice: config.voice || "alloy", response_format: "mp3", speed: config.speed || 1.0 },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, responseType: "arraybuffer", timeout: 60000 }
    );
    const base64 = Buffer.from(data).toString("base64");
    return { audioBase64: base64, mimeType: "audio/mpeg", provider: "openai", voice: config.voice || "alloy" };
  },
};
