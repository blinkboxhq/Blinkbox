import axios from "axios";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";

export default {
  async run(config) {
    const operation = config.operation || "generate";
    const model     = config.model     || "local-model";
    const baseUrl   = (config.baseUrl  || "http://localhost:1234").replace(/\/$/, "").replace(/\/v1\/chat\/completions$/, "");
    const maxTokens = parseInt(config.maxTokens) || 4000;
    const temp      = parseFloat(config.temperature ?? 0.2);

    const userMsg = buildUserMessage(operation, config);

    try {
      const res = await axios.post(
        `${baseUrl}/v1/chat/completions`,
        { model, max_tokens: maxTokens, temperature: temp,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS.ollama },
            { role: "user",   content: userMsg },
          ] },
        { headers: { "Content-Type": "application/json" }, timeout: 120000 },
      );
      const text = res.data.choices?.[0]?.message?.content || "";
      return buildOutput(text, model, res.data.usage?.total_tokens ?? null, operation, "lmstudio");
    } catch (err) {
      if (err.code === "ECONNREFUSED") throw new Error(`LM Studio: Cannot connect to ${baseUrl}. Is LM Studio running with the server enabled?`);
      throw new Error(`LM Studio failed: ${err.response?.data?.error || err.message}`);
    }
  },
};
