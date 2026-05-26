export default {
  async run(config, input) {
    const body = input?.body ?? input;
    const sidField = config.sessionIdField || "sessionId";
    return {
      message:      body.message    ?? body.text ?? "",
      sessionId:    body[sidField]  ?? body.sessionId ?? "",
      systemPrompt: config.systemPrompt ?? "",
      body,
      triggeredAt:  new Date().toISOString(),
      triggerType:  "chat",
    };
  },
};
