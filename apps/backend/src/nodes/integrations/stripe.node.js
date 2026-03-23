/**
 * STRIPE NODE
 *
 * Manages Stripe customers, charges, and invoices via the Stripe REST API.
 * Replaces the old http_request wrapper — handles form-urlencoded encoding,
 * credential vault integration, and proper error classification.
 *
 * Config:
 *   credentialId — Vault reference to Stripe secret key (type: "bearer" or "api_key")
 *   action       — "create_customer" | "create_charge" | "list_customers" | "create_invoice"
 *   email        — Customer email (for create_customer)
 *   customerName — Customer name (for create_customer)
 *   amount       — Amount in cents (for create_charge)
 *   currency     — ISO currency code (for create_charge, default: "usd")
 *   customerId   — Customer ID (for create_invoice)
 *
 * Output:
 *   { id, object, ...stripe_response_fields }
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE_URL = "https://api.stripe.com";

const ACTIONS = {
  create_customer: { method: "POST", path: "/v1/customers" },
  create_charge:   { method: "POST", path: "/v1/charges" },
  list_customers:  { method: "GET",  path: "/v1/customers" },
  create_invoice:  { method: "POST", path: "/v1/invoices" },
};

export default {
  async run(config, input, context = {}) {
    const {
      credentialId,
      action = "create_customer",
      email,
      customerName,
      amount,
      currency = "usd",
      customerId,
    } = config;

    const actionDef = ACTIONS[action];
    if (!actionDef) {
      throw new Error(`Stripe: Unknown action "${action}". Supported: ${Object.keys(ACTIONS).join(", ")}`);
    }

    // Vault: resolve + decrypt Stripe secret key
    const cred = await resolveCredential(credentialId, context.workspaceId, "Stripe");
    const secretKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // Build form-urlencoded body based on action
    const params = new URLSearchParams();

    switch (action) {
      case "create_customer":
        if (email) params.append("email", email);
        if (customerName) params.append("name", customerName);
        break;
      case "create_charge":
        if (!amount) throw new Error("Stripe: 'amount' is required for create_charge.");
        params.append("amount", String(amount));
        params.append("currency", currency);
        break;
      case "create_invoice":
        if (!customerId) throw new Error("Stripe: 'customerId' is required for create_invoice.");
        params.append("customer", customerId);
        break;
      case "list_customers":
        params.append("limit", "10");
        break;
    }

    try {
      const response = await axios({
        url: `${BASE_URL}${actionDef.path}`,
        method: actionDef.method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: actionDef.method === "POST" ? params.toString() : undefined,
        params: actionDef.method === "GET" ? Object.fromEntries(params) : undefined,
        timeout: 30000,
      });

      const data = response.data;

      // Normalize list responses to match single-object shape
      if (action === "list_customers") {
        return {
          records: data.data || [],
          hasMore: data.has_more || false,
          totalReturned: data.data?.length || 0,
        };
      }

      return {
        id: data.id,
        object: data.object,
        ...data,
      };
    } catch (err) {
      const status = err.response?.status;
      const stripeError = err.response?.data?.error;
      const msg = stripeError?.message || err.message;

      if (status === 401) {
        throw new Error("Stripe: Invalid API key. Check your credential in the Vault — make sure it's a secret key (sk_...), not a publishable key.");
      }
      if (status === 402) {
        throw new Error(`Stripe: Payment failed — ${msg}`);
      }
      if (status === 429) {
        throw new Error("Stripe: Rate limit exceeded. Retry later.");
      }
      if (status === 400) {
        throw new Error(`Stripe: Bad request — ${msg}`);
      }
      throw new Error(`Stripe failed: ${status || err.code} — ${msg}`);
    }
  },
};
