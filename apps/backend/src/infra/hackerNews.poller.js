/**
 * Hacker News Poller
 * Polls HN Algolia API for new stories matching a keyword or by points threshold.
 * No auth required. Dedup key: bb:hn:seen:{automationId} (7-day TTL).
 */
import { Queue, Worker } from "./bullmq.prefixed.js";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const QUEUE_NAME = "bb-hn-poller";
const SEEN_TTL = 7 * 24 * 60 * 60;
const SNAP_TTL = 7 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();
let hnQueue = null;
let hnWorker = null;

// Pull the newest items and the current front page in one normalized batch so
// "trending" / "front page" events have something to diff against the by-date feed.
async function fetchStories(query, minPoints = 0) {
  const q = query ? `&query=${encodeURIComponent(query)}` : "";
  const urls = [
    `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=30${q}`,
    `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30${q}`,
  ];
  const batches = await Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const data = await res.json();
      return data.hits || [];
    } catch { return []; }
  }));

  const frontIds = new Set((batches[1] || []).map((h) => String(h.objectID)));
  const byId = new Map();
  for (const h of [...batches[0], ...batches[1]]) {
    const id = String(h.objectID);
    if (byId.has(id)) continue;
    const tags = h._tags || [];
    const title = h.title || h.story_title || "";
    byId.set(id, {
      id,
      title,
      url: h.url || h.story_url || `https://news.ycombinator.com/item?id=${id}`,
      author: h.author || "",
      points: h.points || 0,
      numComments: h.num_comments || 0,
      createdAt: h.created_at,
      onFrontPage: frontIds.has(id),
      isAsk: /^ask hn[:]?/i.test(title) || tags.includes("ask_hn"),
      isShow: /^show hn[:]?/i.test(title) || tags.includes("show_hn"),
      isJob: tags.includes("job") || /^.+ is hiring/i.test(title),
      isPoll: tags.includes("poll"),
    });
  }
  const list = [...byId.values()];
  return minPoints ? list.filter((s) => s.points >= minPoints) : list;
}

// Each event is a predicate over the current story (`s`), its previous snapshot
// (`prev`, may be null) and config (`c`). Points/comments climb after posting, so
// `changeAware` events dedup on a changing token; `needsPrev` events stay quiet
// until a baseline snapshot exists.
const HN_EVENTS = {
  new_story:      { needsPrev: false, dedup: (s) => `${s.id}`, match: () => true },
  title_contains: { needsPrev: false, dedup: (s) => `${s.id}`, match: (s, _p, c) => lc(s.title).includes(lc(c.targetValue)) },
  by_author:      { needsPrev: false, dedup: (s) => `${s.id}`, match: (s, _p, c) => lc(s.author) === lc(c.targetValue) },
  domain_is:      { needsPrev: false, dedup: (s) => `${s.id}`, match: (s, _p, c) => lc(s.url).includes(lc(c.targetValue)) },
  ask_hn:         { needsPrev: false, dedup: (s) => `${s.id}`, match: (s) => s.isAsk },
  show_hn:        { needsPrev: false, dedup: (s) => `${s.id}`, match: (s) => s.isShow },
  job_post:       { needsPrev: false, dedup: (s) => `${s.id}`, match: (s) => s.isJob },
  points_over:    { needsPrev: false, changeAware: true, dedup: (s) => `${s.id}:p${s.points}`, match: (s, _p, c) => Number(s.points) >= Number(c.targetValue || 0) },
  comments_over:  { needsPrev: false, changeAware: true, dedup: (s) => `${s.id}:c${s.numComments}`, match: (s, _p, c) => Number(s.numComments) >= Number(c.targetValue || 0) },
  new_comment:    { needsPrev: true,  changeAware: true, dedup: (s) => `${s.id}:c${s.numComments}`, match: (s, prev) => Number(s.numComments) > Number(prev.numComments || 0) },
  hit_front_page: { needsPrev: true,  dedup: (s) => `${s.id}:front`, match: (s, prev) => s.onFrontPage && !prev.onFrontPage },
  went_viral:     { needsPrev: true,  changeAware: true, dedup: (s) => `${s.id}:viral`, match: (s, prev, c) => Number(s.points) >= Number(c.targetValue || 500) && Number(prev.points || 0) < Number(c.targetValue || 500) },
};

export async function pollHackerNews(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:hn:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const query = cfg.query || cfg.keyword;
    const minPoints = parseInt(cfg.minPoints) || 0;
    const eventType = cfg.eventType || cfg.watchType || "new_story";
    const spec = HN_EVENTS[eventType] || HN_EVENTS.new_story;

    const stories = await fetchStories(query, minPoints);
    if (!stories.length) return;

    const snapKey = `bb:hn:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;
    const nextSnap = {};
    for (const s of stories) nextSnap[s.id] = { points: s.points, numComments: s.numComments, onFrontPage: s.onFrontPage };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    // Only "new_story" needs to skip the first sync — every story in that initial
    // pull would otherwise look "new". Content predicates (title_contains, ask_hn,
    // domain_is, etc.) describe the story itself, not its novelty, so they fire on
    // first sync too.
    if (firstSync && (spec.needsPrev || eventType === "new_story")) return;

    const seenKey = `bb:hn:seen:${scope}:${eventType}`;
    for (const story of stories) {
      const prev = prevSnap[story.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(story, prev, cfg)) continue;

      const added = await redis.sadd(seenKey, spec.dedup(story));
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, story, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `hn:${scope}:${eventType}:${spec.dedup(story)}` });
      } catch (err) {
        console.error(`[HNPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[HNPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startHackerNewsPoller() {
  console.log("[HNPoller] Starting...");
  hnQueue = new Queue(QUEUE_NAME, { connection: createBullMQConnection(), defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } } });
  hnWorker = new Worker(QUEUE_NAME, async (job) => { await pollHackerNews(job.data.automationId, job.data.triggerNodeId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 4 });
  hnWorker.on("failed", (job, err) => console.error(`[HNPoller] Job failed:`, err.message));
  await syncHNJobs();
  console.log("[HNPoller] Ready");
}

export async function syncHNJobs() {
  if (!hnQueue) return;
  const existing = await hnQueue.getRepeatableJobs();
  for (const job of existing) await hnQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "hackernews_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    const interval = parseInt(cfg.pollIntervalMinutes) || 15;
    await hnQueue.add("hn-poll", { automationId: automation._id.toString(), triggerNodeId: automation.entryNodeId, cfg: { query: cfg.query || cfg.keyword, minPoints: cfg.minPoints, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue } }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `hn-${automation._id}` });
  }
  console.log(`[HNPoller] Synced ${automations.length} automations`);
}

export async function stopHackerNewsPoller() {
  if (hnWorker) await hnWorker.close();
  if (hnQueue) await hnQueue.close();
  hnWorker = null; hnQueue = null;
}
