/**
 * AI AGENT NODE — The Brain
 *
 * Takes unstructured data (e.g., scraped Markdown) + a natural language prompt,
 * and returns perfectly structured JSON via OpenAI or Anthropic APIs.
 *
 * Config:
 *   provider       — "openai" (default) | "anthropic"
 *   model          — Model ID (default: "gpt-4o-mini" / "claude-sonnet-4-20250514")
 *   prompt         — The instruction prompt (already expression-resolved)
 *   credentialId   — Reference to encrypted API key in the Vault
 *   outputFormat   — "json" (default) | "text"
 *   temperature    — 0-2 (default: 0.3 for structured output)
 *   maxTokens      — Max response tokens (default: 2000)
 *
 * Input:
 *   The full $json from the previous node is passed as context.
 *   The AI sees both the prompt and the input data.
 *
 * Output:
 *   { result: <parsed JSON or text>, model, tokensUsed, provider }
 */

import axios from "axios";
import Credential from "../models/credential.model.js";
import { decrypt } from "../utils/crypto.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export default {
  async run(config, input, context = {}) {
    const {
      provider = "openai",
      model,
      prompt,
      credentialId,
      outputFormat = "json",
      temperature = 0.3,
      maxTokens = 2000,
    } = config;

    if (!prompt) throw new Error("AI Agent: 'prompt' is required.");
    if (!credentialId)
      throw new Error(
        "AI Agent: 'credentialId' is required. Add your API key to the Vault.",
      );

    // Decrypt the API key from the Vault
    const query = { _id: credentialId };
    if (context.workspaceId) query.workspaceId = context.workspaceId;
    const cred = await Credential.findOne(query);
    if (!cred) throw new Error("AI Agent: Credential not found in Vault.");

    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // Build the context message from input data
    const inputSummary =
      typeof input === "string"
        ? input
        : JSON.stringify(input, null, 2).substring(0, 15000); // Cap at 15KB

    const systemMessage =
      outputFormat === "json"
        ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
        : "You are a helpful assistant. Respond clearly and concisely.";

    const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary}`;

    let result;

    if (provider === "anthropic") {
      result = await callAnthropic(
        apiKey,
        model || "claude-sonnet-4-20250514",
        systemMessage,
        userMessage,
        temperature,
        maxTokens,
      );
    } else {
      result = await callOpenAI(
        apiKey,
        model || "gpt-4o-mini",
        systemMessage,
        userMessage,
        temperature,
        maxTokens,
      );
    }

    // Parse JSON output if requested
    let parsed = result.text;
    if (outputFormat === "json") {
      try {
        parsed = JSON.parse(result.text);
      } catch {
        // If the AI returned markdown-fenced JSON, strip the fences
        const stripped = result.text
          .replace(/^```json?\n?/i, "")
          .replace(/\n?```$/i, "")
          .trim();
        try {
          parsed = JSON.parse(stripped);
        } catch {
          // Return raw text if JSON parsing fails
          parsed = result.text;
        }
      }
    }

    return {
      result: parsed,
      model: result.model,
      tokensUsed: result.tokensUsed,
      provider,
    };
  },
};

async function callOpenAI(apiKey, model, system, user, temperature, maxTokens) {
  const response = await axios.post(
    OPENAI_URL,
    {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
      maxContentLength: 10 * 1024 * 1024,
    },
  );

  const choice = response.data.choices?.[0];
  return {
    text: choice?.message?.content || "",
    model: response.data.model,
    tokensUsed: response.data.usage?.total_tokens || 0,
  };
}

async function callAnthropic(
  apiKey,
  model,
  system,
  user,
  temperature,
  maxTokens,
) {
  const response = await axios.post(
    ANTHROPIC_URL,
    {
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      temperature,
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      timeout: 60000,
      maxContentLength: 10 * 1024 * 1024,
    },
  );

  const content = response.data.content?.[0];
  return {
    text: content?.text || "",
    model: response.data.model,
    tokensUsed:
      (response.data.usage?.input_tokens || 0) +
      (response.data.usage?.output_tokens || 0),
  };
}
