import crypto from "crypto";

export default {
  async run(config, input) {
    const b = input?.body ?? input;

    if (config.webhookSecret && input?.rawBody && input?.signature) {
      const sig = crypto.createHmac("sha256", config.webhookSecret).update(input.rawBody).digest("base64");
      if (sig !== input.signature) throw new Error("[shopify_trigger] Invalid webhook signature");
    }

    const eventTopic = input?.headers?.["x-shopify-topic"] || config.event || "orders/create";
    const [resource, action] = eventTopic.split("/");

    return {
      topic:       eventTopic,
      resource,
      action,
      id:          b.id          ?? null,
      email:       b.email       ?? b.customer?.email ?? "",
      totalPrice:  b.total_price ?? b.subtotal_price  ?? "",
      currency:    b.currency    ?? "",
      lineItems:   b.line_items  ?? [],
      customer:    b.customer    ?? {},
      shippingAddress: b.shipping_address ?? {},
      billingAddress:  b.billing_address  ?? {},
      financialStatus: b.financial_status ?? "",
      fulfillmentStatus: b.fulfillment_status ?? "",
      tags:        b.tags         ?? "",
      note:        b.note         ?? "",
      orderId:     b.order_id     ?? b.id ?? null,
      order:       b,
    };
  },
};
