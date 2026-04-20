/**
 * AI DECISION ENGINE NODE
 * Multi-factor structured decision-making with full reasoning trace.
 * Weighs criteria against options and returns a scored verdict.
 * Perfect for approval flows, risk scoring, dynamic routing.
 *
 * Config:
 *   scenario      — description of the situation/context
 *   options       — JSON array or comma-separated list of choices
 *   criteria      — JSON array of { name, description, weight (1-10) }
 *   rules         — free-text rules/policies the decision must respect
 *   data          — additional structured data (object or string)
 *   provider      — "openai" (default) | "anthropic"
 *   model         — LLM model ID
 *   credentialId  — API key in vault
 *   temperature   — 0.0–1.0 (default: 0.1 for consistency)
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

function parseOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return raw.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return [];
}

function parseCriteria(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return raw.split(",").map((c) => ({ name: c.trim(), description: "", weight: 5 }));
  }
  return [];
}

function buildSystemPrompt(options, criteria, rules) {
  const optionsList = options.join(", ");
  const criteriaBlock = criteria.length
    ? criteria.map((c) => `- ${c.name} (weight ${c.weight ?? 5}/10)${c.description ? `: ${c.description}` : ""}`).join("\n")
    : "- general fitness";

  const rulesBlock = rules ? `\nRules & Constraints:\n${rules}\n` : "";

  return `You are a structured decision-making engine. Evaluate the given options against the criteria and rules. Return ONLY valid JSON matching EXACTLY this schema:
{
  "decision": "<one of the provided options, verbatim>",
  "confidence": <0.0-1.0>,
  "reasoning": "<concise explanation of why this option was chosen>",
  "scores": {
    "<option>": {
      "total": <0.0-1.0>,
      "criteria": {
        "<criterion_name>": { "score": <0.0-1.0>, "reasoning": "<brief>" }
      }
    }
  },
  "factors": ["<key factor 1>", "<key factor 2>"],
  "recommended_action": "<specific next step>",
  "risks": ["<risk 1>", "<risk 2>"],
  "alternatives": [{ "option": "<option>", "condition": "<when to prefer this>" }]
}

Options to evaluate: ${optionsList}

Evaluation Criteria:
${criteriaBlock}
${rulesBlock}
IMPORTANT: The "decision" field MUST be one of: ${optionsList}. Use exact wording.`;
}

export default {
  async run(config, input, context = {}) {
    const {
      provider = "openai",
      model = "gpt-4o-mini",
      temperature = 0.1,
      outputFormat = "full",
    } = config;

    const scenario = config.scenario ?? input?.scenario ?? (typeof input === "string" ? input : "");
    if (!scenario) throw new Error("AI Decision: 'scenario' is required.");

    const options = parseOptions(config.options);
    if (options.length < 2) throw new Error("AI Decision: at least 2 options are required.");

    const criteria = parseCriteria(config.criteria);
    const rules = config.rules || "";

    let dataStr = "";
    if (config.data) {
      try {
        dataStr = typeof config.data === "string" ? config.data : JSON.stringify(config.data, null, 2);
        dataStr = dataStr.slice(0, 3000);
      } catch { dataStr = String(config.data).slice(0, 3000); }
    }

    const cred = await resolveCredential(config.credentialId, context.workspaceId, "AI Decision");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const systemPrompt = buildSystemPrompt(options, criteria, rules);
    const userContent = `Scenario: ${scenario}${dataStr ? `\n\nAdditional Context:\n${dataStr}` : ""}`;

    let raw;

    if (provider === "anthropic") {
      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: model || "claude-3-5-sonnet-20241022",
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
          temperature: parseFloat(temperature),
        },
        {
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          timeout: 60000,
        },
      );
      raw = response.data.content[0].text;
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI Decision: Model returned no JSON.");
      raw = match[0];
    } else {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: parseFloat(temperature),
          response_format: { type: "json_object" },
          max_tokens: 2000,
        },
        { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000 },
      );
      raw = response.data.choices[0].message.content;
    }

    let result;
    try { result = JSON.parse(raw); } catch { throw new Error(`AI Decision: Invalid JSON from model: ${String(raw).slice(0, 300)}`); }

    // Validate decision is one of the provided options
    if (!options.includes(result.decision)) {
      // Find highest-scored option as fallback
      if (result.scores) {
        const best = Object.entries(result.scores).sort((a, b) => (b[1].total || 0) - (a[1].total || 0))[0];
        if (best && options.includes(best[0])) result.decision = best[0];
      }
    }

    const meta = { model, provider, temperature: parseFloat(temperature), optionCount: options.length, criteriaCount: criteria.length };

    if (outputFormat === "decision_only") return { decision: result.decision, confidence: result.confidence, reasoning: result.reasoning, _meta: meta };
    if (outputFormat === "scores_only") return { scores: result.scores, decision: result.decision, _meta: meta };

    return { ...result, _meta: meta };
  },
};
