import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";

const MODELS = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama-3.1-8b-instant"];

function handleError(err) {
  if (err.message?.startsWith("Groq")) throw err;
  if (err.response?.status === 400) throw new Error(`Groq: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 401) throw new Error("Groq: Invalid API key.");
  if (err.response?.status === 403) throw new Error("Groq: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error(`Groq: Resource not found — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`Groq: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("Groq: Rate limit exceeded. Retry later.");
  if (err.response?.status >= 500) throw new Error(`Groq: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Groq failed: ${err.response?.data?.error?.message || err.message}`);
}

export default {
  async run(config, _input, context = {}) {
    const operation = config.operation || "generate";
    const model     = config.model     || MODELS[0];
    const maxTokens = parseInt(config.maxTokens) || 4000;
    const temp      = parseFloat(config.temperature ?? 0.2);

    if (!config.credentialId) return { success: false, error: "Groq: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getOAuthToken(config.credentialId, context.workspaceId, "Groq");
    } catch (e) {
      return { success: false, error: `Groq: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const userMsg = buildUserMessage(operation, config);

    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        { model, max_tokens: maxTokens, temperature: temp,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS.groq },
            { role: "user",   content: userMsg },
          ] },
        { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000 },
      );
      const text   = res.data.choices?.[0]?.message?.content || "";
      const tokens = res.data.usage?.total_tokens || 0;
      return buildOutput(text, res.data.model, tokens, operation, "groq");
    } catch (err) {
      handleError(err);
    }
  },
};
