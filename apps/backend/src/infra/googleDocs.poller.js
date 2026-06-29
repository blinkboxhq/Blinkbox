import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 7 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

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

// Pull the document body and flatten it to plain text + structural metrics so
// events can compare content between revisions.
async function fetchDocContent(token, docId) {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Docs API (content) ${res.status}`);
  const doc = await res.json();
  let text = "";
  let headings = 0;
  let links = 0;
  for (const el of doc.body?.content || []) {
    const p = el.paragraph;
    if (!p) continue;
    const style = p.paragraphStyle?.namedStyleType || "";
    if (style.startsWith("HEADING")) headings += 1;
    for (const r of p.elements || []) {
      const t = r.textRun;
      if (!t) continue;
      text += t.content || "";
      if (t.textStyle?.link?.url) links += 1;
    }
  }
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { text, metrics: { words, chars: text.length, headings, links } };
}

const DOCS_EVENTS = {
  doc_edited:    { match: () => true },
  edited_by:     { match: (c) => (c.modifiedBy || "").toLowerCase() === String(c.cfg.targetValue || "").toLowerCase() },
  content_grew:  { match: (c) => c.prev && (c.metrics.words - c.prev.words) >= Number(c.cfg.targetValue || 1) },
  content_shrank:{ match: (c) => c.prev && (c.prev.words - c.metrics.words) >= Number(c.cfg.targetValue || 1) },
  contains_text: { match: (c) => c.text.toLowerCase().includes(String(c.cfg.targetValue || "").toLowerCase()) },
  text_added:    { match: (c) => { const w = String(c.cfg.targetValue || "").toLowerCase(); return c.text.toLowerCase().includes(w) && !(c.prevText || "").toLowerCase().includes(w); } },
  text_removed:  { match: (c) => { const w = String(c.cfg.targetValue || "").toLowerCase(); return !c.text.toLowerCase().includes(w) && (c.prevText || "").toLowerCase().includes(w); } },
  over_words:    { match: (c) => c.metrics.words >= Number(c.cfg.targetValue || 0) },
  under_words:   { match: (c) => c.metrics.words <= Number(c.cfg.targetValue || 0) },
  heading_added: { match: (c) => c.prev && c.metrics.headings > c.prev.headings },
  link_added:    { match: (c) => c.prev && c.metrics.links > c.prev.links },
  renamed:       { match: (c) => c.prevName && c.docName !== c.prevName },
};

const CONTENT_EVENTS = new Set([
  "content_grew", "content_shrank", "contains_text", "text_added",
  "text_removed", "over_words", "under_words", "heading_added", "link_added",
]);

export async function pollGoogleDocs(automationId, cfg) {
  const lockKey = `bb:gdocs:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, docId } = cfg;
    if (!credentialId || !docId) return;
    const eventType = cfg.eventType || cfg.watchType || "doc_edited";
    const spec = DOCS_EVENTS[eventType] || DOCS_EVENTS.doc_edited;

    const token = await getOAuthToken(credentialId, workspaceId, "Google Docs Trigger");
    const [revision, meta] = await Promise.all([fetchDocRevision(token, docId), fetchDocMeta(token, docId)]);
    if (!revision) return;

    const dedup = revision.id;
    const seenKey = `bb:gdocs:seen:${automationId}:${eventType}`;
    const isNewRevision = await redis.sadd(seenKey, dedup);
    await redis.expire(seenKey, SEEN_TTL);

    const needsContent = CONTENT_EVENTS.has(eventType);
    let text = "";
    let metrics = { words: 0, chars: 0, headings: 0, links: 0 };
    if (needsContent || eventType === "doc_edited") {
      try { ({ text, metrics } = await fetchDocContent(token, docId)); } catch { /* content scope may be missing */ }
    }

    const snapKey = `bb:gdocs:snap:${automationId}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : null;

    await redis.set(snapKey, JSON.stringify({ name: meta.name, text, metrics }), "EX", SNAP_TTL);

    if (!isNewRevision) return;
    if (!prevSnap && eventType !== "doc_edited") return;

    const ctx = {
      cfg, docName: meta.name, modifiedBy: revision.lastModifyingUser?.emailAddress || "",
      text, metrics,
      prevText: prevSnap?.text || "", prev: prevSnap?.metrics || null, prevName: prevSnap?.name || "",
    };
    if (!spec.match(ctx)) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    try {
      await executeAutomation(automation, {
        docId, docName: meta.name, revisionId: revision.id,
        modifiedTime: revision.modifiedTime, modifiedBy: ctx.modifiedBy,
        webViewLink: meta.webViewLink, owner: meta.owners?.[0]?.emailAddress,
        wordCount: metrics.words, headingCount: metrics.headings, linkCount: metrics.links,
      }, { workspaceId: automation.workspaceId, idempotencyKey: `gdocs:${automation._id}:${eventType}:${dedup}` });
    } catch (err) {
      console.error(`[GDocsPoller] Failed for "${automation.name}":`, err.message);
    }
  } catch (err) {
    console.warn(`[GDocsPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
