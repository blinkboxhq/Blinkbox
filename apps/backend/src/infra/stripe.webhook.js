/**
 * Stripe Webhook Auto-Registrar
 *
 * Called when a stripe_trigger automation is activated.
 * Uses the Stripe REST API to create a webhook endpoint pointing at
 * the automation's BlinkBox webhook URL.
 *
 * On deactivation: deletes the Stripe webhook endpoint.
 *
 * Signature verification: Stripe signs payloads with the webhook's
 * signing_secret (whsec_...). We store this in the automation config
 * and verify it in the webhook controller using Stripe's Stripe-Signature header.
 *
 * No Stripe SDK required — uses the raw REST API to stay lean.
 */

import { BACKEND_URL } from "../config/env.js";
import Automation from "../models/automation.model.js";
import crypto from "crypto";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeRequest(path, method, apiKey, body = null) {
  const formBody = body
    ? Object.entries(body)
        .flatMap(([k, v]) => {
          if (Array.isArray(v)) return v.map((item) => `${encodeURIComponent(k)}[]=${encodeURIComponent(item)}`);
          return [`${encodeURIComponent(k)}=${encodeURIComponent(v)}`];
        })
        .join("&")
    : null;

  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "BlinkBox/1.0",
    },
    body: formBody || undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Stripe API ${method} ${path} → ${res.status}: ${json.error?.message || JSON.stringify(json)}`,
    );
  }
  return json;
}

/**
 * Register a Stripe webhook endpoint for the given automation.
 */
export async function registerStripeWebhook(automationId, events, apiKey, nodeId = null) {
  const webhookUrl = `${BACKEND_URL}/webhook/${automationId}`;

  const data = await stripeRequest("/webhook_endpoints", "POST", apiKey, {
    url: webhookUrl,
    "enabled_events[]": events.length ? events : ["payment_intent.succeeded"],
    description: `BlinkBox automation ${automationId}`,
  });

  const signingSecret = data.secret; // whsec_...

  // Persist webhook ID and signing secret into the automation config
  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode) {
      entryNode.data = entryNode.data || {};
      entryNode.data.config = {
        ...(entryNode.data.config || {}),
        stripeWebhookId: data.id,
        stripeWebhookSecret: signingSecret,
        webhookRegistered: true,
      };
    }
    await automation.save();
  }

  console.log(`[Stripe] Registered webhook ${data.id} for automation ${automationId}`);
  return { webhookId: data.id, signingSecret };
}

/**
 * Delete the Stripe webhook endpoint for the given automation.
 */
export async function unregisterStripeWebhook(automationId, webhookId, apiKey, nodeId = null) {
  try {
    await stripeRequest(`/webhook_endpoints/${webhookId}`, "DELETE", apiKey);
    console.log(`[Stripe] Deleted webhook ${webhookId}`);
  } catch (err) {
    if (!err.message.includes("No such webhook_endpoint")) throw err;
  }

  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode?.data?.config) {
      delete entryNode.data.config.stripeWebhookId;
      delete entryNode.data.config.stripeWebhookSecret;
      entryNode.data.config.webhookRegistered = false;
      await automation.save();
    }
  }
}

/**
 * Verify Stripe webhook signature.
 *
 * Stripe's signature format:
 *   Stripe-Signature: t=<timestamp>,v1=<signature>
 *
 * The signed payload is: "<timestamp>.<rawBody>"
 */
export function verifyStripeSignature(rawBody, signatureHeader, signingSecret) {
  if (!signatureHeader || !signingSecret) return false;
  try {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => p.split("=")),
    );
    const timestamp = parts.t;
    const v1 = parts.v1;
    if (!timestamp || !v1) return false;

    // Reject events older than 5 minutes to prevent replay attacks
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

    const signed = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", signingSecret).update(signed).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}
