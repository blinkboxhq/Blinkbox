/**
 * 📤 RESPOND WEBHOOK NODE
 * Stores a custom response payload that will be sent back to the original
 * webhook caller IF the automation was triggered synchronously
 * (i.e. the caller is still waiting).
 *
 * For async webhook calls (the standard flow where we respond 200 immediately),
 * this node records what WOULD have been the response so it can be read back
 * via the execution log / polling endpoint.
 *
 * Config:
 *   statusCode  — HTTP status code to respond with (default: 200)
 *   body        — Response body (object or string, already expression-resolved)
 *   contentType — "json" (default) | "text"
 */
export default {
  async run(config, input) {
    const {
      statusCode = 200,
      body = null,
      contentType = "json",
    } = config;

    if (statusCode < 100 || statusCode > 599) {
      throw new Error(`Respond Webhook Node: Invalid status code ${statusCode}.`);
    }

    // Build the response payload
    const responsePayload = body !== null ? body : input;

    // We tag the output with __webhookResponse so any downstream monitor or
    // the execution controller can detect and surface it.
    return {
      ...input,
      __webhookResponse: {
        statusCode,
        contentType,
        body: responsePayload,
        respondedAt: new Date().toISOString(),
      },
    };
  },
};
