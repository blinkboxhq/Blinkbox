import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const message = config.message || config.prompt || input?.message || input?.text;
    if (!message) return { success: false, error: "chat: 'message' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("chat: OpenAI credential required.");

    const messages = [
      ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : [{ role: "system", content: "You are a helpful assistant." }]),
      ...(Array.isArray(input?.history) ? input.history : []),
      { role: "user", content: message },
    ];

    const res = await axios.post("https://api.openai.com/v1/chat/completions",
      { model: config.model || "gpt-4o-mini", messages, max_tokens: parseInt(config.maxTokens || 1000), temperature: parseFloat(config.temperature || 0.7) },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 },
    );
    const reply = res.data.choices?.[0]?.message?.content || "";
    return {
      reply, message,
      history: [...messages, { role: "assistant", content: reply }],
      tokensUsed: res.data.usage?.total_tokens,
    };
  },
};
