import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

async function fetchOneDriveChanges(token, deltaTokenKey, folderId) {
  let deltaLink = await redis.get(deltaTokenKey);
  const base = "https://graph.microsoft.com/v1.0/me/drive";
  const initUrl = folderId
    ? `${base}/items/${folderId}/delta`
    : `${base}/root/delta`;

  const url = deltaLink || initUrl;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`OneDrive API ${res.status}`);
  const data = await res.json();

  if (data["@odata.deltaLink"]) {
    await redis.setex(deltaTokenKey, 86400 * 30, data["@odata.deltaLink"]);
    if (!deltaLink) return [];
  }

  return (data.value || [])
    .filter(item => !item.deleted)
    .map(item => ({
      itemId: item.id, name: item.name, webUrl: item.webUrl,
      size: item.size, lastModified: item.lastModifiedDateTime,
      createdBy: item.createdBy?.user?.email,
      lastModifiedBy: item.lastModifiedBy?.user?.email,
      isFolder: !!item.folder,
    }));
}

export async function pollOneDrive(automationId, cfg) {
  const lockKey = `bb:onedrive:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, folderId } = cfg;
    if (!credentialId) return;

    const token = await getOAuthToken(credentialId, workspaceId, "OneDrive Trigger");
    const deltaTokenKey = `bb:onedrive:delta:${automationId}`;
    const changes = await fetchOneDriveChanges(token, deltaTokenKey, folderId);
    if (!changes.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:onedrive:seen:${automationId}`;
    for (const change of changes) {
      const dedup = `${change.itemId}:${change.lastModified}`;
      const added = await redis.sadd(seenKey, dedup);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, change, { workspaceId: automation.workspaceId, idempotencyKey: `onedrive:${automation._id}:${dedup}` });
      } catch (err) {
        console.error(`[OneDrivePoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[OneDrivePoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
