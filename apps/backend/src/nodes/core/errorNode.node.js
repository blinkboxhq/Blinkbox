export default {
  async run(config, input) {
    const message = config.message || config.error || "Workflow stopped by error node.";
    throw new Error(message);
  },
};
