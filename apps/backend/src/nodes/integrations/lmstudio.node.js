import axios from "axios";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";
import { LM_STUDIO_BASE_URL } from "../../config/env.js";

export default {
  async run(config) {
    const operation = config.operation || "generate";
    const model     = config.customModel?.trim() || config.model || "local-model";
    const baseUrl   = (config.baseUrl  || LM_STUDIO_BASE_URL).replace(/\/$/, "").replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, "");
    const maxTokens = parseInt(config.maxTokens) || 4000;
    const temp      = parseFloat(config.temperature ?? 0.2);
    const systemPrompt = config.systemPrompt || SYSTEM_PROMPTS.lmstudio;

    const userMsg = buildUserMessage(operation, config);

    try {
      const res = await axios.post(
        `${baseUrl}/v1/chat/completions`,
        { model, max_tokens: maxTokens, temperature: temp,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userMsg },
          ] },
        { headers: { "Content-Type": "application/json" }, timeout: 120000 },
      );
      const text = res.data.choices?.[0]?.message?.content || "";
      return buildOutput(text, model, res.data.usage?.total_tokens ?? null, operation, "lmstudio");
    } catch (err) {
      if (err.code === "ECONNREFUSED") throw new Error(`LM Studio: Cannot connect to ${baseUrl}. Is LM Studio running with the server enabled?`);
      if (err.code === "ETIMEDOUT" || err.code === "ECONNRESET") throw new Error(`LM Studio: Connection to ${baseUrl} timed out or was reset.`);
      const detail = err.response?.data?.error?.message || err.response?.data?.error || err.message;
      throw new Error(`LM Studio failed: ${detail}`);
    }
  },
};
