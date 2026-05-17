import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";

export default {
  async run(config, _input, context = {}) {
    const operation = config.operation || "generate";
    const maxTokens = parseInt(config.maxTokens) || 4000;
    const temp      = parseFloat(config.temperature ?? 0.2);

    const apiKey = await getOAuthToken(config.credentialId, context.workspaceId, "GitHub");

    const userMsg = buildUserMessage(operation, config);

    try {
      const res = await axios.post(
        "https://api.githubcopilot.com/chat/completions",
        { model: "gpt-4o", max_tokens: maxTokens, temperature: temp,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS.github_copilot },
            { role: "user",   content: userMsg },
          ] },
        { headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Copilot-Integration-Id": "vscode-chat",
            "Editor-Version": "vscode/1.85.0",
          }, timeout: 120000 },
      );
      const text   = res.data.choices?.[0]?.message?.content || "";
      const tokens = res.data.usage?.total_tokens || 0;
      return buildOutput(text, "gpt-4o", tokens, operation, "github_copilot");
    } catch (err) {
      if (err.response?.status === 401) throw new Error("GitHub Copilot: Invalid token. Ensure your PAT has the 'copilot' scope.");
      if (err.response?.status === 403) throw new Error("GitHub Copilot: Access denied. Your account may not have Copilot enabled.");
      if (err.response?.status === 429) throw new Error("GitHub Copilot: Rate limit exceeded.");
      throw new Error(`GitHub Copilot failed: ${err.response?.data?.error?.message || err.message}`);
    }
  },
};
