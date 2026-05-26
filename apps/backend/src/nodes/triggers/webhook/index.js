export default {
  async run(config, input) {
    const body = input?.body ?? input;
    return {
      body,
      headers:     input?.headers ?? {},
      method:      input?.method  ?? "POST",
      query:       input?.query   ?? {},
      triggeredAt: new Date().toISOString(),
      triggerType: "webhook",
    };
  },
};
