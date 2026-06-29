/**
 * Reddit Poller
 * Polls Reddit's public JSON API for new posts in a subreddit.
 * No auth required. Dedup key: bb:reddit:seen:{automationId} (7-day TTL)
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const QUEUE_NAME = "bb-reddit-poller";
const SEEN_TTL = 7 * 24 * 60 * 60;

let redditQueue = null;
let redditWorker = null;

async function fetchPosts(subreddit, sort = "new") {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${sort}.json?limit=25`;
  const res = await fetch(url, {
    headers: { "User-Agent": "BlinkBox-Poller/1.0" },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Reddit: subreddit r/${subreddit} not found.`);
    throw new Error(`Reddit API ${res.status}`);
  }
  const data = await res.json();
  return (data?.data?.children || []).map((child) => {
    const p = child.data;
    return {
      id: p.id,
      title: p.title || "",
      selftext: p.selftext || "",
      url: p.url || "",
      score: p.score || 0,
      numComments: p.num_comments || 0,
      author: p.author || "",
      subreddit: p.subreddit || subreddit,
      created: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : "",
      permalink: `https://reddit.com${p.permalink || ""}`,
      thumbnail: p.thumbnail && p.thumbnail.startsWith("http") ? p.thumbnail : "",
      isNSFW: p.over_18 || false,
      flair: p.link_flair_text || "",
    };
  });
}

const SNAP_TTL = 7 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();

// Each event is a predicate over the current post (`p`), its previous snapshot
// (`prev`, may be null) and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire as score/comments climb; `needsPrev` events stay quiet
// until a baseline snapshot exists.
const REDDIT_EVENTS = {
  new_post:         { needsPrev: false, dedup: (p) => `${p.id}`, match: () => true },
  self_post:        { needsPrev: false, dedup: (p) => `${p.id}`, match: (p) => !!p.selftext },
  link_post:        { needsPrev: false, dedup: (p) => `${p.id}`, match: (p) => !p.selftext },
  title_contains:   { needsPrev: false, dedup: (p) => `${p.id}`, match: (p, _v, c) => lc(p.title).includes(lc(c.targetValue)) },
  body_contains:    { needsPrev: false, dedup: (p) => `${p.id}`, match: (p, _v, c) => lc(p.selftext).includes(lc(c.targetValue)) },
  by_author:        { needsPrev: false, dedup: (p) => `${p.id}`, match: (p, _v, c) => lc(p.author) === lc(c.targetValue).replace(/^u\//, "") },
  flair_is:         { needsPrev: false, dedup: (p) => `${p.id}`, match: (p, _v, c) => lc(p.flair) === lc(c.targetValue) },
  is_nsfw:          { needsPrev: false, dedup: (p) => `${p.id}`, match: (p) => !!p.isNSFW },
  score_over:       { needsPrev: false, changeAware: true, dedup: (p) => `${p.id}:s${p.score}`, match: (p, _v, c) => Number(p.score) >= Number(c.targetValue || 0) },
  comments_over:    { needsPrev: false, changeAware: true, dedup: (p) => `${p.id}:c${p.numComments}`, match: (p, _v, c) => Number(p.numComments) >= Number(c.targetValue || 0) },
  new_comment:      { needsPrev: true,  changeAware: true, dedup: (p) => `${p.id}:c${p.numComments}`, match: (p, prev) => Number(p.numComments) > Number(prev.numComments || 0) },
  went_hot:         { needsPrev: true,  changeAware: true, dedup: (p) => `${p.id}:hot`, match: (p, prev, c) => Number(p.score) >= Number(c.targetValue || 1000) && Number(prev.score || 0) < Number(c.targetValue || 1000) },
};

export async function pollSubreddit(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:reddit:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { subreddit, searchQuery, sort = "new", minScore } = cfg;
    if (!subreddit) return;
    const eventType = cfg.eventType || cfg.watchType || "new_post";
    const spec = REDDIT_EVENTS[eventType] || REDDIT_EVENTS.new_post;

    const posts = await fetchPosts(subreddit, sort);

    const snapKey = `bb:reddit:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;
    const nextSnap = {};
    for (const p of posts) nextSnap[p.id] = { score: p.score, numComments: p.numComments };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    const createdOnce = ["new_post", "self_post", "link_post", "title_contains", "body_contains", "by_author", "flair_is", "is_nsfw"];
    if (firstSync && (spec.needsPrev || createdOnce.includes(eventType))) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:reddit:seen:${scope}:${eventType}`;
    for (const post of posts) {
      if (!post.id) continue;
      if (minScore && post.score < parseInt(minScore)) continue;
      if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) continue;
      const prev = prevSnap[post.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(post, prev, cfg)) continue;

      const added = await redis.sadd(seenKey, spec.dedup(post));
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, post, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `reddit:${scope}:${eventType}:${spec.dedup(post)}` });
      } catch (err) {
        console.error(`[RedditPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[RedditPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startRedditPoller() {
  console.log("[RedditPoller] Starting...");
  redditQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  redditWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollSubreddit(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  redditWorker.on("failed", (job, err) => console.error(`[RedditPoller] Job failed:`, err.message));
  await syncRedditJobs();
  console.log("[RedditPoller] Ready");
}

export async function syncRedditJobs() {
  if (!redditQueue) return;
  const existing = await redditQueue.getRepeatableJobs();
  for (const job of existing) await redditQueue.removeRepeatableByKey(job.key);

  const automations = await Automation.find({ trigger: "reddit_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.subreddit) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 10;
    await redditQueue.add("reddit-poll", {
      automationId: automation._id.toString(),
      triggerNodeId: automation.entryNodeId,
      cfg: { subreddit: cfg.subreddit, searchQuery: cfg.searchQuery, sort: cfg.sort, minScore: cfg.minScore, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `reddit-${automation._id}` });
  }
  console.log(`[RedditPoller] Synced ${automations.length} automations`);
}

export async function stopRedditPoller() {
  if (redditWorker) await redditWorker.close();
  if (redditQueue) await redditQueue.close();
  redditWorker = null; redditQueue = null;
}
