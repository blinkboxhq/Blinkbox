export default {
  name: "wait_for_event",
  type: "logic",

  async run(config, input) {
    return {
      ...(input && typeof input === "object" && !Array.isArray(input) ? input : { input }),
      __waitWebhook: true,
      waiting: true,
      body: {},
      headers: {},
      query: {},
      receivedAt: null,
    };
  },
};
