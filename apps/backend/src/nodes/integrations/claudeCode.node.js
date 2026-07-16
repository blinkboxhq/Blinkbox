import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";

const MODELS = ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5"];

export default {
  async run(config, _input, context = {}) {
    const operation = config.operation || "generate";
    const model     = config.model     || MODELS[0];
    const maxTokens = parseInt(config.maxTokens) || 4000;
    const temp      = parseFloat(config.temperature ?? 0.2);

    if (!config.credentialId) {
      return { success: false, error: "Claude Code: No credential selected — pick an Anthropic API key credential.", skipped: true };
    }
    let apiKey;
    try {
      apiKey = await getOAuthToken(config.credentialId, context.workspaceId, "Anthropic");
    } catch (e) {
      return { success: false, error: `Claude Code: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const userMsg = buildUserMessage(operation, config);

    try {
      const res = await axios.post(
        "https://api.anthropic.com/v1/messages",
        { model, max_tokens: maxTokens, temperature: temp,
          system: SYSTEM_PROMPTS.claude_code,
          messages: [{ role: "user", content: userMsg }] },
        { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, timeout: 120000 },
      );
      const text   = res.data.content?.[0]?.text || "";
      const tokens = (res.data.usage?.input_tokens || 0) + (res.data.usage?.output_tokens || 0);
      return buildOutput(text, res.data.model, tokens, operation, "claude_code");
    } catch (err) {
      if (err.response?.status === 401) throw new Error("Claude Code: Invalid API key.");
      if (err.response?.status === 429) throw new Error("Claude Code: Rate limit exceeded.");
      throw new Error(`Claude Code failed: ${err.response?.data?.error?.message || err.message}`);
    }
  },
};
