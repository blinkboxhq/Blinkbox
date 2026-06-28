/**
 * Hacker News Poller
 * Polls HN Algolia API for new stories matching a keyword or by points threshold.
 * No auth required. Dedup key: bb:hn:seen:{automationId} (7-day TTL).
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const QUEUE_NAME = "bb-hn-poller";
const SEEN_TTL = 7 * 24 * 60 * 60;
let hnQueue = null;
let hnWorker = null;

async function fetchStories(query, storyType = "story", minPoints = 0) {
  const tags = `(story,comment)`.includes(storyType) ? storyType : "story";
  let url = `https://hn.algolia.com/api/v1/search_by_date?tags=${tags}&hitsPerPage=20`;
  if (query) url += `&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HN API ${res.status}`);
  const data = await res.json();
  return (data.hits || []).filter(h => !minPoints || (h.points || 0) >= minPoints);
}

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
    const storyType = cfg.storyType || cfg.feedType || "story";
    const minPoints = cfg.minPoints || 0;
    const stories = await fetchStories(query, storyType, parseInt(minPoints));
    const seenKey = `bb:hn:seen:${scope}`;
    for (const story of stories) {
      const id = String(story.objectID);
      const added = await redis.sadd(seenKey, id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      await executeAutomation(automation, {
        id, title: story.title || "", url: story.url || `https://news.ycombinator.com/item?id=${id}`,
        author: story.author || "", points: story.points || 0, numComments: story.num_comments || 0,
        createdAt: story.created_at, storyType,
      }, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `hn:${scope}:${id}` });
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
  hnWorker = new Worker(QUEUE_NAME, async (job) => { await pollHackerNews(job.data.automationId, job.data.cfg); }, { connection: createBullMQConnection(), concurrency: 4 });
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
    await hnQueue.add("hn-poll", { automationId: automation._id.toString(), cfg: { query: cfg.query || cfg.keyword, storyType: cfg.storyType || cfg.feedType, minPoints: cfg.minPoints } }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `hn-${automation._id}` });
  }
  console.log(`[HNPoller] Synced ${automations.length} automations`);
}

export async function stopHackerNewsPoller() {
  if (hnWorker) await hnWorker.close();
  if (hnQueue) await hnQueue.close();
  hnWorker = null; hnQueue = null;
}
