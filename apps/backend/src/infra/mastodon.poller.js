import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

async function fetchMastodonNotifications(instance, accessToken, types) {
  const params = new URLSearchParams({ limit: "30" });
  if (types?.length) types.forEach(t => params.append("types[]", t));

  const res = await fetch(`https://${instance}/api/v1/notifications?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Mastodon API ${res.status}`);
  const notifs = await res.json();
  return notifs.map(n => ({
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

export async function pollMastodon(automationId, cfg) {
  const lockKey = `bb:mastodon:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { instanceUrl, accessToken, notificationTypes } = cfg;
    if (!instanceUrl || !accessToken) return;

    const instance = instanceUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const types = notificationTypes ? notificationTypes.split(",").map(t => t.trim()) : ["mention", "reblog", "follow"];
    const notifications = await fetchMastodonNotifications(instance, accessToken, types);
    if (!notifications.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:mastodon:seen:${automationId}`;
    for (const notif of notifications) {
      const added = await redis.sadd(seenKey, notif.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, notif, { workspaceId: automation.workspaceId, idempotencyKey: `mastodon:${automation._id}:${notif.id}` });
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
