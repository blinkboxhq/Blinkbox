import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

// Each event = a distinct Mastodon API call. Notification events hit
// /notifications with a single type[] filter; timeline events hit a real
// timeline/status endpoint. `eventType` (via configExtra) selects the entry.
const MASTODON_EVENTS = {
  mention:        { kind: "notif",    notifType: "mention" },
  favourite:      { kind: "notif",    notifType: "favourite" },
  reblog:         { kind: "notif",    notifType: "reblog" },
  follow:         { kind: "notif",    notifType: "follow" },
  follow_request: { kind: "notif",    notifType: "follow_request" },
  poll_ended:     { kind: "notif",    notifType: "poll" },
  status_update:  { kind: "notif",    notifType: "update" },
  home_post:      { kind: "timeline", path: "timelines/home" },
  local_post:     { kind: "timeline", path: "timelines/public", query: "local=true" },
  federated_post: { kind: "timeline", path: "timelines/public" },
  hashtag_post:   { kind: "timeline", path: (cfg) => `timelines/tag/${encodeURIComponent((cfg.hashtag || "").replace(/^#/, ""))}` },
  bookmark_added: { kind: "timeline", path: "bookmarks" },
  favourited_post:{ kind: "timeline", path: "favourites" },
};

function statusShape(s) {
  return {
    id: s.id,
    type: "status",
    createdAt: s.created_at,
    accountName: s.account?.acct,
    accountDisplayName: s.account?.display_name,
    accountUrl: s.account?.url,
    statusId: s.id,
    statusContent: s.content?.replace(/<[^>]+>/g, ""),
    statusUrl: s.url,
    statusVisibility: s.visibility,
    favouritesCount: s.favourites_count,
    reblogsCount: s.reblogs_count,
    repliesCount: s.replies_count,
    tags: (s.tags || []).map((t) => t.name),
  };
}

async function fetchMastodon(instance, accessToken, spec, cfg) {
  let url;
  if (spec.kind === "notif") {
    const params = new URLSearchParams({ limit: "30" });
    params.append("types[]", spec.notifType);
    url = `https://${instance}/api/v1/notifications?${params}`;
  } else {
    const path = typeof spec.path === "function" ? spec.path(cfg) : spec.path;
    url = `https://${instance}/api/v1/${path}?limit=30${spec.query ? `&${spec.query}` : ""}`;
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Mastodon API ${res.status}`);
  const data = await res.json();
  if (spec.kind === "notif") {
    return data.map((n) => ({
      id: n.id, type: n.type,
      createdAt: n.created_at,
      accountName: n.account?.acct,
      accountDisplayName: n.account?.display_name,
      accountUrl: n.account?.url,
      statusId: n.status?.id,
      statusContent: n.status?.content?.replace(/<[^>]+>/g, ""),
      statusUrl: n.status?.url,
      statusVisibility: n.status?.visibility,
    }));
  }
  return data.map(statusShape);
}

export async function pollMastodon(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:mastodon:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { instanceUrl, accessToken } = cfg;
    const eventType = cfg.eventType || cfg.watchType || "mention";
    const spec = MASTODON_EVENTS[eventType] || MASTODON_EVENTS.mention;
    if (!instanceUrl || !accessToken) return;

    const instance = instanceUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const items = await fetchMastodon(instance, accessToken, spec, cfg);
    if (!items.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:mastodon:seen:${scope}:${eventType}`;
    for (const item of items) {
      const added = await redis.sadd(seenKey, item.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, item, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `mastodon:${scope}:${eventType}:${item.id}` });
      } catch (err) {
        console.error(`[MastodonPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[MastodonPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
