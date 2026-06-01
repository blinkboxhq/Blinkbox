import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";

const MODELS = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];

export default {
  async run(config, _input, context = {}) {
    const operation = config.operation || "generate";
    const model     = config.model     || MODELS[0];
    const maxTokens = parseInt(config.maxTokens) || 4000;
    const temp      = parseFloat(config.temperature ?? 0.2);

    if (!config.credentialId) {
      return { success: false, error: "Gemini CLI: No credential selected — pick a Gemini API key credential.", skipped: true };
    }
    let apiKey;
    try {
      apiKey = await getOAuthToken(config.credentialId, context.workspaceId, "Gemini");
    } catch (e) {
      return { success: false, error: `Gemini CLI: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const userMsg = buildUserMessage(operation, config);

    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          system_instruction: { parts: [{ text: SYSTEM_PROMPTS.gemini_cli }] },
          contents: [{ role: "user", parts: [{ text: userMsg }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: temp },
        },
        { headers: { "Content-Type": "application/json" }, timeout: 120000 },
      );
      const text   = res.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const tokens = (res.data.usageMetadata?.promptTokenCount || 0) + (res.data.usageMetadata?.candidatesTokenCount || 0);
      return buildOutput(text, model, tokens, operation, "gemini_cli");
    } catch (err) {
      if (err.response?.status === 400) throw new Error(`Gemini CLI: ${err.response.data?.error?.message || "Bad request"}`);
      if (err.response?.status === 403) throw new Error("Gemini CLI: Invalid API key.");
      if (err.response?.status === 429) throw new Error("Gemini CLI: Rate limit exceeded.");
      throw new Error(`Gemini CLI failed: ${err.response?.data?.error?.message || err.message}`);
    }
  },
};
