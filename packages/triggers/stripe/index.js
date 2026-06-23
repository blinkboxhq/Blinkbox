import crypto from "crypto";

export default {
  async run(config, input) {
    const b = input?.body ?? input;
    if (config.webhookSecret && input?.rawBody && input?.signature) {
      const sig = crypto.createHmac("sha256", config.webhookSecret).update(input.rawBody).digest("hex");
      if (`sha256=${sig}` !== input.signature) throw new Error("[stripe_trigger] Invalid webhook signature");
    }
    const obj = b?.data?.object ?? {};
    return {
      event:       b?.type,
      eventId:     b?.id,
      livemode:    b?.livemode ?? false,
      objectType:  obj.object,
      id:          obj.id,
      amount:      obj.amount,
      amountDecimal: obj.amount != null ? (obj.amount / 100).toFixed(2) : null,
      currency:    (obj.currency ?? "").toUpperCase(),
      status:      obj.status,
      customer:    obj.customer,
      email:       obj.receipt_email || obj.billing_details?.email || obj.email,
      description: obj.description,
      metadata:    obj.metadata ?? {},
      createdAt:   obj.created ? new Date(obj.created * 1000).toISOString() : null,
      paymentMethod: obj.payment_method_types?.[0] || obj.payment_method,
      invoiceId:   obj.invoice,
      subscriptionId: obj.subscription,
      raw:         obj,
    };
  },
};
