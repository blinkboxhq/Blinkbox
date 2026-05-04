/**
 * AI CLASSIFY NODE
 * Classify text into one of N categories using any LLM.
 * Returns the matched category + confidence reasoning — no prompt engineering needed.
 *
 * Config:
 *   text          — input text to classify (supports {{ expressions }})
 *   categories    — comma-separated list of category labels, e.g. "spam, not spam"
 *   context       — optional extra instructions / domain context for the model
 *   model         — LLM model ID (default: gpt-4o-mini)
 *   credentialId  — OpenAI API key in vault
 *   allowMultiple — if true, return all matching categories (default: false)
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const {
      text,
      categories = "",
      model = "gpt-4o-mini",
      allowMultiple = false,
    } = config;

    const inputText = text ?? input?.text ?? (typeof input === "string" ? input : JSON.stringify(input));
    if (!inputText) return { success: false, error: "AI Classify: 'text' is required — configure this field.", skipped: true };

    const cats = String(categories).split(",").map((c) => c.trim()).filter(Boolean);
    if (cats.length < 2) return { success: false, error: "AI Classify: at least 2 categories required — configure this field.", skipped: true };

    const cred = await resolveCredential(config.credentialId, context.workspaceId, "AI Classify");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const systemPrompt = `You are a classifier. Classify the given text into one of the following categories: ${cats.map((c, i) => `${i + 1}. ${c}`).join(", ")}.
${config.context ? `Context: ${config.context}` : ""}
Respond with valid JSON only: { "category": "<chosen category>", "confidence": 0.0-1.0, "reasoning": "<one sentence>" }${allowMultiple ? ' or { "categories": ["cat1","cat2"], "confidence": 0.0-1.0, "reasoning": "..." }' : ""}`;

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
        max_tokens: 200,
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 },
    );

    const raw = response.data.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error(`AI Classify: Model returned invalid JSON: ${raw}`); }

    return {
      category: parsed.category ?? parsed.categories?.[0] ?? null,
      categories: parsed.categories ?? (parsed.category ? [parsed.category] : []),
      confidence: parsed.confidence ?? null,
      reasoning: parsed.reasoning ?? null,
      isValid: cats.includes(parsed.category) || (parsed.categories ?? []).every((c) => cats.includes(c)),
      model,
    };
  },
};
