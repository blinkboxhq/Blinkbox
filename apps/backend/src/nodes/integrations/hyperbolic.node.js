/**
 * HYPERBOLIC NODE
 *
 * OpenAI-compatible. Decentralized GPU inference.
 *
 * Output: { result, model, tokensUsed, provider: "hyperbolic" }
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const API_URL = "https://api.hyperbolic.xyz/v1/chat/completions";

export default {
  async run(config, input, context = {}) {
    const {
      model = "meta-llama/Meta-Llama-3-70B-Instruct",
      prompt,
      credentialId,
      outputFormat = "text",
      temperature = 0.7,
      maxTokens = 2000,
    } = config;

    if (!prompt) throw new Error("Hyperbolic: 'prompt' is required.");
    const cred = await resolveCredential(credentialId, context.workspaceId, "Hyperbolic");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const inputSummary =
      typeof input === "string"
        ? input
        : JSON.stringify(input, null, 2).substring(0, 15000);

    const systemMessage =
      outputFormat === "json"
        ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
        : "You are a helpful assistant. Respond clearly and concisely.";

    const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary}`;

    try {
      const response = await axios.post(
        API_URL,
        {
          model,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
          ...(outputFormat === "json" && { response_format: { type: "json_object" } }),
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 120000,
          maxContentLength: 10 * 1024 * 1024,
        },
      );

      const choice = response.data.choices?.[0];
      let result = choice?.message?.content || "";

      if (outputFormat === "json") {
        try {
          result = JSON.parse(result);
        } catch {
          const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
          try { result = JSON.parse(stripped); } catch { /* return raw text */ }
        }
      }

      return {
        result,
        model: response.data.model || model,
        tokensUsed: response.data.usage?.total_tokens || 0,
        provider: "hyperbolic",
      };
    } catch (err) {
      if (err.response?.status === 401) throw new Error("Hyperbolic: Invalid API key.");
      if (err.response?.status === 429) throw new Error("Hyperbolic: Rate limit exceeded. Retry later.");
      throw new Error(`Hyperbolic failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
