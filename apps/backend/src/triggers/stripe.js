import crypto from "crypto";
import { resolveTriggerSecret } from "../utils/triggerSecret.js";

export default {
  async run(config, input, context) {
    const b = input?.body ?? input;
    const secret = await resolveTriggerSecret(config, context, "stripe_trigger");
    if (secret && input?.rawBody && input?.signature) {
      const sig = crypto.createHmac("sha256", secret).update(input.rawBody).digest("hex");
      if (`sha256=${sig}` !== input.signature) throw new Error("[stripe_trigger] Invalid webhook signature");
    }
    if (config.event && b?.type && b.type !== config.event) {
      return { __conditionResult: false, event: b.type, reason: `does not match configured ${config.event}` };
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
