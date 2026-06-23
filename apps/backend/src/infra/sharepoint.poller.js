import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

async function fetchSharePointChanges(token, siteId, listId, deltaTokenKey) {
  const base = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}`;
  let deltaLink = await redis.get(deltaTokenKey);
  const url = deltaLink || `${base}/items/delta?$select=id,lastModifiedDateTime,webUrl,fields&$expand=fields`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`SharePoint API ${res.status}`);
  const data = await res.json();

  if (data["@odata.deltaLink"]) {
    await redis.setex(deltaTokenKey, 86400 * 30, data["@odata.deltaLink"]);
    if (!deltaLink) return [];
  }

  return (data.value || [])
    .filter(item => !item.deleted)
    .map(item => ({
      itemId: item.id, webUrl: item.webUrl,
      lastModified: item.lastModifiedDateTime,
      fields: item.fields || {},
    }));
}

export async function pollSharePoint(automationId, cfg) {
  const lockKey = `bb:sharepoint:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, siteId, listId } = cfg;
    if (!credentialId || !siteId || !listId) return;

    const token = await getOAuthToken(credentialId, workspaceId, "SharePoint Trigger");
    const deltaTokenKey = `bb:sharepoint:delta:${automationId}`;
    const changes = await fetchSharePointChanges(token, siteId, listId, deltaTokenKey);
    if (!changes.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:sharepoint:seen:${automationId}`;
    for (const change of changes) {
      const dedup = `${change.itemId}:${change.lastModified}`;
      const added = await redis.sadd(seenKey, dedup);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, change, { workspaceId: automation.workspaceId, idempotencyKey: `sharepoint:${automation._id}:${dedup}` });
      } catch (err) {
        console.error(`[SharePointPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[SharePointPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
