export default {
  async run(config, input) {
    const statusCode = parseInt(config.statusCode || 200);
    const body = config.body || input?.body || input || {};
    const headers = config.headers || {};
    return { __webhookResponse: true, statusCode, body, headers };
  },
};
