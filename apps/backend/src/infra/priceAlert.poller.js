/**
 * Price Alert Poller
 * Polls CoinGecko (free, no API key) for crypto prices.
 * Fires when price freshly crosses a threshold (not on every poll).
 * State key: bb:price:state:{automationId} -> { side: "above"|"below", price: number }
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const QUEUE_NAME = "bb-price-alert-poller";
const SNAP_TTL = 30 * 24 * 60 * 60;
const SEEN_TTL = 7 * 24 * 60 * 60;

let paQueue = null;
let paWorker = null;

// Each event is a predicate over the current price data (`p`), previous snapshot
// (`prev` = {side,price,high,low}, may be null) and config (`c`). `needsPrev`
// events stay quiet until a baseline exists. Crossings dedup on the side flip so
// they fire once per crossing; threshold events dedup on the boolean state.
const PRICE_EVENTS = {
  crosses_above: { needsPrev: true,  dedup: (p, prev) => `xa:${prev?.side}`, match: (p, prev, c) => p.currentPrice >= Number(c.targetValue) && prev.side === "below" },
  crosses_below: { needsPrev: true,  dedup: (p, prev) => `xb:${prev?.side}`, match: (p, prev, c) => p.currentPrice < Number(c.targetValue) && prev.side === "above" },
  pumped:        { needsPrev: false, dedup: (p) => `pump:${Math.round(p.priceChangePercent24h)}`, match: (p, _prev, c) => p.priceChangePercent24h >= Number(c.targetValue || 10) },
  dumped:        { needsPrev: false, dedup: (p) => `dump:${Math.round(p.priceChangePercent24h)}`, match: (p, _prev, c) => p.priceChangePercent24h <= -Number(c.targetValue || 10) },
  up_24h:        { needsPrev: false, dedup: (p) => `up:${p.priceChangePercent24h > 0}`, match: (p) => p.priceChangePercent24h > 0 },
  down_24h:      { needsPrev: false, dedup: (p) => `dn:${p.priceChangePercent24h < 0}`, match: (p) => p.priceChangePercent24h < 0 },
  mcap_over:     { needsPrev: false, dedup: (p, _prev, c) => `mc:${p.marketCap >= Number(c.targetValue)}`, match: (p, _prev, c) => p.marketCap >= Number(c.targetValue || 0) },
  volume_over:   { needsPrev: false, dedup: (p, _prev, c) => `vol:${p.volume >= Number(c.targetValue)}`, match: (p, _prev, c) => p.volume >= Number(c.targetValue || 0) },
  price_equals:  { needsPrev: false, dedup: (p, _prev, c) => `eq:${c.targetValue}`, match: (p, _prev, c) => Math.abs(p.currentPrice - Number(c.targetValue)) / Number(c.targetValue || 1) <= 0.005 },
  new_high:      { needsPrev: true,  dedup: (p) => `hi:${p.currentPrice}`, match: (p, prev) => prev.high != null && p.currentPrice > Number(prev.high) },
  new_low:       { needsPrev: true,  dedup: (p) => `lo:${p.currentPrice}`, match: (p, prev) => prev.low != null && p.currentPrice < Number(prev.low) },
  change_over:   { needsPrev: false, dedup: (p) => `co:${Math.round(p.priceChangePercent24h)}`, match: (p, _prev, c) => Math.abs(p.priceChangePercent24h) >= Number(c.targetValue || 5) },
};

async function fetchPrice(coinId, currency) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "BlinkBox/1.0" },
  });
  if (!res.ok) throw new Error(`CoinGecko API ${res.status}`);
  const data = await res.json();
  const coin = data[coinId];
  if (!coin) throw new Error(`CoinGecko: coin '${coinId}' not found.`);
  return {
    currentPrice: coin[currency],
    priceChange24h: coin[`${currency}_24h_change`] || 0,
    priceChangePercent24h: coin[`${currency}_24h_change`] || 0,
    marketCap: coin[`${currency}_market_cap`] || 0,
    volume: coin[`${currency}_24h_vol`] || 0,
  };
}

export async function pollPrice(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:price:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { coinId, currency = "usd" } = cfg;
    if (!coinId) return;

    // Legacy `condition` (above/below) maps onto the crossing events; `threshold`
    // is the old name for the crossing target.
    const legacyMap = { above: "crosses_above", below: "crosses_below" };
    const evType = cfg.eventType || cfg.watchType || legacyMap[cfg.condition] || "crosses_above";
    const spec = PRICE_EVENTS[evType] || PRICE_EVENTS.crosses_above;
    const targetValue = cfg.targetValue ?? cfg.threshold;

    const priceData = await fetchPrice(coinId.toLowerCase(), currency.toLowerCase());
    const currentPrice = priceData.currentPrice;

    const snapKey = `bb:price:state:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prev = prevRaw ? JSON.parse(prevRaw) : null;
    const side = targetValue != null ? (currentPrice >= Number(targetValue) ? "above" : "below") : (prev?.side || "above");
    const high = Math.max(currentPrice, prev?.high ?? currentPrice);
    const low = Math.min(currentPrice, prev?.low ?? currentPrice);
    await redis.set(snapKey, JSON.stringify({ side, price: currentPrice, high, low }), "EX", SNAP_TTL);

    if (spec.needsPrev && !prev) return;
    const c = { targetValue };
    if (!spec.match(priceData, prev || {}, c)) return;

    const dedup = spec.dedup(priceData, prev || {}, c);
    const seenKey = `bb:price:seen:${scope}:${evType}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) return;
    await redis.expire(seenKey, SEEN_TTL);

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const payload = {
      coinId,
      symbol: coinId,
      name: coinId,
      currentPrice,
      ...priceData,
      currency: currency.toUpperCase(),
      eventType: evType,
      threshold: targetValue != null ? Number(targetValue) : null,
      high, low,
      triggeredAt: new Date().toISOString(),
    };

    try {
      await executeAutomation(automation, payload, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `price:${scope}:${evType}:${dedup}` });
      console.log(`[PriceAlert] Fired for "${automation.name}": ${coinId} ${evType}`);
    } catch (err) {
      console.error(`[PriceAlert] Failed for "${automation.name}":`, err.message);
    }
  } catch (err) {
    console.warn(`[PriceAlertPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startPriceAlertPoller() {
  console.log("[PriceAlertPoller] Starting...");
  paQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  paWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollPrice(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 5 });
  paWorker.on("failed", (job, err) => console.error(`[PriceAlertPoller] Job failed:`, err.message));
  await syncPriceAlertJobs();
  console.log("[PriceAlertPoller] Ready");
}

export async function syncPriceAlertJobs() {
  if (!paQueue) return;
  const existing = await paQueue.getRepeatableJobs();
  for (const job of existing) await paQueue.removeRepeatableByKey(job.key);

  const automations = await Automation.find({ trigger: "price_alert_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.coinId) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await paQueue.add("price-poll", {
      automationId: automation._id.toString(),
      triggerNodeId: automation.entryNodeId,
      cfg: { coinId: cfg.coinId, currency: cfg.currency, condition: cfg.condition, threshold: cfg.threshold, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `pa-${automation._id}` });
  }
  console.log(`[PriceAlertPoller] Synced ${automations.length} automations`);
}

export async function stopPriceAlertPoller() {
  if (paWorker) await paWorker.close();
  if (paQueue) await paQueue.close();
  paWorker = null; paQueue = null;
}
