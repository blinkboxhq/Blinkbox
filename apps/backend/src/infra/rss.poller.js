/**
 * RSS / Atom Feed Poller
 *
 * Polls RSS/Atom feeds on a per-automation cron schedule.
 * Each active rss_trigger automation gets a BullMQ repeatable job.
 * On each tick, the poller fetches the feed, diffs against a Redis
 * set of seen GUIDs, and fires the automation once per new item.
 *
 * Seen-item deduplication key: bb:rss:seen:{automationId}
 * TTL: 30 days (items older than that are considered new again — fine for feeds).
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const RSS_QUEUE_NAME = "bb-rss-poller";
const SEEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

let rssQueue = null;
let rssWorker = null;

// ── Minimal RSS/Atom parser (no external dep) ─────────────────────────────────

function extractText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return "";
  // Strip CDATA wrappers
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function parseItems(xml) {
  // Support both RSS <item> and Atom <entry>
  const itemTag = xml.includes("<entry") ? "entry" : "item";
  const itemRe = new RegExp(`<${itemTag}[\\s>]([\\s\\S]*?)<\\/${itemTag}>`, "gi");
  const items = [];
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const chunk = m[1];
    // Atom uses <id> for guid, RSS uses <guid>
    const guid =
      extractText(chunk, "guid") ||
      extractText(chunk, "id") ||
      extractText(chunk, "link");

    // Atom uses <updated> for pubDate
    const pubDate =
      extractText(chunk, "pubDate") ||
      extractText(chunk, "published") ||
      extractText(chunk, "updated");

    // Atom uses <summary> or <content> for description
    const description =
      extractText(chunk, "description") ||
      extractText(chunk, "summary") ||
      extractText(chunk, "content");

    items.push({
      title: extractText(chunk, "title"),
      link: extractText(chunk, "link"),
      description,
      pubDate,
      author: extractText(chunk, "author") || extractText(chunk, "dc:creator"),
      guid,
      content: extractText(chunk, "content:encoded") || extractText(chunk, "content"),
    });
  }
  return items;
}

async function fetchFeed(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "BlinkBox-RSS-Poller/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ── Poller logic ──────────────────────────────────────────────────────────────

/**
 * Atomically claim an unseen RSS item.
 * Returns 1 if we claimed it (was not previously seen), 0 if already seen.
 * Using SADD is inherently atomic — if two concurrent workers call it for the
 * same guid, only one gets a return value of 1 (the one that added it).
 */
async function claimIfUnseen(seenKey, guid, ttl) {
  const added = await redis.sadd(seenKey, guid);
  if (added) await redis.expire(seenKey, ttl);
  return added === 1;
}

async function pollFeed(automationId, feedUrl, onlyNew) {
  const seenKey = `bb:rss:seen:${automationId}`;

  // Per-automation poll lock to prevent concurrent ticks from processing the same feed
  const pollLockKey = `bb:rss:lock:${automationId}`;
  const pollLocked = await acquireLock(pollLockKey, "poller", 60);
  if (!pollLocked) {
    console.warn(`[RSS] Automation ${automationId} already polling, skipping concurrent tick`);
    return;
  }

  try {
    let xml;
    try {
      xml = await fetchFeed(feedUrl);
    } catch (err) {
      console.warn(`[RSS] Failed to fetch feed for ${automationId}: ${err.message}`);
      return;
    }

    const items = parseItems(xml);
    if (!items.length) return;

    const { executeAutomation } = await import(
      "../modules/automation/automation.executor.js"
    );

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    for (const item of items) {
      const guid = item.guid || item.link || item.title;
      if (!guid) continue;

      if (onlyNew) {
        // SADD is atomic: only the first worker to call it for this guid claims it.
        // Return value 1 means we added it (claimed); 0 means already seen.
        const claimed = await claimIfUnseen(seenKey, guid, SEEN_TTL_SECONDS);
        if (!claimed) continue;
      }

      try {
        await executeAutomation(automation, { item, feedUrl }, { workspaceId: automation.workspaceId });
        console.log(`[RSS] Fired automation "${automation.name}" for item: "${item.title}"`);
      } catch (err) {
        console.error(`[RSS] Failed to fire automation "${automation.name}":`, err.message);
      }
    }
  } finally {
    await releaseLock(pollLockKey, "poller");
  }
}

// ── BullMQ setup ──────────────────────────────────────────────────────────────

export async function startRssPoller() {
  console.log("[RSSPoller] Starting...");

  rssQueue = new Queue(RSS_QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  });

  rssWorker = new Worker(
    RSS_QUEUE_NAME,
    async (job) => {
      const { automationId, feedUrl, onlyNew } = job.data;
      await pollFeed(automationId, feedUrl, onlyNew);
    },
    { connection: createBullMQConnection(), concurrency: 4 },
  );

  rssWorker.on("failed", (job, err) => {
    console.error(`[RSSPoller] Job failed for ${job?.data?.automationId}:`, err.message);
  });

  await syncRssJobs();
  console.log("[RSSPoller] Ready");
}

export async function syncRssJobs() {
  if (!rssQueue) return;

  // Clean slate
  const existing = await rssQueue.getRepeatableJobs();
  for (const job of existing) {
    await rssQueue.removeRepeatableByKey(job.key);
  }

  const rssAutomations = await Automation.find({ trigger: "rss_trigger", active: true });

  for (const automation of rssAutomations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    const feedUrl = cfg.feedUrl;
    const pollInterval = cfg.pollInterval || "*/15 * * * *";
    const onlyNew = cfg.onlyNew ?? true;

    if (!feedUrl) {
      console.warn(`[RSSPoller] Automation ${automation._id} has no feedUrl, skipping`);
      continue;
    }

    await rssQueue.add(
      "rss-poll",
      { automationId: automation._id.toString(), feedUrl, onlyNew },
      { repeat: { pattern: pollInterval }, jobId: `rss-${automation._id}` },
    );

    console.log(`[RSSPoller] Registered: "${automation.name}" → ${feedUrl} every ${pollInterval}`);
  }

  console.log(`[RSSPoller] Synced ${rssAutomations.length} RSS automations`);
}

export async function addRssJob(automationId, feedUrl, pollInterval, onlyNew) {
  if (!rssQueue) return;
  await rssQueue.add(
    "rss-poll",
    { automationId: automationId.toString(), feedUrl, onlyNew },
    { repeat: { pattern: pollInterval || "*/15 * * * *" }, jobId: `rss-${automationId}` },
  );
}

export async function removeRssJob(automationId) {
  if (!rssQueue) return;
  const jobs = await rssQueue.getRepeatableJobs();
  for (const job of jobs) {
    if (job.id === `rss-${automationId}`) {
      await rssQueue.removeRepeatableByKey(job.key);
    }
  }
}

export async function stopRssPoller() {
  if (rssWorker) await rssWorker.close();
  if (rssQueue) await rssQueue.close();
  rssWorker = null;
  rssQueue = null;
}
