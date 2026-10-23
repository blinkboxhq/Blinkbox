import {
  NODE_TIMEOUT_MS,
  assertComputerAccess,
  callComputer,
  commandResult,
  computerError,
  runOptions,
  toText,
} from "./computer.client.js";

export default {
  timeoutMs: NODE_TIMEOUT_MS,

  async run(config = {}, input = {}, context = {}) {
    await assertComputerAccess(context);
    const command = toText(config.command);
    if (!command.trim()) {
      throw computerError("Command is required", "config", "Type the shell command to run, e.g. df -h /");
    }
    const { body, failOnError, parseJson } = runOptions(config);
    const res = await callComputer("POST", "/exec", { command, ...body }, { timeoutMs: body.timeoutMs });
    return commandResult(res, { failOnError, parseJson, timeoutMs: body.timeoutMs });
  },
};
