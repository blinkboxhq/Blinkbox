import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

async function chatCompletion(apiKey, system, user, model = "gpt-4o-mini", maxTokens = 2000) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    { model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTokens, temperature: 0.7 },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );
  return res.data.choices?.[0]?.message?.content || "";
}

export default {
  async run(config, input, context) {
    const text = config.text || input?.text || input?.content || JSON.stringify(input);
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("invoice_parser: OpenAI credential required.");

    const result = await chatCompletion(apiKey,
      `Extract invoice data as JSON: {invoiceNumber, date, dueDate, vendor:{name,address,email}, customer:{name,address}, lineItems:[{description,quantity,unitPrice,total}], subtotal, tax, total, currency, paymentTerms}. Return only JSON.`,
      `Parse this invoice:\n${text.substring(0, 10000)}`, "gpt-4o-mini", 2000,
    );
    try { return JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim()); }
    catch { return { raw: result }; }
  },
};
