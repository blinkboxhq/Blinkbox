import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";

const MODELS = ["gpt-4o", "gpt-4o-mini", "o4-mini"];

export default {
  async run(config, _input, context = {}) {
    const operation = config.operation || "generate";
    const model     = config.model     || MODELS[0];
    const maxTokens = parseInt(config.maxTokens) || 4000;
    const temp      = parseFloat(config.temperature ?? 0.2);

    const cred   = await resolveCredential(config.credentialId, context.workspaceId, "OpenAI");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const userMsg = buildUserMessage(operation, config);

    try {
      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        { model, max_tokens: maxTokens, temperature: temp,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS.codex },
            { role: "user",   content: userMsg },
          ] },
        { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
      );
      const text   = res.data.choices?.[0]?.message?.content || "";
      const tokens = res.data.usage?.total_tokens || 0;
      return buildOutput(text, res.data.model, tokens, operation, "codex");
    } catch (err) {
      if (err.response?.status === 401) throw new Error("Codex: Invalid API key.");
      if (err.response?.status === 429) throw new Error("Codex: Rate limit exceeded.");
      throw new Error(`Codex failed: ${err.response?.data?.error?.message || err.message}`);
    }
  },
};
