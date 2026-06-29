import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const BASE = "https://graph.instagram.com/v18.0";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull the connected account's most-recent media and normalize the fields the
// event predicates compare. Instagram auth is an OAuth token passed as the
// access_token query param (getOAuthToken auto-refreshes). Counts mutate over
// time, so the snapshot tracks like/comment counts for engagement events.
async function fetchMedia(token) {
  const fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink";
  const res = await fetch(`${BASE}/me/media?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`Instagram API ${res.status}`);
  const data = await res.json();
  return (data.data || []).map((m) => ({
    id: String(m.id || ""),
    caption: m.caption || "",
    mediaType: m.media_type || "",
    mediaUrl: m.media_url || "",
    thumbnailUrl: m.thumbnail_url || "",
    permalink: m.permalink || "",
    likes: m.like_count ?? 0,
    comments: m.comments_count ?? 0,
    timestamp: m.timestamp || "",
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();

// Each event is a predicate over the current media (`m`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire as engagement crosses thresholds; `needsPrev` events stay
// quiet until a baseline snapshot exists.
const INSTAGRAM_EVENTS = {
  new_post:           { needsPrev: false, dedup: (m) => `${m.id}`, match: (m, p) => !p },
  new_image:          { needsPrev: false, dedup: (m) => `${m.id}`, match: (m, p) => !p && lc(m.mediaType) === "image" },
  new_video:          { needsPrev: false, dedup: (m) => `${m.id}`, match: (m, p) => !p && (lc(m.mediaType) === "video" || lc(m.mediaType) === "reel") },
  new_carousel:       { needsPrev: false, dedup: (m) => `${m.id}`, match: (m, p) => !p && lc(m.mediaType) === "carousel_album" },
  caption_contains:   { needsPrev: false, dedup: (m) => `${m.id}`, match: (m, _p, c) => lc(m.caption).includes(lc(c.targetValue)) },
  hashtag_used:       { needsPrev: false, dedup: (m) => `${m.id}`, match: (m, _p, c) => lc(m.caption).includes(`#${lc(c.targetValue).replace(/^#/, "")}`) },
  media_type_is:      { needsPrev: false, dedup: (m) => `${m.id}`, match: (m, _p, c) => lc(m.mediaType) === lc(c.targetValue) },
  likes_over:         { needsPrev: false, changeAware: true, dedup: (m) => `${m.id}:l${m.likes}`, match: (m, _p, c) => Number(m.likes) >= Number(c.targetValue || 0) },
  comments_over:      { needsPrev: false, changeAware: true, dedup: (m) => `${m.id}:c${m.comments}`, match: (m, _p, c) => Number(m.comments) >= Number(c.targetValue || 0) },
  new_like:           { needsPrev: true,  changeAware: true, dedup: (m) => `${m.id}:l${m.likes}`, match: (m, p) => Number(m.likes) > Number(p.likes || 0) },
  new_comment:        { needsPrev: true,  changeAware: true, dedup: (m) => `${m.id}:c${m.comments}`, match: (m, p) => Number(m.comments) > Number(p.comments || 0) },
  went_viral:         { needsPrev: true,  changeAware: true, dedup: (m) => `${m.id}:viral`, match: (m, p, c) => Number(m.likes) >= Number(c.targetValue || 1000) && Number(p.likes || 0) < Number(c.targetValue || 1000) },
};

export async function pollInstagram(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:instagram:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId } = cfg;
    if (!credentialId) return;
    const eventType = cfg.eventType || cfg.watchType || "new_post";
    const spec = INSTAGRAM_EVENTS[eventType] || INSTAGRAM_EVENTS.new_post;

    const token = await getOAuthToken(credentialId, workspaceId, "Instagram Trigger");
    const media = await fetchMedia(token);
    if (!media.length) return;

    const snapKey = `bb:instagram:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const m of media) nextSnap[m.id] = { likes: m.likes, comments: m.comments };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    const createdOnce = ["new_post", "new_image", "new_video", "new_carousel"];
    if (firstSync && (spec.needsPrev || createdOnce.includes(eventType))) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:instagram:seen:${scope}:${eventType}`;
    for (const m of media) {
      const prev = prevSnap[m.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(m, prev, cfg)) continue;

      const dedup = spec.dedup(m);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          mediaId: m.id, caption: m.caption, mediaType: m.mediaType,
          mediaUrl: m.mediaUrl, thumbnailUrl: m.thumbnailUrl, permalink: m.permalink,
          likes: m.likes, comments: m.comments, timestamp: m.timestamp,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `instagram:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[InstagramPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[InstagramPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
