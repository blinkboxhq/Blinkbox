/**
 * ANTHROPIC NODE
 *
 * Dedicated Anthropic Claude node.
 *
 * Config:
 *   model        — "claude-sonnet-4-20250514" (default) | "claude-haiku-4-5-20251001" | any valid model
 *   prompt       — Instruction prompt (already expression-resolved)
 *   credentialId — Vault reference to Anthropic API key (type: "api_key")
 *   outputFormat — "json" | "text" (default: "text")
 *   temperature  — 0-1 (default: 0.7)
 *   maxTokens    — Max response tokens (default: 2000)
 *
 * Output:
 *   { result, model, tokensUsed, provider: "anthropic" }
 */

import axios from "axios";
import Credential from "../../models/credential.model.js";
import { decrypt } from "../../utils/crypto.js";

const API_URL = "https://api.anthropic.com/v1/messages";

export default {
  async run(config, input, context = {}) {
    const {
      model = "claude-sonnet-4-20250514",
      prompt,
      credentialId,
      outputFormat = "text",
      temperature = 0.7,
      maxTokens = 2000,
    } = config;

    if (!prompt) throw new Error("Anthropic: 'prompt' is required.");
    if (!credentialId)
      throw new Error("Anthropic: 'credentialId' is required. Add your API key to the Vault.");

    // Vault: decrypt API key
    const query = { _id: credentialId };
    if (context.workspaceId) query.workspaceId = context.workspaceId;
    const cred = await Credential.findOne(query);
    if (!cred) throw new Error("Anthropic: Credential not found in Vault.");

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
          max_tokens: maxTokens,
          system: systemMessage,
          messages: [{ role: "user", content: userMessage }],
          temperature,
        },
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          timeout: 120000,
          maxContentLength: 10 * 1024 * 1024,
        },
      );

      const content = response.data.content?.[0];
      let result = content?.text || "";

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
        model: response.data.model,
        tokensUsed:
          (response.data.usage?.input_tokens || 0) +
          (response.data.usage?.output_tokens || 0),
        provider: "anthropic",
      };
    } catch (err) {
      if (err.response?.status === 401) throw new Error("Anthropic: Invalid API key.");
      if (err.response?.status === 429) throw new Error("Anthropic: Rate limit exceeded. Retry later.");
      throw new Error(`Anthropic failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
