import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";
import { AI_MODELS, resolveModel, shapeOpenAIChatBody } from "../../utils/aiModels.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

// The node only holds an OpenAI credential, so only an OpenAI model can be used.
function pickModel(config) {
  const chosen = config.model || config.aiModel;
  return chosen && /^(gpt-|o\d|chatgpt-)/.test(chosen) ? resolveModel("openai", chosen) : AI_MODELS.openai.fast;
}

async function chatCompletion(apiKey, system, user, model = AI_MODELS.openai.fast, maxTokens = 2000) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    shapeOpenAIChatBody({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTokens, temperature: 0 }),
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );
  return res.data.choices?.[0]?.message?.content || "";
}

export default {
  async run(config, input, context) {
    const text = config.text || input?.text || input?.content || JSON.stringify(input);
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("bank_statement_parser: OpenAI credential required.");

    const result = await chatCompletion(apiKey,
      `Extract bank statement data as JSON: {accountNumber, bankName, period:{from,to}, openingBalance, closingBalance, currency, transactions:[{date,description,debit,credit,balance,category}], summary:{totalDebit,totalCredit,transactionCount}}. Return only JSON.`,
      `Parse this bank statement:\n${text.substring(0, 15000)}`, pickModel(config), 3000,
    );
    try { return JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim()); }
    catch { return { raw: result }; }
  },
};
