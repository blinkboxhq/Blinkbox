import { executeInPool } from "../infra/isolate.pool.js";

export default {
  toolDefinition: {
    name: "run_code",
    description: "Execute sandboxed JavaScript code in an isolated V8 environment. Input is available as $input, output via $output. No filesystem or network access.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript code to execute. Use $input for input data and assign result to $output." },
      },
      required: ["code"],
    },
  },

  async run(config, input) {
    const { code, timeout } = config;
    if (!code) return input;

    return executeInPool(code, input || {}, { timeout: Number(timeout) > 0 ? Number(timeout) * 1000 : undefined });
  },
};
