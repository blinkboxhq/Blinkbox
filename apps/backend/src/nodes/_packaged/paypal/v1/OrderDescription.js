/**
 * PAYPAL — order & payment resource. createOrder / getOrder / captureOrder /
 * refundCapture preserved verbatim from the monolith; authorizeOrder,
 * getCapture, getRefund, getAuthorization, captureAuthorization and
 * voidAuthorization added for parity. Handlers receive (config, client).
 */
import { money } from "../GenericFunctions.js";

async function opCreateOrder(config, client) {
  if (!config.amount || !config.currency) return { success: false, error: "PayPal createOrder: 'amount' and 'currency' are required.", skipped: true };
  const body = {
    intent: config.intent ?? "CAPTURE",
    purchase_units: [
      { amount: money(config.currency, config.amount), description: config.description ?? undefined },
    ],
  };
  const { data } = await client.post(`/v2/checkout/orders`, body);
  const approveLink = data.links?.find((l) => l.rel === "approve")?.href;
  return { success: true, id: data.id, status: data.status, approveLink };
}

async function opGetOrder(config, client) {
  if (!config.orderId) return { success: false, error: "PayPal getOrder: 'orderId' is required.", skipped: true };
  const { data } = await client.get(`/v2/checkout/orders/${client.enc(config.orderId)}`);
  return { success: true, id: data.id, status: data.status, intent: data.intent, purchaseUnits: data.purchase_units };
}

async function opCaptureOrder(config, client) {
  if (!config.orderId) return { success: false, error: "PayPal captureOrder: 'orderId' is required.", skipped: true };
  const { data } = await client.post(`/v2/checkout/orders/${client.enc(config.orderId)}/capture`, {});
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return { success: true, id: data.id, status: data.status, captureId: capture?.id, amount: capture?.amount?.value, currency: capture?.amount?.currency_code };
}

async function opAuthorizeOrder(config, client) {
  if (!config.orderId) return { success: false, error: "PayPal authorizeOrder: 'orderId' is required.", skipped: true };
  const { data } = await client.post(`/v2/checkout/orders/${client.enc(config.orderId)}/authorize`, {});
  const auth = data.purchase_units?.[0]?.payments?.authorizations?.[0];
  return { success: true, id: data.id, status: data.status, authorizationId: auth?.id };
}

async function opRefundCapture(config, client) {
  if (!config.captureId) return { success: false, error: "PayPal refundCapture: 'captureId' is required.", skipped: true };
  const body = {};
  if (config.amount && config.currency) body.amount = money(config.currency, config.amount);
  if (config.note) body.note_to_payer = config.note;
  const { data } = await client.post(`/v2/payments/captures/${client.enc(config.captureId)}/refund`, body);
  return { success: true, id: data.id, status: data.status, amount: data.amount };
}

async function opGetCapture(config, client) {
  if (!config.captureId) return { success: false, error: "PayPal getCapture: 'captureId' is required.", skipped: true };
  const { data } = await client.get(`/v2/payments/captures/${client.enc(config.captureId)}`);
  return { success: true, id: data.id, status: data.status, amount: data.amount };
}

async function opGetRefund(config, client) {
  if (!config.refundId) return { success: false, error: "PayPal getRefund: 'refundId' is required.", skipped: true };
  const { data } = await client.get(`/v2/payments/refunds/${client.enc(config.refundId)}`);
  return { success: true, id: data.id, status: data.status, amount: data.amount };
}

async function opGetAuthorization(config, client) {
  if (!config.authorizationId) return { success: false, error: "PayPal getAuthorization: 'authorizationId' is required.", skipped: true };
  const { data } = await client.get(`/v2/payments/authorizations/${client.enc(config.authorizationId)}`);
  return { success: true, id: data.id, status: data.status, amount: data.amount };
}

async function opCaptureAuthorization(config, client) {
  if (!config.authorizationId) return { success: false, error: "PayPal captureAuthorization: 'authorizationId' is required.", skipped: true };
  const body = { final_capture: config.finalCapture ?? true };
  if (config.amount && config.currency) body.amount = money(config.currency, config.amount);
  if (config.note) body.note_to_payer = config.note;
  const { data } = await client.post(`/v2/payments/authorizations/${client.enc(config.authorizationId)}/capture`, body);
  return { success: true, id: data.id, status: data.status, amount: data.amount };
}

async function opVoidAuthorization(config, client) {
  if (!config.authorizationId) return { success: false, error: "PayPal voidAuthorization: 'authorizationId' is required.", skipped: true };
  await client.post(`/v2/payments/authorizations/${client.enc(config.authorizationId)}/void`, {});
  return { success: true, id: config.authorizationId, voided: true };
}

export const orderOperations = {
  createOrder: opCreateOrder,
  getOrder: opGetOrder,
  captureOrder: opCaptureOrder,
  authorizeOrder: opAuthorizeOrder,
  refundCapture: opRefundCapture,
  getCapture: opGetCapture,
  getRefund: opGetRefund,
  getAuthorization: opGetAuthorization,
  captureAuthorization: opCaptureAuthorization,
  voidAuthorization: opVoidAuthorization,
};
