import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

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

// ── remove_background ─────────────────────────────────────────────────────────
export const remove_background = {
  async run(config, input, context) {
    const imageUrl = config.imageUrl || config.url || input?.imageUrl || input?.url;
    if (!imageUrl) return { success: false, error: "remove_background: 'imageUrl' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "RemoveBg"));
    if (!apiKey) throw new Error("remove_background: remove.bg API key required.");

    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("image_url", imageUrl);
    form.append("size", config.size || "auto");

    const res = await axios.post("https://api.remove.bg/v1.0/removebg", form, {
      headers: { "X-Api-Key": apiKey, ...form.getHeaders() },
      responseType: "arraybuffer",
      timeout: 120000,
    });
    const base64 = Buffer.from(res.data).toString("base64");
    return { result: `data:image/png;base64,${base64}`, format: "png", originalUrl: imageUrl };
  },
};

// ── invoice_parser ────────────────────────────────────────────────────────────
export const invoice_parser = {
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

// ── bank_statement_parser ─────────────────────────────────────────────────────
export const bank_statement_parser = {
  async run(config, input, context) {
    const text = config.text || input?.text || input?.content || JSON.stringify(input);
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("bank_statement_parser: OpenAI credential required.");

    const result = await chatCompletion(apiKey,
      `Extract bank statement data as JSON: {accountNumber, bankName, period:{from,to}, openingBalance, closingBalance, currency, transactions:[{date,description,debit,credit,balance,category}], summary:{totalDebit,totalCredit,transactionCount}}. Return only JSON.`,
      `Parse this bank statement:\n${text.substring(0, 15000)}`, "gpt-4o-mini", 3000,
    );
    try { return JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim()); }
    catch { return { raw: result }; }
  },
};

// ── chat ──────────────────────────────────────────────────────────────────────
export const chat = {
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
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000 },
    );
    const reply = res.data.choices?.[0]?.message?.content || "";
    return {
      reply, message,
      history: [...messages, { role: "assistant", content: reply }],
      tokensUsed: res.data.usage?.total_tokens,
    };
  },
};

