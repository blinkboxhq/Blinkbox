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

let paQueue = null;
let paWorker = null;

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

export async function pollPrice(automationId, cfg) {
  const lockKey = `bb:price:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { coinId, currency = "usd", condition = "below", threshold } = cfg;
    if (!coinId || threshold == null) return;

    const thresholdNum = parseFloat(threshold);
    const priceData = await fetchPrice(coinId.toLowerCase(), currency.toLowerCase());
    const currentPrice = priceData.currentPrice;

    const currentSide = currentPrice >= thresholdNum ? "above" : "below";
    const stateKey = `bb:price:state:${automationId}`;
    const prevStateStr = await redis.get(stateKey);
    const prevState = prevStateStr ? JSON.parse(prevStateStr) : null;

    await redis.set(stateKey, JSON.stringify({ side: currentSide, price: currentPrice }), "EX", 86400);

    // Only fire when threshold is freshly crossed
    const shouldFire =
      condition === "above" ? (currentSide === "above" && (!prevState || prevState.side === "below")) :
      condition === "below" ? (currentSide === "below" && (!prevState || prevState.side === "above")) :
      false;

    if (!shouldFire) return;

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
      condition,
      threshold: thresholdNum,
      triggeredAt: new Date().toISOString(),
    };

    try {
      const crossKey = `price:${automation._id}:${coinId}:${condition}:${Math.floor(Date.now() / 60000)}`;
      await executeAutomation(automation, payload, { workspaceId: automation.workspaceId, idempotencyKey: crossKey });
      console.log(`[PriceAlert] Fired for "${automation.name}": ${coinId} ${condition} ${threshold}`);
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
    await pollPrice(job.data.automationId, job.data.cfg);
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
      cfg: { coinId: cfg.coinId, currency: cfg.currency, condition: cfg.condition, threshold: cfg.threshold },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `pa-${automation._id}` });
  }
  console.log(`[PriceAlertPoller] Synced ${automations.length} automations`);
}

export async function stopPriceAlertPoller() {
  if (paWorker) await paWorker.close();
  if (paQueue) await paQueue.close();
  paWorker = null; paQueue = null;
}
