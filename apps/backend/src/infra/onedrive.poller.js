import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

function extOf(name = "") {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

const OFFICE_EXT = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

// Each event = a client-side predicate over the OneDrive delta stream. The
// delta feed is one Graph call; `eventType` selects which items fire.
const ONEDRIVE_EVENTS = {
  file_added:    (c) => !c.deleted && !c.isFolder,
  file_modified: (c) => !c.deleted && !c.isFolder,
  file_deleted:  (c) => c.deleted === true,
  folder_added:  (c) => !c.deleted && c.isFolder,
  shared_item:   (c) => !c.deleted && c.shared === true,
  image_added:   (c) => !c.deleted && c.kind === "image",
  video_added:   (c) => !c.deleted && c.kind === "video",
  audio_added:   (c) => !c.deleted && c.kind === "audio",
  pdf_added:     (c) => !c.deleted && c.ext === "pdf",
  office_added:  (c) => !c.deleted && OFFICE_EXT.has(c.ext),
  large_file:    (c) => !c.deleted && !c.isFolder && (c.size || 0) >= 10 * 1024 * 1024,
  any_change:    () => true,
};

function kindOf(item) {
  if (item.image) return "image";
  if (item.video) return "video";
  if (item.audio) return "audio";
  if (item.folder) return "folder";
  return "file";
}

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
    .filter(item => item.id && item.id !== "root")
    .map(item => ({
      itemId: item.id, name: item.name || "", webUrl: item.webUrl,
      size: item.size, lastModified: item.lastModifiedDateTime,
      createdBy: item.createdBy?.user?.email,
      lastModifiedBy: item.lastModifiedBy?.user?.email,
      isFolder: !!item.folder,
      kind: kindOf(item),
      ext: extOf(item.name),
      shared: !!item.shared,
      deleted: !!item.deleted,
    }));
}

export async function pollOneDrive(automationId, cfg) {
  const lockKey = `bb:onedrive:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, folderId } = cfg;
    const eventType = cfg.eventType || cfg.watchType || "file_added";
    const match = ONEDRIVE_EVENTS[eventType] || ONEDRIVE_EVENTS.file_added;
    if (!credentialId) return;

    const token = await getOAuthToken(credentialId, workspaceId, "OneDrive Trigger");
    const deltaTokenKey = `bb:onedrive:delta:${automationId}`;
    const changes = await fetchOneDriveChanges(token, deltaTokenKey, folderId);
    if (!changes.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    // "modified"/"any_change" re-fire per edit; created-once events fire once.
    const changeAware = eventType === "file_modified" || eventType === "any_change";
    const seenKey = `bb:onedrive:seen:${automationId}:${eventType}`;
    for (const change of changes) {
      if (!match(change)) continue;
      const dedup = changeAware ? `${change.itemId}:${change.lastModified}` : change.itemId;
      const added = await redis.sadd(seenKey, dedup);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, change, { workspaceId: automation.workspaceId, idempotencyKey: `onedrive:${automation._id}:${eventType}:${dedup}` });
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
