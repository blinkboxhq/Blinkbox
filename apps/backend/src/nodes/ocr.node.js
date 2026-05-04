import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const imageUrl = config.imageUrl || input.imageUrl || input.url || input.image || "";
    if (!imageUrl) return { success: false, error: "OCR: 'imageUrl' is required.", skipped: true };

    const provider = config.provider || "openai";
    let apiKey;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "OCR");
      apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!apiKey) return { success: false, error: "OCR: API key required.", skipped: true };

    const prompt = config.prompt || "Extract all text from this image. Return ONLY the extracted text, preserving formatting where possible.";

    if (provider === "anthropic") {
      // Download image and send as base64
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000 });
      const b64 = Buffer.from(imgRes.data).toString("base64");
      const mediaType = imgRes.headers["content-type"] || "image/jpeg";
      const { data } = await axios.post("https://api.anthropic.com/v1/messages",
        { model: config.model || "claude-haiku-4-5-20251001", max_tokens: 2048, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: b64 } }, { type: "text", text: prompt }] }] },
        { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, timeout: 60000 }
      );
      return { text: data.content[0].text, provider: "anthropic", model: config.model || "claude-haiku-4-5-20251001" };
    }

    // OpenAI GPT-4o Vision (default)
    const { data } = await axios.post("https://api.openai.com/v1/chat/completions",
      { model: config.model || "gpt-4o-mini", messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: imageUrl, detail: config.detail || "auto" } }, { type: "text", text: prompt }] }], max_tokens: 2048 },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000 }
    );
    return { text: data.choices[0].message.content, provider: "openai", model: config.model || "gpt-4o-mini", tokensUsed: data.usage?.total_tokens };
  },
};
