import crypto from "crypto";

export default {
  async run(config, input) {
    const b = input?.body ?? input;

    if (config.webhookSecret && input?.rawBody && input?.signature) {
      const expected = crypto.createHmac("sha256", config.webhookSecret).update(input.rawBody).digest("hex");
      const received = (input?.signature ?? "").replace(/^sha256=/, "");
      if (expected !== received) throw new Error("[hubspot_trigger] Invalid webhook signature");
    }

    // HubSpot sends an array of events in one request
    const events = Array.isArray(b) ? b : [b];
    const event  = events[0] ?? {};

    const objectType  = event.subscriptionType?.split(".")[0] ?? event.objectType ?? "";
    const eventAction = event.subscriptionType?.split(".")[1] ?? event.changeSource ?? "";
    const objectId    = event.objectId    ?? event.id ?? null;
    const portalId    = event.portalId    ?? b.portalId ?? null;

    const properties = event.propertyValue != null
      ? { [event.propertyName]: event.propertyValue }
      : event.properties ?? {};

    return {
      eventType:    event.subscriptionType ?? event.eventType ?? "",
      objectType,
      action:       eventAction,
      objectId,
      portalId,
      appId:        event.appId        ?? null,
      occurredAt:   event.occurredAt   ? new Date(event.occurredAt).toISOString() : new Date().toISOString(),
      changeSource: event.changeSource ?? "",
      changeFlag:   event.changeFlag   ?? "",
      propertyName: event.propertyName ?? "",
      propertyValue: event.propertyValue ?? null,
      properties,
      attemptNumber: event.attemptNumber ?? 0,
      messageId:    event.messageId    ?? null,
      allEvents:    events,
      raw:          event,
    };
  },
};
