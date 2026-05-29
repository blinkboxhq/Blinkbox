import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

async function fetchDocRevision(token, docId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}/revisions?fields=revisions(id,modifiedTime,lastModifyingUser)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Docs API ${res.status}`);
  const data = await res.json();
  const revisions = data.revisions || [];
  if (!revisions.length) return null;
  return revisions[revisions.length - 1];
}

async function fetchDocMeta(token, docId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?fields=id,name,modifiedTime,webViewLink,size,owners`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Docs API ${res.status}`);
  return res.json();
}

export async function pollGoogleDocs(automationId, cfg) {
  const lockKey = `bb:gdocs:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, docId, watchContent } = cfg;
    if (!credentialId || !docId) return;

    const token = await getOAuthToken(credentialId, workspaceId, "Google Docs Trigger");
    const [revision, meta] = await Promise.all([fetchDocRevision(token, docId), fetchDocMeta(token, docId)]);
    if (!revision) return;

    const dedup = revision.id;
    const seenKey = `bb:gdocs:seen:${automationId}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) return;
    await redis.expire(seenKey, SEEN_TTL);

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    try {
      await executeAutomation(automation, {
        docId, docName: meta.name, revisionId: revision.id,
        modifiedTime: revision.modifiedTime, modifiedBy: revision.lastModifyingUser?.emailAddress,
        webViewLink: meta.webViewLink, owner: meta.owners?.[0]?.emailAddress,
      }, { workspaceId: automation.workspaceId, idempotencyKey: `gdocs:${automation._id}:${dedup}` });
    } catch (err) {
      console.error(`[GDocsPoller] Failed for "${automation.name}":`, err.message);
    }
  } catch (err) {
    console.warn(`[GDocsPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
