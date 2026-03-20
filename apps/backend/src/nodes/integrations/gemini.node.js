/**
 * GEMINI NODE
 *
 * Dedicated Google Gemini node via the Generative Language API.
 *
 * Config:
 *   model        — "gemini-2.0-flash" (default) | "gemini-1.5-pro" | any valid model
 *   prompt       — Instruction prompt (already expression-resolved)
 *   credentialId — Vault reference to Google AI API key (type: "api_key")
 *   outputFormat — "json" | "text" (default: "text")
 *   temperature  — 0-2 (default: 0.7)
 *   maxTokens    — Max response tokens (default: 2000)
 *
 * Output:
 *   { result, model, tokensUsed, provider: "gemini" }
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const {
      model = "gemini-2.0-flash",
      prompt,
      credentialId,
      outputFormat = "text",
      temperature = 0.7,
      maxTokens = 2000,
    } = config;

    if (!prompt) throw new Error("Gemini: 'prompt' is required.");
    // Vault: resolve + decrypt API key
    const cred = await resolveCredential(credentialId, context.workspaceId, "Gemini");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // Build content
    const inputSummary =
      typeof input === "string"
        ? input
        : JSON.stringify(input, null, 2).substring(0, 15000);

    const systemInstruction =
      outputFormat === "json"
        ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
        : "You are a helpful assistant. Respond clearly and concisely.";

    const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post(
        apiUrl,
        {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            ...(outputFormat === "json" && { responseMimeType: "application/json" }),
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 120000,
          maxContentLength: 10 * 1024 * 1024,
        },
      );

      const candidate = response.data.candidates?.[0];
      let result = candidate?.content?.parts?.[0]?.text || "";

      const tokensUsed =
        (response.data.usageMetadata?.promptTokenCount || 0) +
        (response.data.usageMetadata?.candidatesTokenCount || 0);

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
        model,
        tokensUsed,
        provider: "gemini",
      };
    } catch (err) {
      if (err.response?.status === 400) throw new Error(`Gemini: Bad request — ${err.response?.data?.error?.message || err.message}`);
      if (err.response?.status === 403) throw new Error("Gemini: Invalid API key or access denied.");
      if (err.response?.status === 429) throw new Error("Gemini: Rate limit exceeded. Retry later.");
      throw new Error(`Gemini failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
