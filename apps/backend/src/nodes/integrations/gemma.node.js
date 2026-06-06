import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE_URL = "https://integrate.api.nvidia.com/v1";
const VISION_MODELS = new Set([
  "google/gemma-4-31b-it",
  "google/gemma-3-27b-it",
  "google/gemma-3n-e4b-it",
  "google/gemma-3n-e2b-it",
]);

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "NvidiaNim");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const operation = config.operation || "chat";
    const model     = config.model || "google/gemma-4-31b-it";
    const apiKey    = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId));
    if (!apiKey) throw new Error("[gemma] NVIDIA NIM API key is required.");

    const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

    if (operation === "vision") {
      if (!VISION_MODELS.has(model)) throw new Error(`[gemma] Model "${model}" does not support vision.`);
      const imageUrl = config.imageUrl || input?.imageUrl;
      if (!imageUrl) throw new Error("[gemma] 'imageUrl' is required for vision.");
      const prompt = config.prompt || "Describe this image in detail.";
      const res = await axios.post(`${BASE_URL}/chat/completions`, {
        model,
        messages: [{ role: "user", content: [
          { type: "text",      text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ]}],
        max_tokens: parseInt(config.maxTokens || 1024),
      }, { headers, timeout: 90000 });
      return {
        reply:      res.data.choices?.[0]?.message?.content || "",
        model:      res.data.model,
        tokensUsed: res.data.usage?.total_tokens,
      };
    }

    const prompt = config.prompt || input?.text || input?.content || input?.message;
    if (!prompt) throw new Error("[gemma] 'prompt' is required.");

    const systemPrompt = operation === "code"
      ? "You are an expert software engineer. Respond with clean, well-commented code."
      : "You are a helpful assistant.";

    const res = await axios.post(`${BASE_URL}/chat/completions`, {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: prompt },
      ],
      max_tokens:  parseInt(config.maxTokens || 1024),
      temperature: parseFloat(config.temperature || 0.7),
    }, { headers, timeout: 90000 });

    return {
      reply:      res.data.choices?.[0]?.message?.content || "",
      model:      res.data.model,
      tokensUsed: res.data.usage?.total_tokens,
      operation,
    };
  },
};
