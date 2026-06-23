export default {
  async run(config, input) {
    return {
      ...input,
      triggeredAt: new Date().toISOString(),
      triggerType: "manual",
    };
  },
};
