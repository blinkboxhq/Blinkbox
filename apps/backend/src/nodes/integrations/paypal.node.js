/**
 * PAYPAL NODE
 * Interact with the PayPal REST API for payments and orders.
 *
 * Operations:
 *   createOrder       — Create a PayPal order (checkout flow)
 *   getOrder          — Retrieve an order by ID
 *   captureOrder      — Capture (complete) an approved order
 *   createPayout      — Send a payout to a PayPal account
 *   listTransactions  — List transaction history
 *   getBalance        — Get account balance
 *   refundCapture     — Refund a captured payment
 *
 * Auth: Credential stored in vault as JSON {"clientId":"...", "clientSecret":"..."}
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api-m.paypal.com";

async function getCredentials(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "PayPal");
  if (typeof raw === "object" && raw.clientId) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.clientId || !parsed.clientSecret) throw new Error("Missing clientId or clientSecret");
    return parsed;
  } catch {
    throw new Error("PayPal credential must be JSON with clientId and clientSecret.");
  }
}

async function getAccessToken(clientId, clientSecret) {
  const b64 = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const { data } = await axios.post(
    `${BASE}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: { Authorization: `Basic ${b64}`, "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    }
  );
  if (!data.access_token) throw new Error("PayPal OAuth token exchange returned no access_token.");
  return data.access_token;
}

function handleError(err) {
  if (err.message?.startsWith("PayPal")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.details?.[0]?.description ?? err.message;
  if (status === 401) throw new Error(`PayPal: Auth failed — ${msg}. Check your clientId and clientSecret.`);
  if (status === 403) throw new Error(`PayPal: Permission denied — ${msg}.`);
  if (status === 404) throw new Error(`PayPal: Resource not found — ${msg}.`);
  if (status === 400 || status === 422) throw new Error(`PayPal: Bad request — ${msg}.`);
  if (status === 429) throw new Error(`PayPal: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`PayPal: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`PayPal: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "createOrder" } = config;

    if (!config.credentialId) {
      return { success: false, error: "PayPal: No credential selected.", skipped: true };
    }

    let credentials;
    try {
      credentials = await getCredentials(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `PayPal: Could not resolve credential — ${e.message}`, skipped: true };
    }

    let accessToken;
    try {
      accessToken = await getAccessToken(credentials.clientId, credentials.clientSecret);
    } catch (e) {
      return { success: false, error: `PayPal: OAuth token exchange failed — ${e.message}`, skipped: true };
    }

    const h = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    try {
      switch (operation) {
        case "createOrder": {
          if (!config.amount || !config.currency) return { success: false, error: "PayPal createOrder: 'amount' and 'currency' are required.", skipped: true };
          const body = {
            intent: config.intent ?? "CAPTURE",
            purchase_units: [
              {
                amount: { currency_code: config.currency.toUpperCase(), value: String(config.amount) },
                description: config.description ?? undefined,
              },
            ],
          };
          const { data } = await axios.post(`${BASE}/v2/checkout/orders`, body, { headers: h, timeout: 15000 });
          const approveLink = data.links?.find((l) => l.rel === "approve")?.href;
          return { success: true, id: data.id, status: data.status, approveLink };
        }

        case "getOrder": {
          if (!config.orderId) return { success: false, error: "PayPal getOrder: 'orderId' is required.", skipped: true };
          const { data } = await axios.get(`${BASE}/v2/checkout/orders/${encodeURIComponent(config.orderId)}`, { headers: h, timeout: 15000 });
          return { success: true, id: data.id, status: data.status, intent: data.intent, purchaseUnits: data.purchase_units };
        }

        case "captureOrder": {
          if (!config.orderId) return { success: false, error: "PayPal captureOrder: 'orderId' is required.", skipped: true };
          const { data } = await axios.post(`${BASE}/v2/checkout/orders/${encodeURIComponent(config.orderId)}/capture`, {}, { headers: h, timeout: 15000 });
          const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
          return { success: true, id: data.id, status: data.status, captureId: capture?.id, amount: capture?.amount?.value, currency: capture?.amount?.currency_code };
        }

        case "createPayout": {
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
                amount: { currency: config.currency.toUpperCase(), value: String(config.amount) },
                note: config.note ?? undefined,
              },
            ],
          };
          const { data } = await axios.post(`${BASE}/v1/payments/payouts`, body, { headers: h, timeout: 20000 });
          return { success: true, batchId: data.batch_header?.payout_batch_id, status: data.batch_header?.batch_status };
        }

        case "listTransactions": {
          if (!config.startDate || !config.endDate) return { success: false, error: "PayPal listTransactions: 'startDate' and 'endDate' are required (ISO 8601).", skipped: true };
          const { data } = await axios.get(`${BASE}/v1/reporting/transactions`, {
            headers: h,
            timeout: 20000,
            params: { start_date: config.startDate, end_date: config.endDate, fields: "all", page_size: Math.min(Number(config.limit ?? 25), 500) },
          });
          return { success: true, transactions: data.transaction_details ?? [], totalPages: data.total_pages, totalItems: data.total_items };
        }

        case "getBalance": {
          const { data } = await axios.get(`${BASE}/v1/reporting/balances`, {
            headers: h,
            timeout: 15000,
            params: { as_of_time: config.asOfTime ?? new Date().toISOString(), currency_code: config.currency ?? undefined },
          });
          return { success: true, balances: data.balances ?? [], accountId: data.account_id };
        }

        case "refundCapture": {
          if (!config.captureId) return { success: false, error: "PayPal refundCapture: 'captureId' is required.", skipped: true };
          const body = {};
          if (config.amount && config.currency) body.amount = { currency_code: config.currency.toUpperCase(), value: String(config.amount) };
          if (config.note) body.note_to_payer = config.note;
          const { data } = await axios.post(`${BASE}/v2/payments/captures/${encodeURIComponent(config.captureId)}/refund`, body, { headers: h, timeout: 15000 });
          return { success: true, id: data.id, status: data.status, amount: data.amount };
        }

        default:
          throw new Error(`PayPal: Unknown operation "${operation}".`);
      }
    } catch (err) {
      handleError(err);
    }
  },
};
