/**
 * AI TRANSFORM NODE
 * Transform text with preset operations — translate, summarize, rewrite tone, fix grammar, etc.
 * No prompt-writing needed; just pick an operation and optionally customize.
 *
 * Config:
 *   text         — input text (supports {{ expressions }})
 *   operation    — "translate" | "summarize" | "tone" | "grammar" | "expand" | "shorten" | "custom"
 *   language     — target language for "translate" (e.g. "Spanish", "French")
 *   tone         — target tone for "tone" (e.g. "formal", "friendly", "professional")
 *   length       — "short" | "medium" | "long" for summarize/expand/shorten
 *   customPrompt — system instruction for "custom" operation
 *   model        — LLM model ID (default: gpt-4o-mini)
 *   credentialId — OpenAI API key in vault
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

const OPERATION_PROMPTS = {
  translate: (cfg) => `Translate the following text to ${cfg.language ?? "English"}. Return only the translated text, no explanation.`,
  summarize: (cfg) => `Summarize the following text${cfg.length === "short" ? " in 1-2 sentences" : cfg.length === "long" ? " in detail, keeping all key points" : " in 3-5 sentences"}. Return only the summary.`,
  tone: (cfg) => `Rewrite the following text in a ${cfg.tone ?? "professional"} tone. Keep the same meaning. Return only the rewritten text.`,
  grammar: () => "Fix all grammar, spelling, and punctuation errors in the following text. Return only the corrected text.",
  expand: (cfg) => `Expand the following text into a more ${cfg.length === "long" ? "detailed and comprehensive" : "complete and informative"} version. Return only the expanded text.`,
  shorten: (cfg) => `Shorten the following text to be more concise${cfg.length === "short" ? ", keeping only the most essential information" : ""}. Return only the shortened text.`,
  custom: (cfg) => cfg.customPrompt ?? "Process the following text and return the result.",
};

export default {
  async run(config, input, context = {}) {
    const { text, operation = "summarize", model = "gpt-4o-mini" } = config;

    const inputText = text ?? input?.text ?? (typeof input === "string" ? input : JSON.stringify(input));
    if (!inputText) throw new Error("AI Transform: 'text' is required.");

    const promptFn = OPERATION_PROMPTS[operation];
    if (!promptFn) {
      throw new Error(`AI Transform: Unknown operation "${operation}". Valid: translate | summarize | tone | grammar | expand | shorten | custom`);
    }
    if (operation === "translate" && !config.language) throw new Error("AI Transform: 'language' is required for translate operation.");
    if (operation === "tone" && !config.tone) throw new Error("AI Transform: 'tone' is required for tone operation.");
    if (operation === "custom" && !config.customPrompt) throw new Error("AI Transform: 'customPrompt' is required for custom operation.");

    const cred = await resolveCredential(config.credentialId, context.workspaceId, "AI Transform");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: promptFn(config) },
          { role: "user", content: String(inputText) },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 },
    );

    const result = response.data.choices[0].message.content.trim();
    return {
      result,
      operation,
      originalLength: String(inputText).length,
      resultLength: result.length,
      model,
    };
  },
};
