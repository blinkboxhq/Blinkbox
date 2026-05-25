export const SYSTEM_PROMPTS = {
  claude_code:    "You are Claude Code, Anthropic's expert AI coding assistant. Write clean, well-documented, production-ready code. When generating code, output ONLY the code inside a single markdown code block, then a brief explanation below it.",
  codex:          "You are Codex, OpenAI's code generation model. Produce precise, efficient, idiomatic code. When generating code, output ONLY the code inside a single markdown code block, then a brief explanation below it.",
  gemini_cli:     "You are Gemini, Google's AI coding assistant. Write modern, idiomatic code following best practices. When generating code, output ONLY the code inside a single markdown code block, then a brief explanation below it.",
  groq:           "You are a fast, precise AI coding assistant. Produce clean, correct code immediately. When generating code, output ONLY the code inside a single markdown code block, then a brief explanation below it.",
  ollama:         "You are a local AI coding assistant. Write clear, correct code. When generating code, output ONLY the code inside a single markdown code block, then a brief explanation below it.",
  lmstudio:       "You are a local AI coding assistant running via LM Studio. Write clear, correct code. When generating code, output ONLY the code inside a single markdown code block, then a brief explanation below it.",
  github_copilot: "You are GitHub Copilot, an AI pair programmer trained on millions of public repositories. Suggest the most idiomatic, natural code a senior developer would write. When generating code, output ONLY the code inside a single markdown code block, then a brief explanation below it.",
};

export const OPERATIONS = {
  generate: ({ task = "", language = "any" }) =>
    `Write ${language} code to accomplish the following:\n\n${task}`,
  review: ({ code = "", language = "code" }) =>
    `Review the following ${language} code. List specific issues, potential bugs, and improvements:\n\`\`\`\n${code}\n\`\`\``,
  fix: ({ code = "", task = "", language = "code" }) =>
    `Fix the following ${language} code. Bug description: ${task || "fix any issues you find"}\n\`\`\`\n${code}\n\`\`\``,
  explain: ({ code = "", language = "code" }) =>
    `Explain clearly what the following ${language} code does, step by step:\n\`\`\`\n${code}\n\`\`\``,
  refactor: ({ code = "", language = "code" }) =>
    `Refactor the following ${language} code for clarity, performance, and best practices:\n\`\`\`\n${code}\n\`\`\``,
};

export function extractCodeBlock(text) {
  const match = text.match(/```(?:\w+)?\n?([\s\S]*?)```/);
  return match ? match[1].trim() : "";
}

export function buildOutput(text, model, tokensUsed, operation, provider) {
  const isCodeOp = ["generate", "fix", "refactor"].includes(operation);
  return {
    result: text,
    code:   isCodeOp ? extractCodeBlock(text) : "",
    model,
    tokensUsed: tokensUsed ?? 0,
    operation,
    provider,
  };
}

export function buildUserMessage(operation, config) {
  const builder = OPERATIONS[operation];
  if (!builder) throw new Error(`Unknown coding operation: ${operation}`);
  return builder({
    task:     config.task     || "",
    code:     config.code     || "",
    language: config.language || "code",
  });
}
