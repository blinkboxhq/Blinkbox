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

export async function pollSubreddit(automationId, cfg) {
  const lockKey = `bb:reddit:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { subreddit, searchQuery, sort = "new", minScore } = cfg;
    if (!subreddit) return;

    const posts = await fetchPosts(subreddit, sort);

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:reddit:seen:${automationId}`;
    for (const post of posts) {
      if (!post.id) continue;
      if (minScore && post.score < parseInt(minScore)) continue;
      if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) continue;

      const added = await redis.sadd(seenKey, post.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, post, { workspaceId: automation.workspaceId, idempotencyKey: `reddit:${automation._id}:${post.id}` });
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
    await pollSubreddit(job.data.automationId, job.data.cfg);
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
      cfg: { subreddit: cfg.subreddit, searchQuery: cfg.searchQuery, sort: cfg.sort, minScore: cfg.minScore },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `reddit-${automation._id}` });
  }
  console.log(`[RedditPoller] Synced ${automations.length} automations`);
}

export async function stopRedditPoller() {
  if (redditWorker) await redditWorker.close();
  if (redditQueue) await redditQueue.close();
  redditWorker = null; redditQueue = null;
}
