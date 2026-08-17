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

import { Queue, Worker } from "./bullmq.prefixed.js";
import Parser from "rss-parser";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { assertSafeUrl } from "../utils/ssrf.js";

const RSS_QUEUE_NAME = "bb-rss-poller";
const SEEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

let rssQueue = null;
let rssWorker = null;

// ── Sanitize XML namespace names (media:content → media_content) ──────────────
function sanitizeXmlName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

const rssParser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "BlinkBox-RSS-Poller/1.0",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
  },
  xml2js: {
    tagNameProcessors: [sanitizeXmlName],
    attrNameProcessors: [sanitizeXmlName],
  },
  customFields: {
    item: ["media_content", "media_thumbnail", "enclosure", "dc_creator", "content_encoded"],
  },
});

async function parseFeed(url) {
  assertSafeUrl(url);
  return rssParser.parseURL(url);
}

function normalizeItem(item) {
  return {
    title:       item.title        ?? "",
    link:        item.link         ?? item.guid ?? "",
    guid:        item.guid         ?? item.link ?? item.title ?? "",
    description: item.contentSnippet ?? item.content ?? item.summary ?? "",
    content:     item.content_encoded ?? item.content ?? "",
    pubDate:     item.isoDate      ?? item.pubDate ?? item.updated ?? null,
    isoDate:     item.isoDate      ?? null,
    author:      item.creator      ?? item.dc_creator ?? item.author ?? "",
    categories:  item.categories   ?? [],
    enclosure:   item.enclosure    ?? item.media_content ?? null,
    thumbnail:   item.media_thumbnail?._?.url ?? item.media_content?._?.url ?? null,
  };
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

// Title/description/content keyword match. Comma-separated terms; matchAll=false
// means any term is enough, matchAll=true means every term must appear.
function matchesKeyword(item, keyword, matchAll) {
  const terms = String(keyword || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!terms.length) return true;
  const hay = `${item.title} ${item.description} ${item.content}`.toLowerCase();
  return matchAll ? terms.every((t) => hay.includes(t)) : terms.some((t) => hay.includes(t));
}

const lc = (s) => String(s ?? "").toLowerCase();
const encType = (item) => lc(item.enclosure?.type || item.enclosure?.["$"]?.type || "");
const encUrl = (item) => item.enclosure?.url || item.enclosure?.["$"]?.url || item.thumbnail || "";
const isToday = (item) => {
  if (!item.pubDate) return false;
  const d = new Date(item.pubDate);
  const n = new Date();
  return d.getUTCFullYear() === n.getUTCFullYear() && d.getUTCMonth() === n.getUTCMonth() && d.getUTCDate() === n.getUTCDate();
};

// RSS items are immutable once published, so every event is a one-shot
// classification of a newly-seen item. `eventType` (via configExtra) selects one
// predicate; dedup is the feed's stable guid.
const RSS_EVENTS = {
  new_item:        (i) => true,
  title_contains:  (i, c) => lc(i.title).includes(lc(c.targetValue)),
  body_contains:   (i, c) => `${lc(i.description)} ${lc(i.content)}`.includes(lc(c.targetValue)),
  by_author:       (i, c) => lc(i.author) === lc(c.targetValue) || lc(i.author).includes(lc(c.targetValue)),
  in_category:     (i, c) => (i.categories || []).some((cat) => lc(typeof cat === "string" ? cat : cat?._ || cat?.name || "").includes(lc(c.targetValue))),
  link_domain:     (i, c) => lc(i.link).includes(lc(c.targetValue)),
  has_media:       (i) => !!(i.enclosure || i.thumbnail),
  has_image:       (i) => !!i.thumbnail || encType(i).startsWith("image") || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(encUrl(i)),
  podcast_episode: (i) => encType(i).startsWith("audio") || /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(encUrl(i)),
  video_item:      (i) => encType(i).startsWith("video") || /\.(mp4|webm|mov)(\?|$)/i.test(encUrl(i)),
  published_today: (i) => isToday(i),
  long_read:       (i, c) => `${i.description} ${i.content}`.length >= Number(c.targetValue || 2000),
};

export async function pollFeed(automationId, triggerNodeId, feedUrl, onlyNew, keyword, matchAll, eventType, targetValue) {
  const scope = triggerNodeId || automationId;
  const evType = eventType || "new_item";
  const predicate = RSS_EVENTS[evType] || RSS_EVENTS.new_item;
  const seenKey = `bb:rss:seen:${scope}:${evType}`;

  // Per-automation poll lock to prevent concurrent ticks from processing the same feed
  const pollLockKey = `bb:rss:lock:${scope}`;
  const pollLocked = await acquireLock(pollLockKey, "poller", 60);
  if (!pollLocked) {
    console.warn(`[RSS] Automation ${automationId} already polling, skipping concurrent tick`);
    return;
  }

  try {
    let feed;
    try {
      feed = await parseFeed(feedUrl);
    } catch (err) {
      console.warn(`[RSS] Failed to fetch/parse feed for ${automationId}: ${err.message}`);
      return;
    }

    const rawItems = feed.items ?? [];
    if (!rawItems.length) return;

    const { executeAutomation } = await import(
      "../modules/automation/automation.executor.js"
    );

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const feedMeta = {
      title:       feed.title       ?? "",
      description: feed.description ?? "",
      link:        feed.link        ?? feedUrl,
      language:    feed.language    ?? "",
    };

    for (const rawItem of rawItems) {
      const item = normalizeItem(rawItem);
      const guid = item.guid || item.link || item.title;
      if (!guid) continue;

      if (!matchesKeyword(item, keyword, matchAll)) continue;
      if (!predicate(item, { targetValue })) continue;

      if (onlyNew) {
        const claimed = await claimIfUnseen(seenKey, guid, SEEN_TTL_SECONDS);
        if (!claimed) continue;
      }

      try {
        await executeAutomation(
          automation,
          { ...item, feed: feedMeta, feedUrl },
          { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `rss:${scope}:${evType}:${guid}` },
        );
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
      const { automationId, triggerNodeId, feedUrl, onlyNew, keyword, matchAll, eventType, targetValue } = job.data;
      await pollFeed(automationId, triggerNodeId, feedUrl, onlyNew, keyword, matchAll, eventType, targetValue);
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
    const keyword = cfg.keyword || "";
    const matchAll = !!cfg.matchAll;
    const eventType = cfg.eventType || cfg.watchType || "new_item";
    const targetValue = cfg.targetValue || "";

    if (!feedUrl) {
      console.warn(`[RSSPoller] Automation ${automation._id} has no feedUrl, skipping`);
      continue;
    }

    await rssQueue.add(
      "rss-poll",
      { automationId: automation._id.toString(), triggerNodeId: automation.entryNodeId, feedUrl, onlyNew, keyword, matchAll, eventType, targetValue },
      { repeat: { pattern: pollInterval }, jobId: `rss-${automation._id}` },
    );

    console.log(`[RSSPoller] Registered: "${automation.name}" → ${feedUrl} every ${pollInterval}`);
  }

  console.log(`[RSSPoller] Synced ${rssAutomations.length} RSS automations`);
}

export async function addRssJob(automationId, triggerNodeId, feedUrl, pollInterval, onlyNew, keyword, matchAll) {
  if (!rssQueue) return;
  await rssQueue.add(
    "rss-poll",
    { automationId: automationId.toString(), triggerNodeId, feedUrl, onlyNew, keyword: keyword || "", matchAll: !!matchAll },
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
