/**
 * Stripe — Payment Intents, Charges & Refunds.
 */
import { ok, list, skip, need, enc, lim, metadata } from "../GenericFunctions.js";

async function opCreatePaymentIntent(config, req) {
  let e = need(config, "amount", "createPaymentIntent"); if (e) return e;
  e = need(config, "currency", "createPaymentIntent"); if (e) return e;
  return ok(await req("POST", "/payment_intents", {
    amount: config.amount, currency: config.currency, customer: config.customerId,
    description: config.description, payment_method: config.paymentMethodId,
    receipt_email: config.email, metadata: metadata(config),
    confirm: config.confirm === true ? true : undefined,
    automatic_payment_methods: config.automatic ? { enabled: true } : undefined,
  }));
}
async function opGetPaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "getPaymentIntent"); if (e) return e;
  return ok(await req("GET", `/payment_intents/${enc(config.paymentIntentId)}`));
}
async function opUpdatePaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "updatePaymentIntent"); if (e) return e;
  return ok(await req("POST", `/payment_intents/${enc(config.paymentIntentId)}`, {
    amount: config.amount, description: config.description, metadata: metadata(config),
  }));
}
async function opConfirmPaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "confirmPaymentIntent"); if (e) return e;
  return ok(await req("POST", `/payment_intents/${enc(config.paymentIntentId)}/confirm`, {
    payment_method: config.paymentMethodId,
  }));
}
async function opCapturePaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "capturePaymentIntent"); if (e) return e;
  return ok(await req("POST", `/payment_intents/${enc(config.paymentIntentId)}/capture`, {
    amount_to_capture: config.amount,
  }));
}
async function opCancelPaymentIntent(config, req) {
  const e = need(config, "paymentIntentId", "cancelPaymentIntent"); if (e) return e;
  return ok(await req("POST", `/payment_intents/${enc(config.paymentIntentId)}/cancel`, {
    cancellation_reason: config.reason,
  }));
}
async function opListPaymentIntents(config, req) {
  return list(await req("GET", "/payment_intents", { customer: config.customerId, limit: lim(config.limit, 10) }));
}

async function opGetCharge(config, req) {
  const e = need(config, "chargeId", "getCharge"); if (e) return e;
  return ok(await req("GET", `/charges/${enc(config.chargeId)}`));
}
async function opListCharges(config, req) {
  return list(await req("GET", "/charges", { customer: config.customerId, limit: lim(config.limit, 10) }));
}
async function opCaptureCharge(config, req) {
  const e = need(config, "chargeId", "captureCharge"); if (e) return e;
  return ok(await req("POST", `/charges/${enc(config.chargeId)}/capture`, { amount: config.amount }));
}

async function opCreateRefund(config, req) {
  if (!config.chargeId && !config.paymentIntentId) return skip("createRefund", "'chargeId' or 'paymentIntentId' is required.");
  return ok(await req("POST", "/refunds", {
    charge: config.chargeId, payment_intent: config.paymentIntentId,
    amount: config.amount, reason: config.reason, metadata: metadata(config),
  }));
}
async function opGetRefund(config, req) {
  const e = need(config, "refundId", "getRefund"); if (e) return e;
  return ok(await req("GET", `/refunds/${enc(config.refundId)}`));
}
async function opListRefunds(config, req) {
  return list(await req("GET", "/refunds", { charge: config.chargeId, payment_intent: config.paymentIntentId, limit: lim(config.limit, 10) }));
}

export const paymentOperations = {
  createPaymentIntent: opCreatePaymentIntent, getPaymentIntent: opGetPaymentIntent,
  updatePaymentIntent: opUpdatePaymentIntent, confirmPaymentIntent: opConfirmPaymentIntent,
  capturePaymentIntent: opCapturePaymentIntent, cancelPaymentIntent: opCancelPaymentIntent,
  listPaymentIntents: opListPaymentIntents,
  getCharge: opGetCharge, listCharges: opListCharges, captureCharge: opCaptureCharge,
  createRefund: opCreateRefund, getRefund: opGetRefund, listRefunds: opListRefunds,
};
