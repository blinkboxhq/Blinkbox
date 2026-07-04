/**
 * Shopify Webhook Auto-Registrar
 *
 * Called when a shopify_trigger automation is activated. Uses the Shopify
 * Admin REST API to create a webhook subscription on the shop pointing at the
 * automation's BlinkBox webhook URL, then tears it down on deactivation.
 *
 * Signature: Shopify signs every webhook with the app's API secret and sends
 * the digest in X-Shopify-Hmac-Sha256 (base64). There is no per-webhook secret,
 * so we store the shared secret (SHOPIFY_API_SECRET) into the trigger config as
 * `shopifyWebhookSecret` for the inbound controller to verify against.
 *
 * eventType (order_created, order_paid, …) maps to a Shopify topic
 * (orders/create, orders/paid, …). One webhook per active trigger node.
 */

import { BACKEND_URL, SHOPIFY_API_SECRET } from "../config/env.js";
import Automation from "../models/automation.model.js";

const API_VERSION = "2024-04";

// Our internal eventType → Shopify webhook topic.
const TOPIC_MAP = {
  order_created: "orders/create",
  order_updated: "orders/updated",
  order_paid: "orders/paid",
  order_pending: "orders/create",
  order_refunded: "refunds/create",
  order_cancelled: "orders/cancelled",
  order_fulfilled: "orders/fulfilled",
  product_created: "products/create",
  product_updated: "products/update",
  customer_created: "customers/create",
  customer_updated: "customers/update",
};

async function shopifyRequest(shop, path, method, token, body = null) {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}${path}`, {
    method,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      "User-Agent": "BlinkBox/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Shopify API ${method} ${path} → ${res.status}: ${json.errors ? JSON.stringify(json.errors) : JSON.stringify(json)}`,
    );
  }
  return json;
}

export async function registerShopifyWebhook(automationId, shop, eventType, token, nodeId = null) {
  if (!SHOPIFY_API_SECRET) {
    throw new Error(
      "Shopify trigger requires SHOPIFY_API_SECRET to verify webhook signatures. Set it in the backend env.",
    );
  }
  const topic = TOPIC_MAP[eventType] || TOPIC_MAP.order_created;
  const webhookUrl = `${BACKEND_URL}/webhook/${automationId}`;

  const data = await shopifyRequest(shop, "/webhooks.json", "POST", token, {
    webhook: { topic, address: webhookUrl, format: "json" },
  });
  const webhookId = data.webhook?.id;

  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode) {
      entryNode.data = entryNode.data || {};
      entryNode.data.config = {
        ...(entryNode.data.config || {}),
        shopifyWebhookId: webhookId,
        shopifyWebhookSecret: SHOPIFY_API_SECRET,
        webhookRegistered: true,
      };
    }
    await automation.save();
  }

  console.log(`[Shopify] Registered webhook ${webhookId} (${topic}) on ${shop} for automation ${automationId}`);
  return { webhookId };
}

export async function unregisterShopifyWebhook(automationId, shop, webhookId, token, nodeId = null) {
  try {
    await shopifyRequest(shop, `/webhooks/${webhookId}.json`, "DELETE", token);
    console.log(`[Shopify] Deleted webhook ${webhookId} from ${shop}`);
  } catch (err) {
    if (!err.message.includes("404")) throw err;
  }

  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode?.data?.config) {
      delete entryNode.data.config.shopifyWebhookId;
      delete entryNode.data.config.shopifyWebhookSecret;
      entryNode.data.config.webhookRegistered = false;
      await automation.save();
    }
  }
}
