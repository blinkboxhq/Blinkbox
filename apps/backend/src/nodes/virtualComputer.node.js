import { execute } from "../infra/container.pool.js";

export default {
  async run(config, _input, context) {
    return execute(config, context?.workspaceId ?? "default");
  },
};
