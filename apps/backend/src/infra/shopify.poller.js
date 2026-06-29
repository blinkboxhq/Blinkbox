import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull the most-recently-updated orders for a shop and normalize the fields the
// event predicates compare. `shop` is the *.myshopify.com domain.
async function fetchOrders(token, shop) {
  const BASE = `https://${shop}/admin/api/2024-04`;
  const url = `${BASE}/orders.json?status=any&limit=50&order=updated_at+desc`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Shopify API ${res.status}`);
  const data = await res.json();
  return (data.orders || []).map((o) => ({
    id: String(o.id),
    name: o.name || "",
    email: o.email || "",
    financialStatus: o.financial_status || "",
    fulfillmentStatus: o.fulfillment_status || "unfulfilled",
    totalPrice: Number(o.total_price || 0),
    currency: o.currency || "",
    cancelledAt: o.cancelled_at || null,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    tags: o.tags || "",
    note: o.note || "",
    test: !!o.test,
    itemCount: (o.line_items || []).reduce((n, li) => n + Number(li.quantity || 0), 0),
    customerName: o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : "",
    ordersCount: o.customer ? Number(o.customer.orders_count || 0) : 0,
    url: o.order_status_url || "",
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// Each event is a predicate over the current order (`o`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire on each transition; `needsPrev` events stay quiet until
// a baseline snapshot exists.
const SHOPIFY_EVENTS = {
  order_created:   { needsPrev: false, dedup: (o) => `${o.id}`, match: (o, p) => !p },
  order_updated:   { needsPrev: true,  changeAware: true, dedup: (o) => `${o.id}:${o.updatedAt}`, match: (o, p) => o.updatedAt && o.updatedAt !== p.updatedAt },
  order_paid:      { needsPrev: false, changeAware: true, dedup: (o) => `${o.id}:paid`, match: (o, p) => o.financialStatus === "paid" && (!p || p.financialStatus !== "paid") },
  order_pending:   { needsPrev: false, dedup: (o) => `${o.id}:pending`, match: (o) => o.financialStatus === "pending" },
  order_refunded:  { needsPrev: false, changeAware: true, dedup: (o) => `${o.id}:${o.financialStatus}`, match: (o) => o.financialStatus === "refunded" || o.financialStatus === "partially_refunded" },
  order_cancelled: { needsPrev: false, dedup: (o) => `${o.id}:cancelled`, match: (o) => !!o.cancelledAt },
  order_fulfilled: { needsPrev: false, changeAware: true, dedup: (o) => `${o.id}:fulfilled`, match: (o, p) => o.fulfillmentStatus === "fulfilled" && (!p || p.fulfillmentStatus !== "fulfilled") },
  partial_fulfill: { needsPrev: false, dedup: (o) => `${o.id}:partial`, match: (o) => o.fulfillmentStatus === "partial" },
  unfulfilled:     { needsPrev: false, dedup: (o) => `${o.id}:unfulfilled`, match: (o) => o.fulfillmentStatus === "unfulfilled" && o.financialStatus === "paid" && !o.cancelledAt },
  high_value:      { needsPrev: false, dedup: (o) => `${o.id}:hv`, match: (o, _p, c) => o.totalPrice >= num(c.targetValue, 1) },
  new_customer:    { needsPrev: false, dedup: (o) => `${o.id}:newcust`, match: (o) => o.ordersCount <= 1 },
  has_tag:         { needsPrev: false, changeAware: true, dedup: (o) => `${o.id}:${o.updatedAt}`, match: (o, _p, c) => lc(o.tags).split(",").map((t) => t.trim()).includes(lc(c.targetValue)) },
};

export async function pollShopify(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:shopify:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, shop } = cfg;
    if (!credentialId || !shop) return;
    const eventType = cfg.eventType || cfg.watchType || "order_created";
    const spec = SHOPIFY_EVENTS[eventType] || SHOPIFY_EVENTS.order_created;

    const token = await getOAuthToken(credentialId, workspaceId, "Shopify Trigger");
    const orders = await fetchOrders(token, shop);
    if (!orders.length) return;

    const snapKey = `bb:shopify:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const o of orders) {
      nextSnap[o.id] = {
        financialStatus: o.financialStatus, fulfillmentStatus: o.fulfillmentStatus,
        updatedAt: o.updatedAt,
      };
    }
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "order_created")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:shopify:seen:${scope}:${eventType}`;
    for (const o of orders) {
      const prev = prevSnap[o.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(o, prev, cfg)) continue;

      const dedup = spec.dedup(o);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          orderId: o.id, orderName: o.name, email: o.email,
          financialStatus: o.financialStatus, fulfillmentStatus: o.fulfillmentStatus,
          totalPrice: o.totalPrice, currency: o.currency, itemCount: o.itemCount,
          customerName: o.customerName, ordersCount: o.ordersCount,
          tags: o.tags, note: o.note, cancelledAt: o.cancelledAt,
          createdAt: o.createdAt, updatedAt: o.updatedAt, url: o.url,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `shopify:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[ShopifyPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[ShopifyPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
