/**
 * Stripe — Payouts, Balance, Disputes, Payment Methods, Setup Intents,
 * Transfers & Events.
 */
import { ok, list, need, enc, lim, csv } from "../GenericFunctions.js";

async function opCreatePayout(config, req) {
  let e = need(config, "amount", "createPayout"); if (e) return e;
  e = need(config, "currency", "createPayout"); if (e) return e;
  return ok(await req("POST", "/payouts", { amount: config.amount, currency: config.currency, description: config.description }));
}
async function opListPayouts(config, req) {
  return list(await req("GET", "/payouts", { status: config.status, limit: lim(config.limit, 10) }));
}
async function opGetBalance(config, req) {
  return ok(await req("GET", "/balance"));
}
async function opListBalanceTransactions(config, req) {
  return list(await req("GET", "/balance_transactions", { type: config.type, limit: lim(config.limit, 10) }));
}

async function opListDisputes(config, req) {
  return list(await req("GET", "/disputes", { charge: config.chargeId, limit: lim(config.limit, 10) }));
}
async function opGetDispute(config, req) {
  const e = need(config, "disputeId", "getDispute"); if (e) return e;
  return ok(await req("GET", `/disputes/${enc(config.disputeId)}`));
}
async function opCloseDispute(config, req) {
  const e = need(config, "disputeId", "closeDispute"); if (e) return e;
  return ok(await req("POST", `/disputes/${enc(config.disputeId)}/close`));
}

async function opAttachPaymentMethod(config, req) {
  let e = need(config, "paymentMethodId", "attachPaymentMethod"); if (e) return e;
  e = need(config, "customerId", "attachPaymentMethod"); if (e) return e;
  return ok(await req("POST", `/payment_methods/${enc(config.paymentMethodId)}/attach`, { customer: config.customerId }));
}
async function opDetachPaymentMethod(config, req) {
  const e = need(config, "paymentMethodId", "detachPaymentMethod"); if (e) return e;
  return ok(await req("POST", `/payment_methods/${enc(config.paymentMethodId)}/detach`));
}
async function opListPaymentMethods(config, req) {
  const e = need(config, "customerId", "listPaymentMethods"); if (e) return e;
  return list(await req("GET", "/payment_methods", { customer: config.customerId, type: config.type || "card", limit: lim(config.limit, 10) }));
}
async function opCreateSetupIntent(config, req) {
  return ok(await req("POST", "/setup_intents", { customer: config.customerId, payment_method_types: csv(config.type || "card") }));
}

async function opCreateTransfer(config, req) {
  let e = need(config, "amount", "createTransfer"); if (e) return e;
  e = need(config, "currency", "createTransfer"); if (e) return e;
  e = need(config, "destination", "createTransfer"); if (e) return e;
  return ok(await req("POST", "/transfers", { amount: config.amount, currency: config.currency, destination: config.destination }));
}
async function opListTransfers(config, req) {
  return list(await req("GET", "/transfers", { destination: config.destination, limit: lim(config.limit, 10) }));
}
async function opListEvents(config, req) {
  return list(await req("GET", "/events", { type: config.type, limit: lim(config.limit, 10) }));
}
async function opGetEvent(config, req) {
  const e = need(config, "eventId", "getEvent"); if (e) return e;
  return ok(await req("GET", `/events/${enc(config.eventId)}`));
}

export const financeOperations = {
  createPayout: opCreatePayout, listPayouts: opListPayouts, getBalance: opGetBalance,
  listBalanceTransactions: opListBalanceTransactions,
  listDisputes: opListDisputes, getDispute: opGetDispute, closeDispute: opCloseDispute,
  attachPaymentMethod: opAttachPaymentMethod, detachPaymentMethod: opDetachPaymentMethod,
  listPaymentMethods: opListPaymentMethods, createSetupIntent: opCreateSetupIntent,
  createTransfer: opCreateTransfer, listTransfers: opListTransfers,
  listEvents: opListEvents, getEvent: opGetEvent,
};
