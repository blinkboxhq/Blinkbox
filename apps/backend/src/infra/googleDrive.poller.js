import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

async function fetchDriveChanges(token, pageTokenKey, folderId) {
  let startPageToken = await redis.get(pageTokenKey);
  if (!startPageToken) {
    const res = await fetch("https://www.googleapis.com/drive/v3/changes/startPageToken", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Drive API ${res.status}`);
    const d = await res.json();
    startPageToken = d.startPageToken;
    await redis.setex(pageTokenKey, 86400 * 30, startPageToken);
    return [];
  }

  const params = new URLSearchParams({
    pageToken: startPageToken,
    fields: "changes(file(id,name,mimeType,modifiedTime,size,webViewLink,parents,owners)),nextPageToken,newStartPageToken",
    includeRemoved: "true",
    supportsAllDrives: "true",
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/changes?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive API ${res.status}`);
  const data = await res.json();

  if (data.newStartPageToken) await redis.setex(pageTokenKey, 86400 * 30, data.newStartPageToken);

  return (data.changes || [])
    .filter(c => c.file)
    .filter(c => !folderId || (c.file.parents || []).includes(folderId))
    .map(c => ({
      fileId: c.file.id, name: c.file.name, mimeType: c.file.mimeType,
      modifiedTime: c.file.modifiedTime, size: c.file.size,
      webViewLink: c.file.webViewLink, owner: c.file.owners?.[0]?.emailAddress,
    }));
}

export async function pollGoogleDrive(automationId, cfg) {
  const lockKey = `bb:gdrive:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, folderId } = cfg;
    if (!credentialId) return;

    const token = await getOAuthToken(credentialId, workspaceId, "Google Drive Trigger");
    const pageTokenKey = `bb:gdrive:page:${automationId}`;
    const changes = await fetchDriveChanges(token, pageTokenKey, folderId);
    if (!changes.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:gdrive:seen:${automationId}`;
    for (const change of changes) {
      const dedup = `${change.fileId}:${change.modifiedTime}`;
      const added = await redis.sadd(seenKey, dedup);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, change, { workspaceId: automation.workspaceId, idempotencyKey: `gdrive:${automation._id}:${dedup}` });
      } catch (err) {
        console.error(`[GDrivePoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[GDrivePoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
