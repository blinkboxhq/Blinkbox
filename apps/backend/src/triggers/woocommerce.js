export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const event = input?.woocommerceEvent || input?.headers?.["x-wc-webhook-topic"] || "order.created";
    const billing = b?.billing ?? {};
    const shipping = b?.shipping ?? {};
    return {
      event:           event,
      topic:           event,
      objectType:      event.split(".")?.[0],
      action:          event.split(".")?.[1],
      orderId:         b?.id,
      orderNumber:     b?.number,
      orderKey:        b?.order_key,
      orderStatus:     b?.status,
      orderTotal:      b?.total,
      orderSubtotal:   b?.subtotal,
      currency:        b?.currency,
      paymentMethod:   b?.payment_method,
      paymentTitle:    b?.payment_method_title,
      billingName:     `${billing.first_name ?? ""} ${billing.last_name ?? ""}`.trim(),
      billingEmail:    billing.email,
      billingPhone:    billing.phone,
      billingAddress:  [billing.address_1, billing.city, billing.state, billing.country].filter(Boolean).join(", "),
      shippingName:    `${shipping.first_name ?? ""} ${shipping.last_name ?? ""}`.trim(),
      shippingAddress: [shipping.address_1, shipping.city, shipping.state, shipping.country].filter(Boolean).join(", "),
      lineItems:       (b?.line_items ?? []).map(i => ({ name: i.name, sku: i.sku, quantity: i.quantity, total: i.total })),
      itemCount:       b?.line_items?.length ?? 0,
      customerId:      b?.customer_id,
      couponCodes:     (b?.coupon_lines ?? []).map(c => c.code),
      notes:           b?.customer_note,
      createdAt:       b?.date_created,
      updatedAt:       b?.date_modified,
    };
  },
};
