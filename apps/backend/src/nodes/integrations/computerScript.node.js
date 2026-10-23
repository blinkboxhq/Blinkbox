import {
  NODE_TIMEOUT_MS,
  assertComputerAccess,
  callComputer,
  commandResult,
  computerError,
  runOptions,
  toArgs,
  toText,
} from "./computer.client.js";

const LANGUAGES = {
  python: "python",
  python3: "python",
  py: "python",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  node: "node",
  nodejs: "node",
  javascript: "node",
  js: "node",
};

export default {
  timeoutMs: NODE_TIMEOUT_MS,

  async run(config = {}, input = {}, context = {}) {
    await assertComputerAccess(context);
    const requested = toText(config.language).trim().toLowerCase() || "python";
    const language = LANGUAGES[requested];
    if (!language) {
      throw computerError(`Unsupported language "${requested}"`, "config", "Pick Python, Bash or Node.");
    }
    const code = toText(config.code);
    if (!code.trim()) {
      throw computerError("Code is required", "config", "Write the script to run.");
    }
    const { body, failOnError, parseJson } = runOptions(config);
    const args = toArgs(config.args);
    const payload = { language, code, ...body };
    if (args.length) payload.args = args;
    const res = await callComputer("POST", "/script", payload, { timeoutMs: body.timeoutMs });
    return commandResult(res, { failOnError, parseJson, timeoutMs: body.timeoutMs, noun: "Script", extra: { language } });
  },
};
