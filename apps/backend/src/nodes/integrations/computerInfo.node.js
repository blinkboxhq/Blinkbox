import { NODE_TIMEOUT_MS, assertComputerAccess, callComputer } from "./computer.client.js";

export default {
  timeoutMs: NODE_TIMEOUT_MS,

  async run(config = {}, input = {}, context = {}) {
    await assertComputerAccess(context);
    const system = await callComputer("GET", "/system");
    return { ...system, success: true };
  },
};
