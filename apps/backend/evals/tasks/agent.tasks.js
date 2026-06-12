const PROVIDER_KEYS = [
  ["openai", "OPENAI_API_KEY"],
  ["anthropic", "ANTHROPIC_API_KEY"],
  ["gemini", "GEMINI_API_KEY"],
  ["groq", "GROQ_API_KEY"],
  ["deepseek", "DEEPSEEK_API_KEY"],
  ["mistral", "MISTRAL_API_KEY"],
  ["xai", "XAI_API_KEY"],
  ["openrouter", "OPENROUTER_API_KEY"],
];

export function pickProvider() {
  if (process.env.EVAL_PROVIDER) {
    return { provider: process.env.EVAL_PROVIDER, model: process.env.EVAL_MODEL || undefined };
  }
  for (const [provider, key] of PROVIDER_KEYS) {
    if (process.env[key]) return { provider, model: process.env.EVAL_MODEL || undefined };
  }
  return null;
}

const norm = (s) => String(s ?? "").replace(/[,\s]/g, "");

export const agentTasks = [
  {
    id: "agent-calculator",
    name: "calculator tool: 1847 * 392 + 11",
    config: {
      prompt: "Use the calculator tool to compute 1847 * 392 + 11. Reply with just the final number.",
    },
    check: (res) => {
      const out = norm(res.result);
      if (!out.includes("724035")) throw new Error(`expected 724035, got "${res.result}"`);
    },
  },
  {
    id: "agent-execute-js",
    name: "execute_js tool: 20th Fibonacci number",
    config: {
      prompt: "Use the execute_js tool to compute the 20th Fibonacci number where F(1)=F(2)=1. Reply with just the number.",
    },
    check: (res) => {
      if (!norm(res.result).includes("6765")) throw new Error(`expected 6765, got "${res.result}"`);
    },
  },
  {
    id: "agent-string-js",
    name: "execute_js tool: reverse a string",
    config: {
      prompt: "Use the execute_js tool to reverse the string 'blinkbox'. Reply with just the reversed string.",
    },
    check: (res) => {
      if (!String(res.result).toLowerCase().includes("xobknilb")) {
        throw new Error(`expected xobknilb, got "${res.result}"`);
      }
    },
  },
  {
    id: "agent-multi-step",
    name: "multi-step math: 15% tip on $84.60",
    config: {
      prompt: "A restaurant bill is $84.60. Calculate a 15% tip, then give the total bill including the tip. Reply with just the total as a number.",
      maxIterations: 6,
    },
    check: (res) => {
      const out = norm(res.result);
      if (!out.includes("97.29")) throw new Error(`expected 97.29, got "${res.result}"`);
    },
  },
  {
    id: "agent-json-output",
    name: "structured JSON output mode",
    config: {
      prompt: 'Return a JSON object with exactly two keys: "product" set to "blinkbox" and "score" set to the number 10.',
      outputFormat: "json",
    },
    check: (res) => {
      const raw = typeof res.result === "string" ? JSON.parse(res.result) : res.result;
      if (raw?.product !== "blinkbox" || Number(raw?.score) !== 10) {
        throw new Error(`bad JSON shape: ${JSON.stringify(res.result).slice(0, 200)}`);
      }
    },
  },
  {
    id: "agent-no-tool",
    name: "plain reasoning without tool calls",
    config: {
      prompt: "What is the capital of Australia? Reply with just the city name.",
    },
    check: (res) => {
      if (!String(res.result).toLowerCase().includes("canberra")) {
        throw new Error(`expected Canberra, got "${res.result}"`);
      }
    },
  },
];
