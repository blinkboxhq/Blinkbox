/**
 * XAI (GROK) NODE
 *
 * OpenAI-compatible. xAI's Grok models.
 *
 * Output: { result, model, tokensUsed, provider: "xai" }
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API_URL = "https://api.x.ai/v1/chat/completions";

function handleError(err) {
  if (err.message?.startsWith("xAI")) throw err;
  if (err.response?.status === 401) throw new Error("xAI: Invalid API key.");
  if (err.response?.status === 403) throw new Error("xAI: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error("xAI: Resource not found — check the model name.");
  if (err.response?.status === 422) throw new Error(`xAI: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("xAI: Rate limit exceeded. Retry later.");
  if (err.response?.status === 400) throw new Error(`xAI: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status >= 500) throw new Error(`xAI: Server error (${err.response.status}) — try again later.`);
  throw new Error(`xAI failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

export default {
  async run(config, input, context = {}) {
    const {
      model = "grok-beta",
      prompt,
      credentialId,
      outputFormat = "text",
      temperature = 0.7,
      maxTokens = 2000,
    } = config;

    if (!credentialId) return { success: false, error: "xAI: No credential selected.", skipped: true };
    if (!prompt) return { success: false, error: "xAI: 'prompt' is required.", skipped: true };

    let apiKey;
    try {
      apiKey = await getOAuthToken(credentialId, context.workspaceId, "xAI");
    } catch (e) {
      return { success: false, error: `xAI: Could not resolve credential — ${e.message}`, skipped: true };
    }

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
          timeout: 30000,
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
        provider: "xai",
      };
    } catch (err) {
      handleError(err);
    }
  },
};
