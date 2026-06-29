import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

const DOC_MIME = "application/vnd.google-apps.document";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const FOLDER_MIME = "application/vnd.google-apps.folder";

function mimeClass(m = "") {
  if (m === FOLDER_MIME) return "folder";
  if (m.startsWith("application/vnd.google-apps")) return "gdoc";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m === "application/pdf") return "pdf";
  return "file";
}

// Each event = a client-side predicate over the Drive change stream. The change
// feed is one API call; `eventType` selects which changes fire the automation.
const DRIVE_EVENTS = {
  file_added:     (c) => !c.trashed && c.mimeType !== FOLDER_MIME,
  file_modified:  (c) => !c.trashed && c.mimeType !== FOLDER_MIME,
  file_trashed:   (c) => c.trashed === true,
  folder_added:   (c) => !c.trashed && c.mimeType === FOLDER_MIME,
  shared_with_me: (c) => c.shared === true && !c.ownedByMe,
  starred:        (c) => c.starred === true,
  doc_added:      (c) => !c.trashed && c.mimeType === DOC_MIME,
  sheet_added:    (c) => !c.trashed && c.mimeType === SHEET_MIME,
  pdf_added:      (c) => !c.trashed && c.mimeType === "application/pdf",
  image_added:    (c) => !c.trashed && mimeClass(c.mimeType) === "image",
  video_added:    (c) => !c.trashed && mimeClass(c.mimeType) === "video",
  owned_by_me:    (c) => !c.trashed && c.ownedByMe === true,
};

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
    fields: "changes(removed,file(id,name,mimeType,modifiedTime,createdTime,size,webViewLink,parents,owners,trashed,shared,starred,ownedByMe)),nextPageToken,newStartPageToken",
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
      kind: mimeClass(c.file.mimeType),
      modifiedTime: c.file.modifiedTime, createdTime: c.file.createdTime, size: c.file.size,
      webViewLink: c.file.webViewLink, owner: c.file.owners?.[0]?.emailAddress,
      trashed: c.removed === true || c.file.trashed === true,
      shared: c.file.shared === true, starred: c.file.starred === true,
      ownedByMe: c.file.ownedByMe === true,
    }));
}

export async function pollGoogleDrive(automationId, cfg) {
  const lockKey = `bb:gdrive:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, folderId } = cfg;
    const eventType = cfg.eventType || cfg.watchType || "file_added";
    const match = DRIVE_EVENTS[eventType] || DRIVE_EVENTS.file_added;
    if (!credentialId) return;

    const token = await getOAuthToken(credentialId, workspaceId, "Google Drive Trigger");
    const pageTokenKey = `bb:gdrive:page:${automationId}`;
    const changes = await fetchDriveChanges(token, pageTokenKey, folderId);
    if (!changes.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    // "modified" must re-fire on each edit; the rest fire once per file.
    const changeAware = eventType === "file_modified";
    const seenKey = `bb:gdrive:seen:${automationId}:${eventType}`;
    for (const change of changes) {
      if (!match(change)) continue;
      const dedup = changeAware ? `${change.fileId}:${change.modifiedTime}` : change.fileId;
      const added = await redis.sadd(seenKey, dedup);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, change, { workspaceId: automation.workspaceId, idempotencyKey: `gdrive:${automation._id}:${eventType}:${dedup}` });
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
