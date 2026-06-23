/**
 * YouTube Poller
 * Polls YouTube Data API v3 for new videos from a channel.
 * Dedup key: bb:yt:seen:{automationId} (Redis Set, 7-day TTL)
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import Credential from "../models/credential.model.js";
import { decrypt } from "../utils/crypto.js";

const QUEUE_NAME = "bb-youtube-poller";
const SEEN_TTL = 7 * 24 * 60 * 60;

let ytQueue = null;
let ytWorker = null;

async function resolveApiKey(credentialId, workspaceId) {
  const cred = await Credential.findOne({ _id: credentialId, workspaceId });
  if (!cred) throw new Error("YouTube credential not found");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

async function fetchVideos(channelId, apiKey, maxResults = 5) {
  const url = `https://www.googleapis.com/youtube/v3/search?channelId=${encodeURIComponent(channelId)}&order=date&type=video&maxResults=${maxResults}&part=snippet&key=${apiKey}`;
  const res = await fetch(url, { headers: { "User-Agent": "BlinkBox/1.0" } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube API ${res.status}: ${err.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return (data.items || []).map((item) => ({
    videoId: item.id?.videoId,
    title: item.snippet?.title || "",
    description: item.snippet?.description || "",
    publishedAt: item.snippet?.publishedAt || "",
    channelId: item.snippet?.channelId || channelId,
    channelTitle: item.snippet?.channelTitle || "",
    thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
    url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : "",
  }));
}

export async function pollChannel(automationId, credentialId, workspaceId, channelId, maxResults) {
  const lockKey = `bb:yt:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const apiKey = await resolveApiKey(credentialId, workspaceId);
    const videos = await fetchVideos(channelId, apiKey, maxResults || 5);
    if (!videos.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:yt:seen:${automationId}`;
    for (const video of videos) {
      if (!video.videoId) continue;
      const added = await redis.sadd(seenKey, video.videoId);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, video, { workspaceId: automation.workspaceId, idempotencyKey: `yt:${automation._id}:${video.videoId}` });
      } catch (err) {
        console.error(`[YouTubePoller] Failed for automation "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[YouTubePoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startYouTubePoller() {
  console.log("[YouTubePoller] Starting...");
  ytQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  ytWorker = new Worker(QUEUE_NAME, async (job) => {
    const { automationId, credentialId, workspaceId, channelId, maxResults } = job.data;
    await pollChannel(automationId, credentialId, workspaceId, channelId, maxResults);
  }, { connection: createBullMQConnection(), concurrency: 3 });
  ytWorker.on("failed", (job, err) => console.error(`[YouTubePoller] Job failed:`, err.message));
  await syncYouTubeJobs();
  console.log("[YouTubePoller] Ready");
}

export async function syncYouTubeJobs() {
  if (!ytQueue) return;
  const existing = await ytQueue.getRepeatableJobs();
  for (const job of existing) await ytQueue.removeRepeatableByKey(job.key);

  const automations = await Automation.find({ trigger: "youtube_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.channelId || !cfg.credentialId) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 15;
    await ytQueue.add("yt-poll", {
      automationId: automation._id.toString(),
      credentialId: cfg.credentialId,
      workspaceId: automation.workspaceId.toString(),
      channelId: cfg.channelId,
      maxResults: cfg.maxResults || 5,
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `yt-${automation._id}` });
  }
  console.log(`[YouTubePoller] Synced ${automations.length} automations`);
}

export async function stopYouTubePoller() {
  if (ytWorker) await ytWorker.close();
  if (ytQueue) await ytQueue.close();
  ytWorker = null; ytQueue = null;
}
