import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const BASE = "https://open.tiktokapis.com/v2";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;
const FIELDS = "id,title,video_description,create_time,like_count,comment_count,share_count,view_count,embed_link";

// Pull the connected creator's most-recent videos and normalize the fields the
// event predicates compare. TikTok auth is a Bearer OAuth token (auto-refreshed).
// /video/list takes `fields` in the query string and `max_count` in the body.
// Engagement counts mutate over time, so the snapshot tracks them for delta
// and threshold events.
async function fetchVideos(token) {
  const res = await fetch(`${BASE}/video/list/?fields=${encodeURIComponent(FIELDS)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ max_count: 20 }),
  });
  if (!res.ok) throw new Error(`TikTok API ${res.status}`);
  const data = await res.json();
  return (data.data?.videos || []).map((v) => ({
    id: String(v.id || ""),
    title: v.title || "",
    description: v.video_description || "",
    createTime: v.create_time ?? null,
    likes: v.like_count ?? 0,
    comments: v.comment_count ?? 0,
    shares: v.share_count ?? 0,
    views: v.view_count ?? 0,
    embedLink: v.embed_link || "",
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();

// Each event is a predicate over the current video (`v`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire as engagement grows; `needsPrev` events stay quiet until
// a baseline snapshot exists.
const TIKTOK_EVENTS = {
  new_video:          { needsPrev: false, dedup: (v) => `${v.id}`, match: (v, p) => !p },
  title_contains:     { needsPrev: false, dedup: (v) => `${v.id}`, match: (v, _p, c) => lc(v.title).includes(lc(c.targetValue)) },
  description_contains:{ needsPrev: false, dedup: (v) => `${v.id}`, match: (v, _p, c) => lc(v.description).includes(lc(c.targetValue)) },
  hashtag_used:       { needsPrev: false, dedup: (v) => `${v.id}`, match: (v, _p, c) => `${lc(v.title)} ${lc(v.description)}`.includes(`#${lc(c.targetValue).replace(/^#/, "")}`) },
  views_over:         { needsPrev: false, changeAware: true, dedup: (v) => `${v.id}:vw${v.views}`, match: (v, _p, c) => Number(v.views) >= Number(c.targetValue || 0) },
  likes_over:         { needsPrev: false, changeAware: true, dedup: (v) => `${v.id}:lk${v.likes}`, match: (v, _p, c) => Number(v.likes) >= Number(c.targetValue || 0) },
  comments_over:      { needsPrev: false, changeAware: true, dedup: (v) => `${v.id}:cm${v.comments}`, match: (v, _p, c) => Number(v.comments) >= Number(c.targetValue || 0) },
  shares_over:        { needsPrev: false, changeAware: true, dedup: (v) => `${v.id}:sh${v.shares}`, match: (v, _p, c) => Number(v.shares) >= Number(c.targetValue || 0) },
  new_like:           { needsPrev: true,  changeAware: true, dedup: (v) => `${v.id}:lk${v.likes}`, match: (v, p) => Number(v.likes) > Number(p.likes || 0) },
  new_comment:        { needsPrev: true,  changeAware: true, dedup: (v) => `${v.id}:cm${v.comments}`, match: (v, p) => Number(v.comments) > Number(p.comments || 0) },
  new_share:          { needsPrev: true,  changeAware: true, dedup: (v) => `${v.id}:sh${v.shares}`, match: (v, p) => Number(v.shares) > Number(p.shares || 0) },
  went_viral:         { needsPrev: true,  changeAware: true, dedup: (v) => `${v.id}:viral`, match: (v, p, c) => Number(v.views) >= Number(c.targetValue || 100000) && Number(p.views || 0) < Number(c.targetValue || 100000) },
};

export async function pollTikTok(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:tiktok:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId } = cfg;
    if (!credentialId) return;
    const eventType = cfg.eventType || cfg.watchType || "new_video";
    const spec = TIKTOK_EVENTS[eventType] || TIKTOK_EVENTS.new_video;

    const token = await getOAuthToken(credentialId, workspaceId, "TikTok Trigger");
    const videos = await fetchVideos(token);
    if (!videos.length) return;

    const snapKey = `bb:tiktok:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const v of videos) nextSnap[v.id] = { likes: v.likes, comments: v.comments, shares: v.shares, views: v.views };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "new_video")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:tiktok:seen:${scope}:${eventType}`;
    for (const v of videos) {
      const prev = prevSnap[v.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(v, prev, cfg)) continue;

      const dedup = spec.dedup(v);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          videoId: v.id, title: v.title, description: v.description,
          likes: v.likes, comments: v.comments, shares: v.shares, views: v.views,
          embedLink: v.embedLink, createTime: v.createTime,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `tiktok:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[TikTokPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[TikTokPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
