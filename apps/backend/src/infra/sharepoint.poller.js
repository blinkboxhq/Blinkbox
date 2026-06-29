import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

function fieldVal(c, name) {
  if (!name) return undefined;
  return c.fields ? c.fields[name] : undefined;
}
function isToday(v) {
  if (!v) return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
}

// Each event = a client-side predicate over the list-item delta stream.
// "created" = created and modified within ~5s; column events read cfg.columnName.
const SHAREPOINT_EVENTS = {
  item_created:     { match: (c) => !c.deleted && c.createdTime && c.lastModified && Math.abs(new Date(c.lastModified) - new Date(c.createdTime)) < 5000, changeAware: false },
  item_modified:    { match: (c) => !c.deleted, changeAware: true },
  item_deleted:     { match: (c) => c.deleted === true, changeAware: false },
  column_equals:    { match: (c, cfg) => String(fieldVal(c, cfg.columnName) ?? "") === String(cfg.targetValue ?? ""), changeAware: true },
  column_changed_to:{ match: (c, cfg) => String(fieldVal(c, cfg.columnName) ?? "") === String(cfg.targetValue ?? ""), changeAware: true },
  checkbox_checked: { match: (c, cfg) => fieldVal(c, cfg.columnName) === true || fieldVal(c, cfg.columnName) === "Yes", changeAware: true },
  field_filled:     { match: (c, cfg) => { const v = fieldVal(c, cfg.columnName); return v !== undefined && v !== null && v !== ""; }, changeAware: true },
  field_cleared:    { match: (c, cfg) => { const v = fieldVal(c, cfg.columnName); return v === undefined || v === null || v === ""; }, changeAware: true },
  number_over:      { match: (c, cfg) => Number(fieldVal(c, cfg.columnName)) >= Number(cfg.targetValue || 0), changeAware: true },
  date_today:       { match: (c, cfg) => isToday(fieldVal(c, cfg.columnName)), changeAware: true },
  by_author:        { match: (c, cfg) => (c.createdByEmail || "").toLowerCase() === String(cfg.targetValue || "").toLowerCase(), changeAware: false },
  any_change:       { match: () => true, changeAware: true },
};

async function fetchSharePointChanges(token, siteId, listId, deltaTokenKey) {
  const base = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}`;
  let deltaLink = await redis.get(deltaTokenKey);
  const url = deltaLink || `${base}/items/delta?$select=id,createdDateTime,lastModifiedDateTime,webUrl,createdBy,fields&$expand=fields`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`SharePoint API ${res.status}`);
  const data = await res.json();

  if (data["@odata.deltaLink"]) {
    await redis.setex(deltaTokenKey, 86400 * 30, data["@odata.deltaLink"]);
    if (!deltaLink) return [];
  }

  return (data.value || [])
    .filter(item => item.id)
    .map(item => ({
      itemId: item.id, webUrl: item.webUrl,
      createdTime: item.createdDateTime,
      lastModified: item.lastModifiedDateTime,
      createdByEmail: item.createdBy?.user?.email || "",
      createdByName: item.createdBy?.user?.displayName || "",
      deleted: !!item.deleted,
      fields: item.fields || {},
    }));
}

export async function pollSharePoint(automationId, cfg) {
  const lockKey = `bb:sharepoint:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, siteId, listId } = cfg;
    const eventType = cfg.eventType || cfg.watchType || "item_created";
    const spec = SHAREPOINT_EVENTS[eventType] || SHAREPOINT_EVENTS.item_created;
    if (!credentialId || !siteId || !listId) return;

    const token = await getOAuthToken(credentialId, workspaceId, "SharePoint Trigger");
    const deltaTokenKey = `bb:sharepoint:delta:${automationId}`;
    const changes = await fetchSharePointChanges(token, siteId, listId, deltaTokenKey);
    if (!changes.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:sharepoint:seen:${automationId}:${eventType}`;
    for (const change of changes) {
      if (!spec.match(change, cfg)) continue;
      const dedup = spec.changeAware ? `${change.itemId}:${change.lastModified}` : change.itemId;
      const added = await redis.sadd(seenKey, dedup);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, change, { workspaceId: automation.workspaceId, idempotencyKey: `sharepoint:${automation._id}:${eventType}:${dedup}` });
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
