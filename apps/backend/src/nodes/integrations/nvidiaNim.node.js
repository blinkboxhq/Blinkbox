import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE_URL = "https://integrate.api.nvidia.com/v1";

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "NvidiaNim");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const operation = config.operation || "chat";
    const model     = config.model || "meta/llama-3.3-70b-instruct";
    const apiKey    = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId));
    if (!apiKey) throw new Error("[nvidiaNim] NVIDIA NIM API key is required.");

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (operation === "embeddings") {
      const text = config.input || input?.text || input?.content;
      if (!text) throw new Error("[nvidiaNim] 'input' text is required for embeddings.");
      const res = await axios.post(`${BASE_URL}/embeddings`,
        { input: text, model, encoding_format: "float" },
        { headers, timeout: 60000 },
      );
      return {
        embeddings: res.data.data?.[0]?.embedding,
        model: res.data.model,
        usage: res.data.usage,
      };
    }

    if (operation === "vision") {
      const imageUrl = config.imageUrl || input?.imageUrl;
      const question = config.question || config.prompt || "Describe this image.";
      if (!imageUrl) throw new Error("[nvidiaNim] 'imageUrl' is required for vision.");
      const messages = [
        { role: "user", content: [
          { type: "text",      text: question },
          { type: "image_url", image_url: { url: imageUrl } },
        ]},
      ];
      const res = await axios.post(`${BASE_URL}/chat/completions`,
        { model, messages, max_tokens: parseInt(config.maxTokens || 1024) },
        { headers, timeout: 90000 },
      );
      const reply = res.data.choices?.[0]?.message?.content || "";
      return { reply, model: res.data.model, tokensUsed: res.data.usage?.total_tokens };
    }

    // chat / code / summarize — all use chat completions
    const prompt = config.prompt || input?.text || input?.content || input?.message;
    if (!prompt) throw new Error("[nvidiaNim] 'prompt' is required.");

    const systemMap = {
      code:      "You are an expert software engineer. Respond with clean, well-commented code.",
      summarize: "You are a concise summarizer. Provide a clear, structured summary.",
    };

    const messages = [
      { role: "system", content: systemMap[operation] || "You are a helpful assistant." },
      { role: "user",   content: prompt },
    ];

    const res = await axios.post(`${BASE_URL}/chat/completions`,
      { model, messages, max_tokens: parseInt(config.maxTokens || 1024), temperature: parseFloat(config.temperature || 0.7) },
      { headers, timeout: 90000 },
    );

    const reply = res.data.choices?.[0]?.message?.content || "";
    return {
      reply,
      model:      res.data.model,
      tokensUsed: res.data.usage?.total_tokens,
      operation,
    };
  },
};
