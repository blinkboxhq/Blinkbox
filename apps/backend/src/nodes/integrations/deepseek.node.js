/**
 * DEEPSEEK NODE
 *
 * Dedicated DeepSeek node. Uses the OpenAI-compatible API format.
 *
 * Config:
 *   model        — "deepseek-chat" (default) | "deepseek-reasoner"
 *   prompt       — Instruction prompt (already expression-resolved)
 *   credentialId — Vault reference to DeepSeek API key (type: "bearer" or "api_key")
 *   outputFormat — "json" | "text" (default: "text")
 *   temperature  — 0-2 (default: 0.7)
 *   maxTokens    — Max response tokens (default: 2000)
 *
 * Output:
 *   { result, model, tokensUsed, provider: "deepseek" }
 */

import axios from "axios";
import Credential from "../../models/credential.model.js";
import { decrypt } from "../../utils/crypto.js";

const API_URL = "https://api.deepseek.com/chat/completions";

export default {
  async run(config, input, context = {}) {
    const {
      model = "deepseek-chat",
      prompt,
      credentialId,
      outputFormat = "text",
      temperature = 0.7,
      maxTokens = 2000,
    } = config;

    if (!prompt) throw new Error("DeepSeek: 'prompt' is required.");
    if (!credentialId)
      throw new Error("DeepSeek: 'credentialId' is required. Add your API key to the Vault.");

    // Vault: decrypt API key
    const query = { _id: credentialId };
    if (context.workspaceId) query.workspaceId = context.workspaceId;
    const cred = await Credential.findOne(query);
    if (!cred) throw new Error("DeepSeek: Credential not found in Vault.");

    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // Build messages
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
        provider: "deepseek",
      };
    } catch (err) {
      if (err.response?.status === 401) throw new Error("DeepSeek: Invalid API key.");
      if (err.response?.status === 429) throw new Error("DeepSeek: Rate limit exceeded. Retry later.");
      throw new Error(`DeepSeek failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
