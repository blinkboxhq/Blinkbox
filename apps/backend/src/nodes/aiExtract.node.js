/**
 * AI EXTRACT NODE
 * Extract structured fields from unstructured text using an LLM.
 * Define the fields you want and the model fills them in.
 *
 * Config:
 *   text          — input text to extract from (supports {{ expressions }})
 *   fields        — JSON array of field definitions:
 *                   [{ name: "email", type: "string", description: "email address" }, ...]
 *                   OR comma-separated simple list: "name, email, phone"
 *   model         — LLM model ID (default: gpt-4o-mini)
 *   credentialId  — OpenAI API key in vault
 *   returnNulls   — include null fields in output (default: true)
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

function parseFields(raw) {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    // Simple comma list: "name, email, phone"
    return raw.split(",").map((f) => ({ name: f.trim(), type: "string" }));
  }
  return Array.isArray(raw) ? raw : [];
}

export default {
  async run(config, input, context = {}) {
    const { text, model = "gpt-4o-mini", returnNulls = true } = config;

    const inputText = text ?? input?.text ?? (typeof input === "string" ? input : JSON.stringify(input));
    if (!inputText) throw new Error("AI Extract: 'text' is required.");

    const fields = parseFields(config.fields);
    if (fields.length === 0) throw new Error("AI Extract: 'fields' is required — define what to extract.");

    const cred = await resolveCredential(config.credentialId, context.workspaceId, "AI Extract");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const fieldDesc = fields.map((f) => {
      const parts = [`"${f.name}" (${f.type ?? "string"})`];
      if (f.description) parts.push(`— ${f.description}`);
      return parts.join(" ");
    }).join("\n");

    const schema = fields.reduce((acc, f) => {
      acc[f.name] = f.type === "number" ? { type: "number" } : f.type === "boolean" ? { type: "boolean" } : { type: "string" };
      return acc;
    }, {});

    const systemPrompt = `Extract the following fields from the user's text. Return valid JSON only matching this schema: ${JSON.stringify(schema)}
Fields to extract:
${fieldDesc}
Use null for any field that cannot be found. Do not guess — only extract what is clearly present.`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: String(inputText) },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
        max_tokens: 500,
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 },
    );

    const raw = response.data.choices[0].message.content;
    let extracted;
    try { extracted = JSON.parse(raw); } catch { throw new Error(`AI Extract: Model returned invalid JSON: ${raw}`); }

    if (!returnNulls) {
      Object.keys(extracted).forEach((k) => { if (extracted[k] === null) delete extracted[k]; });
    }

    const foundCount = Object.values(extracted).filter((v) => v !== null && v !== undefined).length;
    return { ...extracted, _meta: { fieldsRequested: fields.length, fieldsFound: foundCount, model } };
  },
};
