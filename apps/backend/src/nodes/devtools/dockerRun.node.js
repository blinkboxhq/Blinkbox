import { executeCustom as containerExecuteCustom } from "../../infra/container.pool.js";

export default {
  async run(config, input, context = {}) {
    const image = config.image || input?.image;
    const cmd = config.command || input?.command;
    if (!image) return { success: false, error: "docker_run: 'image' is required.", skipped: true };

    const result = await containerExecuteCustom(
      { image, command: Array.isArray(cmd) ? cmd.join(" ") : (cmd || ""), env: config.env || {}, timeoutSeconds: Math.ceil((config.timeout || 60000) / 1000) },
      context.workspaceId || "default"
    );
    return { output: result.stdout, stderr: result.stderr, exitCode: result.exitCode, image, command: cmd };
  },
};
