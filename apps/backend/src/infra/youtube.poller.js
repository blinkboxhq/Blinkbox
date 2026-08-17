/**
 * YouTube Poller
 * Polls YouTube Data API v3 for new videos from a channel.
 * Dedup key: bb:yt:seen:{automationId} (Redis Set, 7-day TTL)
 */
import { Queue, Worker } from "./bullmq.prefixed.js";
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

const API = "https://www.googleapis.com/youtube/v3";

async function ytGet(path, params, apiKey) {
  params.set("key", apiKey);
  const res = await fetch(`${API}/${path}?${params.toString()}`, { headers: { "User-Agent": "BlinkBox/1.0" } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube API ${res.status}: ${err.error?.message || res.statusText}`);
  }
  return res.json();
}

function videoShape(snippet, videoId, extra = {}) {
  return {
    videoId,
    title: snippet?.title || "",
    description: snippet?.description || "",
    publishedAt: snippet?.publishedAt || "",
    channelId: snippet?.channelId || "",
    channelTitle: snippet?.channelTitle || "",
    thumbnailUrl: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || "",
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
    ...extra,
  };
}

// A search over the channel, optionally narrowed by eventType / q. Used by the
// video, short, live, upcoming and keyword events. Returns shaped videos.
async function searchVideos(channelId, apiKey, maxResults, { eventType, q } = {}) {
  const params = new URLSearchParams({
    channelId, order: "date", type: "video", part: "snippet",
    maxResults: String(maxResults || 5),
  });
  if (eventType) params.set("eventType", eventType);
  if (q) params.set("q", q);
  const data = await ytGet("search", params, apiKey);
  return (data.items || [])
    .filter((i) => i.id?.videoId)
    .map((i) => videoShape(i.snippet, i.id.videoId, { liveStatus: i.snippet?.liveBroadcastContent || "none" }));
}

// videos.list enriches search hits with statistics + contentDetails so we can
// gate on views / likes / duration (shorts).
async function enrichVideos(videos, apiKey) {
  const ids = videos.map((v) => v.videoId).filter(Boolean).slice(0, 50);
  if (!ids.length) return videos;
  const params = new URLSearchParams({ part: "statistics,contentDetails", id: ids.join(",") });
  const data = await ytGet("videos", params, apiKey);
  const byId = {};
  for (const v of data.items || []) byId[v.id] = v;
  return videos.map((v) => {
    const d = byId[v.videoId];
    if (!d) return v;
    return {
      ...v,
      viewCount: parseInt(d.statistics?.viewCount || "0", 10),
      likeCount: parseInt(d.statistics?.likeCount || "0", 10),
      commentCount: parseInt(d.statistics?.commentCount || "0", 10),
      durationSec: iso8601ToSeconds(d.contentDetails?.duration || ""),
    };
  });
}

function iso8601ToSeconds(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

async function fetchComments(channelId, apiKey, maxResults) {
  const params = new URLSearchParams({
    allThreadsRelatedToChannelId: channelId, part: "snippet",
    order: "time", maxResults: String(maxResults || 10),
  });
  const data = await ytGet("commentThreads", params, apiKey);
  return (data.items || []).map((t) => {
    const c = t.snippet?.topLevelComment?.snippet || {};
    return {
      id: t.id,
      commentId: t.snippet?.topLevelComment?.id,
      text: c.textDisplay || "",
      author: c.authorDisplayName || "",
      authorChannelUrl: c.authorChannelUrl || "",
      likeCount: c.likeCount || 0,
      publishedAt: c.publishedAt || "",
      videoId: t.snippet?.videoId || "",
      url: t.snippet?.videoId ? `https://www.youtube.com/watch?v=${t.snippet.videoId}` : "",
    };
  });
}

async function fetchActivities(channelId, apiKey, maxResults) {
  const params = new URLSearchParams({
    channelId, part: "snippet,contentDetails",
    maxResults: String(maxResults || 10),
  });
  const data = await ytGet("activities", params, apiKey);
  return (data.items || []).map((a) => ({
    id: a.id,
    type: a.snippet?.type || "",
    title: a.snippet?.title || "",
    description: a.snippet?.description || "",
    publishedAt: a.snippet?.publishedAt || "",
    channelId: a.snippet?.channelId || channelId,
    playlistId: a.contentDetails?.playlistItem?.playlistId || "",
    videoId: a.contentDetails?.upload?.videoId || a.contentDetails?.playlistItem?.resourceId?.videoId || "",
  }));
}

// Each event = a distinct YouTube Data API call (and an optional client gate).
const YT_EVENTS = {
  new_video:      { kind: "search", search: {},                          dedup: (v) => v.videoId },
  new_short:      { kind: "search", search: {}, enrich: true, match: (v) => (v.durationSec || 0) > 0 && v.durationSec <= 60, dedup: (v) => v.videoId },
  new_long:       { kind: "search", search: {}, enrich: true, match: (v) => (v.durationSec || 0) > 60, dedup: (v) => v.videoId },
  live_now:       { kind: "search", search: { eventType: "live" },       dedup: (v) => v.videoId },
  upcoming_stream:{ kind: "search", search: { eventType: "upcoming" },    dedup: (v) => v.videoId },
  keyword_video:  { kind: "search", search: (cfg) => ({ q: cfg.searchQuery }), dedup: (v) => v.videoId },
  popular_video:  { kind: "search", search: {}, enrich: true, match: (v, cfg) => v.viewCount >= (parseInt(cfg.minViews) || 1000), dedup: (v) => `${v.videoId}:pop` },
  highly_liked:   { kind: "search", search: {}, enrich: true, match: (v, cfg) => v.likeCount >= (parseInt(cfg.minLikes) || 100), dedup: (v) => `${v.videoId}:liked` },
  new_comment:    { kind: "comments",                                     dedup: (c) => c.commentId || c.id },
  playlist_update:{ kind: "activities", match: (a) => a.type === "playlistItem", dedup: (a) => a.id },
  channel_activity:{ kind: "activities", match: () => true,               dedup: (a) => a.id },
  social_post:    { kind: "activities", match: (a) => a.type === "social" || a.type === "bulletin", dedup: (a) => a.id },
};

async function fetchForEvent(spec, channelId, apiKey, maxResults, cfg) {
  if (spec.kind === "comments") return fetchComments(channelId, apiKey, maxResults);
  if (spec.kind === "activities") return fetchActivities(channelId, apiKey, maxResults);
  const search = typeof spec.search === "function" ? spec.search(cfg) : spec.search;
  let items = await searchVideos(channelId, apiKey, maxResults, search);
  if (spec.enrich) items = await enrichVideos(items, apiKey);
  return items;
}

export async function pollChannel(automationId, triggerNodeId, credentialId, workspaceId, channelId, maxResults, cfg = {}) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:yt:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const eventType = cfg.eventType || cfg.watchType || "new_video";
    const spec = YT_EVENTS[eventType] || YT_EVENTS.new_video;
    const apiKey = await resolveApiKey(credentialId, workspaceId);
    const items = await fetchForEvent(spec, channelId, apiKey, maxResults || 10, cfg);
    if (!items.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:yt:seen:${scope}:${eventType}`;
    for (const item of items) {
      if (spec.match && !spec.match(item, cfg)) continue;
      const dedup = spec.dedup(item);
      if (!dedup) continue;
      const added = await redis.sadd(seenKey, dedup);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, item, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `yt:${scope}:${eventType}:${dedup}` });
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
    const { automationId, triggerNodeId, credentialId, workspaceId, channelId, maxResults, cfg } = job.data;
    await pollChannel(automationId, triggerNodeId, credentialId, workspaceId, channelId, maxResults, cfg);
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
      triggerNodeId: automation.entryNodeId,
      credentialId: cfg.credentialId,
      workspaceId: automation.workspaceId.toString(),
      channelId: cfg.channelId,
      maxResults: cfg.maxResults || 10,
      cfg: { eventType: cfg.eventType || cfg.watchType, searchQuery: cfg.searchQuery, minViews: cfg.minViews, minLikes: cfg.minLikes },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `yt-${automation._id}` });
  }
  console.log(`[YouTubePoller] Synced ${automations.length} automations`);
}

export async function stopYouTubePoller() {
  if (ytWorker) await ytWorker.close();
  if (ytQueue) await ytQueue.close();
  ytWorker = null; ytQueue = null;
}
