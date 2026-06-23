export default {
  async run(config, input) {
    const body = input?.body ?? input;
    return {
      fields:      body.fields ?? body,
      submittedAt: body.submittedAt ?? new Date().toISOString(),
      body,
      triggerType: "form",
    };
  },
};
