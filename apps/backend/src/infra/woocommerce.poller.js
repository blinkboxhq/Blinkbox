import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// WooCommerce credentials are a JSON {consumerKey, consumerSecret} blob in the
// vault; older single-string creds fall back to key-only.
async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "WooCommerce Trigger");
  try {
    return JSON.parse(raw);
  } catch {
    return { consumerKey: raw, consumerSecret: "" };
  }
}

// Pull the most-recently-created orders from a store and normalize the fields
// the event predicates compare. Auth is HTTP Basic with the WC API key pair.
async function fetchOrders(storeUrl, consumerKey, consumerSecret) {
  const base = storeUrl.replace(/\/$/, "") + "/wp-json/wc/v3";
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch(`${base}/orders?per_page=50&orderby=date&order=desc`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`WooCommerce API ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((o) => ({
    id: String(o.id),
    number: o.number || String(o.id),
    status: o.status || "",
    total: Number(o.total || 0),
    currency: o.currency || "",
    email: o.billing?.email || "",
    customerName: `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim(),
    customerId: Number(o.customer_id || 0),
    paymentMethod: o.payment_method_title || "",
    itemCount: (o.line_items || []).reduce((n, li) => n + Number(li.quantity || 0), 0),
    dateCreated: o.date_created,
    dateModified: o.date_modified,
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// Each event is a predicate over the current order (`o`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire on each transition; `needsPrev` events stay quiet until
// a baseline snapshot exists.
const WOO_EVENTS = {
  order_created:   { needsPrev: false, dedup: (o) => `${o.id}`, match: (o, p) => !p },
  order_updated:   { needsPrev: true,  changeAware: true, dedup: (o) => `${o.id}:${o.dateModified}`, match: (o, p) => o.dateModified && o.dateModified !== p.dateModified },
  status_changed:  { needsPrev: true,  changeAware: true, dedup: (o) => `${o.id}:${o.status}`, match: (o, p) => o.status !== p.status },
  processing:      { needsPrev: false, changeAware: true, dedup: (o) => `${o.id}:processing`, match: (o, p) => o.status === "processing" && (!p || p.status !== "processing") },
  completed:       { needsPrev: false, changeAware: true, dedup: (o) => `${o.id}:completed`, match: (o, p) => o.status === "completed" && (!p || p.status !== "completed") },
  on_hold:         { needsPrev: false, dedup: (o) => `${o.id}:onhold`, match: (o) => o.status === "on-hold" },
  cancelled:       { needsPrev: false, dedup: (o) => `${o.id}:cancelled`, match: (o) => o.status === "cancelled" },
  refunded:        { needsPrev: false, dedup: (o) => `${o.id}:refunded`, match: (o) => o.status === "refunded" },
  failed:          { needsPrev: false, dedup: (o) => `${o.id}:failed`, match: (o) => o.status === "failed" },
  high_value:      { needsPrev: false, dedup: (o) => `${o.id}:hv`, match: (o, _p, c) => o.total >= num(c.targetValue, 1) },
  guest_order:     { needsPrev: false, dedup: (o) => `${o.id}:guest`, match: (o) => o.customerId === 0 },
  status_is:       { needsPrev: false, changeAware: true, dedup: (o) => `${o.id}:${o.status}`, match: (o, _p, c) => lc(o.status) === lc(c.targetValue) },
};

export async function pollWooCommerce(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:woo:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, storeUrl } = cfg;
    if (!credentialId || !storeUrl) return;
    const eventType = cfg.eventType || cfg.watchType || "order_created";
    const spec = WOO_EVENTS[eventType] || WOO_EVENTS.order_created;

    const { consumerKey, consumerSecret } = await getCreds(credentialId, workspaceId);
    if (!consumerKey) return;
    const orders = await fetchOrders(storeUrl, consumerKey, consumerSecret);
    if (!orders.length) return;

    const snapKey = `bb:woo:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const o of orders) nextSnap[o.id] = { status: o.status, dateModified: o.dateModified };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "order_created")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:woo:seen:${scope}:${eventType}`;
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
          orderId: o.id, orderNumber: o.number, status: o.status,
          total: o.total, currency: o.currency, email: o.email,
          customerName: o.customerName, customerId: o.customerId,
          paymentMethod: o.paymentMethod, itemCount: o.itemCount,
          createdAt: o.dateCreated, updatedAt: o.dateModified,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `woo:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[WooPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[WooPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
