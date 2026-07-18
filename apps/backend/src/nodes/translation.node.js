import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const text = config.text || input.text || input.content || input.body || "";
    if (!text) return { success: false, error: "Translation: 'text' is required.", skipped: true };

    const target = config.targetLanguage || config.language || "en";
    const provider = config.provider || "openai";

    let apiKey;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Translation");
      apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }

    if (provider === "google") {
      if (!apiKey) return { success: false, error: "Translation (Google): API key required.", skipped: true };
      const { data } = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
        { q: text, target, format: "text" }, { timeout: 15000 }
      );
      const result = data.data.translations[0];
      return { translatedText: result.translatedText, detectedSourceLanguage: result.detectedSourceLanguage, targetLanguage: target, provider: "google" };
    }

    if (provider === "deepl") {
      if (!apiKey) return { success: false, error: "Translation (DeepL): API key required.", skipped: true };
      const base = apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
      const { data } = await axios.post(`${base}/v2/translate`,
        new URLSearchParams({ text, target_lang: target.toUpperCase() }),
        { headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
      );
      return { translatedText: data.translations[0].text, detectedSourceLanguage: data.translations[0].detected_source_language, targetLanguage: target, provider: "deepl" };
    }

    // Default: OpenAI or Anthropic
    if (!apiKey) return { success: false, error: "Translation: API key required.", skipped: true };

    if (provider === "anthropic") {
      const { data } = await axios.post("https://api.anthropic.com/v1/messages",
        { model: config.model || "claude-haiku-4-5-20251001", max_tokens: 2048, messages: [{ role: "user", content: `Translate the following text to ${target}. Return ONLY the translated text, nothing else:\n\n${text}` }] },
        { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, timeout: 30000 }
      );
      return { translatedText: data.content[0].text.trim(), targetLanguage: target, provider: "anthropic" };
    }

    // OpenAI
    const { data } = await axios.post("https://api.openai.com/v1/chat/completions",
      { model: config.model || "gpt-4o-mini", messages: [{ role: "system", content: "You are a professional translator. Return ONLY the translated text, nothing else." }, { role: "user", content: `Translate to ${target}:\n\n${text}` }] },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 }
    );
    return { translatedText: data.choices[0].message.content.trim(), targetLanguage: target, provider: "openai" };
  },
};
