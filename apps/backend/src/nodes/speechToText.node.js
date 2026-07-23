import axios from "axios";
import FormData from "form-data";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";
import { assertSafeUrlResolved } from "../utils/ssrf.js";

export default {
  async run(config, input, context = {}) {
    const audioUrl = config.audioUrl || input.audioUrl || input.url || input.fileUrl || "";
    if (!audioUrl) return { success: false, error: "Speech to Text: 'audioUrl' is required.", skipped: true };
    await assertSafeUrlResolved(audioUrl);

    const provider = config.provider || "openai";
    const language = config.language || null;

    let apiKey;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Speech to Text");
      apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!apiKey) return { success: false, error: "Speech to Text: API key required.", skipped: true };

    // Download the audio file
    const audioRes = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 120000 });
    const audioBuffer = Buffer.from(audioRes.data);
    const contentType = audioRes.headers["content-type"] || "audio/mpeg";
    const ext = contentType.includes("wav") ? "wav" : contentType.includes("webm") ? "webm" : contentType.includes("ogg") ? "ogg" : "mp3";

    if (provider === "assemblyai") {
      // Upload to AssemblyAI
      const uploadRes = await axios.post("https://api.assemblyai.com/v2/upload", audioBuffer,
        { headers: { authorization: apiKey, "Content-Type": "application/octet-stream" }, timeout: 120000 }
      );
      // Request transcription
      const transcriptRes = await axios.post("https://api.assemblyai.com/v2/transcript",
        { audio_url: uploadRes.data.upload_url, language_code: language },
        { headers: { authorization: apiKey }, timeout: 120000 }
      );
      const id = transcriptRes.data.id;
      // Poll for completion (up to 2 min)
      for (let i = 0; i < 24; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const poll = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: { authorization: apiKey } });
        if (poll.data.status === "completed") return { text: poll.data.text, confidence: poll.data.confidence, words: poll.data.words, provider: "assemblyai" };
        if (poll.data.status === "error") throw new Error(`AssemblyAI error: ${poll.data.error}`);
      }
      throw new Error("AssemblyAI: transcription timed out after 2 minutes.");
    }

    // OpenAI Whisper
    const model = config.model || "whisper-1";
    const form = new FormData();
    form.append("file", audioBuffer, { filename: `audio.${ext}`, contentType });
    form.append("model", model);
    if (language) form.append("language", language);

    const { data } = await axios.post("https://api.openai.com/v1/audio/transcriptions", form,
      { headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() }, timeout: 120000 }
    );
    return { text: data.text, provider: "openai", model };
  },
};
