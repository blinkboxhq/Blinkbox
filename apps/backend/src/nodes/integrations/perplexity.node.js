/**
 * PERPLEXITY NODE
 *
 * OpenAI-compatible. Search-augmented AI models.
 *
 * Output: { result, model, tokensUsed, provider: "perplexity" }
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API_URL = "https://api.perplexity.ai/chat/completions";

function handleError(err) {
  if (err.message?.startsWith("Perplexity")) throw err;
  if (err.response?.status === 401) throw new Error("Perplexity: Invalid API key.");
  if (err.response?.status === 403) throw new Error("Perplexity: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error("Perplexity: Resource not found — check the model name.");
  if (err.response?.status === 422) throw new Error(`Perplexity: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("Perplexity: Rate limit exceeded. Retry later.");
  if (err.response?.status === 400) throw new Error(`Perplexity: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status >= 500) throw new Error(`Perplexity: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Perplexity failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

export default {
  async run(config, input, context = {}) {
    const {
      model = "llama-3-sonar-large-32k-online",
      prompt,
      credentialId,
      outputFormat = "text",
      temperature = 0.7,
      maxTokens = 2000,
    } = config;

    if (!credentialId) return { success: false, error: "Perplexity: No credential selected.", skipped: true };
    if (!prompt) return { success: false, error: "Perplexity: 'prompt' is required.", skipped: true };

    let apiKey;
    try {
      apiKey = await getOAuthToken(credentialId, context.workspaceId, "Perplexity");
    } catch (e) {
      return { success: false, error: `Perplexity: Could not resolve credential — ${e.message}`, skipped: true };
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
        provider: "perplexity",
      };
    } catch (err) {
      handleError(err);
    }
  },
};
