/**
 * PAYPAL — payout & reporting resource. createPayout / listTransactions /
 * getBalance preserved verbatim from the monolith; getPayout, getPayoutItem
 * and cancelPayoutItem added for parity. Handlers receive (config, client).
 */
import { money, num } from "../GenericFunctions.js";

async function opCreatePayout(config, client) {
  if (!config.recipientEmail || !config.amount || !config.currency) return { success: false, error: "PayPal createPayout: 'recipientEmail', 'amount', and 'currency' are required.", skipped: true };
  const body = {
    sender_batch_header: {
      sender_batch_id: `payout_${Date.now()}`,
      email_subject: config.emailSubject ?? "You have a payout!",
    },
    items: [
      {
        recipient_type: "EMAIL",
        receiver: config.recipientEmail,
        amount: { currency: String(config.currency).toUpperCase(), value: String(config.amount) },
        note: config.note ?? undefined,
      },
    ],
  };
  const { data } = await client.post(`/v1/payments/payouts`, body, { timeout: 20000 });
  return { success: true, batchId: data.batch_header?.payout_batch_id, status: data.batch_header?.batch_status };
}

async function opGetPayout(config, client) {
  if (!config.batchId) return { success: false, error: "PayPal getPayout: 'batchId' is required.", skipped: true };
  const { data } = await client.get(`/v1/payments/payouts/${client.enc(config.batchId)}`);
  return {
    success: true,
    batchId: data.batch_header?.payout_batch_id,
    status: data.batch_header?.batch_status,
    amount: data.batch_header?.amount,
    items: data.items ?? [],
  };
}

async function opGetPayoutItem(config, client) {
  if (!config.payoutItemId) return { success: false, error: "PayPal getPayoutItem: 'payoutItemId' is required.", skipped: true };
  const { data } = await client.get(`/v1/payments/payouts-item/${client.enc(config.payoutItemId)}`);
  return { success: true, id: data.payout_item_id, status: data.transaction_status, amount: data.payout_item?.amount };
}

async function opCancelPayoutItem(config, client) {
  if (!config.payoutItemId) return { success: false, error: "PayPal cancelPayoutItem: 'payoutItemId' is required.", skipped: true };
  const { data } = await client.post(`/v1/payments/payouts-item/${client.enc(config.payoutItemId)}/cancel`, {});
  return { success: true, id: data.payout_item_id, status: data.transaction_status };
}

async function opListTransactions(config, client) {
  if (!config.startDate || !config.endDate) return { success: false, error: "PayPal listTransactions: 'startDate' and 'endDate' are required (ISO 8601).", skipped: true };
  const { data } = await client.get(`/v1/reporting/transactions`, {
    timeout: 20000,
    params: { start_date: config.startDate, end_date: config.endDate, fields: "all", page_size: num(config.limit, 25, 500) },
  });
  return { success: true, transactions: data.transaction_details ?? [], totalPages: data.total_pages, totalItems: data.total_items };
}

async function opGetBalance(config, client) {
  const { data } = await client.get(`/v1/reporting/balances`, {
    params: { as_of_time: config.asOfTime ?? new Date().toISOString(), currency_code: config.currency ?? undefined },
  });
  return { success: true, balances: data.balances ?? [], accountId: data.account_id };
}

export const payoutOperations = {
  createPayout: opCreatePayout,
  getPayout: opGetPayout,
  getPayoutItem: opGetPayoutItem,
  cancelPayoutItem: opCancelPayoutItem,
  listTransactions: opListTransactions,
  getBalance: opGetBalance,
};
