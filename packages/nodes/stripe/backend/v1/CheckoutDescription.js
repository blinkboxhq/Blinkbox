/**
 * Stripe — Checkout Sessions, Payment Links, Coupons & Promo Codes.
 */
import { ok, list, need, enc, lim, metadata } from "../GenericFunctions.js";

async function opCreateCheckoutSession(config, req) {
  let e = need(config, "priceId", "createCheckoutSession"); if (e) return e;
  e = need(config, "successUrl", "createCheckoutSession"); if (e) return e;
  return ok(await req("POST", "/checkout/sessions", {
    mode: config.mode || "payment",
    line_items: [{ price: config.priceId, quantity: config.quantity || 1 }],
    success_url: config.successUrl, cancel_url: config.cancelUrl || config.successUrl,
    customer: config.customerId, customer_email: config.email, metadata: metadata(config),
  }));
}
async function opGetCheckoutSession(config, req) {
  const e = need(config, "sessionId", "getCheckoutSession"); if (e) return e;
  return ok(await req("GET", `/checkout/sessions/${enc(config.sessionId)}`));
}
async function opListCheckoutSessions(config, req) {
  return list(await req("GET", "/checkout/sessions", { customer: config.customerId, limit: lim(config.limit, 10) }));
}
async function opExpireCheckoutSession(config, req) {
  const e = need(config, "sessionId", "expireCheckoutSession"); if (e) return e;
  return ok(await req("POST", `/checkout/sessions/${enc(config.sessionId)}/expire`));
}
async function opCreatePaymentLink(config, req) {
  const e = need(config, "priceId", "createPaymentLink"); if (e) return e;
  return ok(await req("POST", "/payment_links", {
    line_items: [{ price: config.priceId, quantity: config.quantity || 1 }], metadata: metadata(config),
  }));
}
async function opListPaymentLinks(config, req) {
  return list(await req("GET", "/payment_links", { limit: lim(config.limit, 10) }));
}

async function opCreateCoupon(config, req) {
  return ok(await req("POST", "/coupons", {
    percent_off: config.percentOff, amount_off: config.amountOff, currency: config.currency,
    duration: config.duration || "once", name: config.name, id: config.couponId,
  }));
}
async function opListCoupons(config, req) {
  return list(await req("GET", "/coupons", { limit: lim(config.limit, 10) }));
}
async function opDeleteCoupon(config, req) {
  const e = need(config, "couponId", "deleteCoupon"); if (e) return e;
  return ok(await req("DELETE", `/coupons/${enc(config.couponId)}`));
}
async function opCreatePromoCode(config, req) {
  const e = need(config, "couponId", "createPromoCode"); if (e) return e;
  return ok(await req("POST", "/promotion_codes", { coupon: config.couponId, code: config.code, max_redemptions: config.maxRedemptions }));
}
async function opListPromoCodes(config, req) {
  return list(await req("GET", "/promotion_codes", { coupon: config.couponId, limit: lim(config.limit, 10) }));
}

export const checkoutOperations = {
  createCheckoutSession: opCreateCheckoutSession, getCheckoutSession: opGetCheckoutSession,
  listCheckoutSessions: opListCheckoutSessions, expireCheckoutSession: opExpireCheckoutSession,
  createPaymentLink: opCreatePaymentLink, listPaymentLinks: opListPaymentLinks,
  createCoupon: opCreateCoupon, listCoupons: opListCoupons, deleteCoupon: opDeleteCoupon,
  createPromoCode: opCreatePromoCode, listPromoCodes: opListPromoCodes,
};
