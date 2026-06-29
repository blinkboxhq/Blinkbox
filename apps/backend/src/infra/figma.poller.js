/**
 * Figma Poller
 * Polls the Figma REST API with a Personal Access Token (X-Figma-Token).
 * Figma webhooks require an org/enterprise plan, so a PAT poller is the
 * portable path. Each event is a distinct real query against the file:
 * version metadata (/v1/files/:key, /v1/files/:key/versions) and comments
 * (/v1/files/:key/comments). `eventType` (via configExtra) selects the query.
 */
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const API = "https://api.figma.com";
const SEEN_TTL = 14 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();

async function figmaGet(path, token) {
  const res = await fetch(`${API}${path}`, { headers: { "X-Figma-Token": token } });
  if (res.status === 401 || res.status === 403) throw new Error(`Figma auth failed (${res.status}) — check the token`);
  if (res.status === 404) throw new Error("Figma file not found — check the file key");
  if (!res.ok) throw new Error(`Figma API ${res.status}`);
  return res.json();
}

// Comment-event predicates over a single comment object.
const COMMENT_EVENTS = {
  comment_added:    (c) => !c.parent_id && !c.resolved_at,
  comment_reply:    (c) => !!c.parent_id,
  comment_resolved: (c) => !!c.resolved_at,
  comment_from:     (c, cfg) => !!cfg.targetValue && lc(c.user?.handle || "").includes(lc(cfg.targetValue)),
  comment_mentions: (c, cfg) => !!cfg.targetValue && lc(commentText(c)).includes(lc(cfg.targetValue)),
};

function commentText(c) {
  if (typeof c.message === "string") return c.message;
  if (Array.isArray(c.message)) return c.message.map((m) => m.text || "").join("");
  return "";
}

async function pollComments(eventType, fileKey, token, scope, cfg, emit) {
  const data = await figmaGet(`/v1/files/${encodeURIComponent(fileKey)}/comments`, token);
  const predicate = COMMENT_EVENTS[eventType];
  const seenKey = `bb:figma:seen:${scope}:${eventType}`;
  const comments = (data.comments || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  for (const c of comments) {
    if (predicate && !predicate(c, cfg)) continue;
    // resolved fires on resolution, so key on resolved_at; others on id.
    const dedup = eventType === "comment_resolved" ? `${c.id}:${c.resolved_at}` : c.id;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await emit({
      eventType, fileKey, commentId: c.id, comment: commentText(c),
      author: c.user?.handle, authorEmail: c.user?.email,
      resolved: !!c.resolved_at, parentId: c.parent_id || null,
      createdAt: c.created_at,
    }, dedup);
  }
}

// Fire once when the total open-comment count crosses a configured threshold.
async function pollCommentCount(fileKey, token, scope, cfg, emit) {
  const threshold = parseInt(cfg.targetValue) || 0;
  if (!threshold) return;
  const data = await figmaGet(`/v1/files/${encodeURIComponent(fileKey)}/comments`, token);
  const open = (data.comments || []).filter((c) => !c.resolved_at).length;
  const snapKey = `bb:figma:cc:${scope}`;
  const wasOver = (await redis.get(snapKey)) === "1";
  const isOver = open >= threshold;
  if (isOver === wasOver) return;
  await redis.set(snapKey, isOver ? "1" : "0", "EX", SNAP_TTL);
  if (!isOver) return; // only fire on the upward crossing
  await emit({
    eventType: "comment_count_over", fileKey, openComments: open, threshold,
  }, `cc:${open}:${Date.now()}`);
}

// Figma file metadata lists named branches under `branches`. Fire when a new
// branch key appears.
async function pollBranches(fileKey, token, scope, emit) {
  const meta = await figmaGet(`/v1/files/${encodeURIComponent(fileKey)}?depth=1&branch_data=true`, token);
  const seenKey = `bb:figma:seen:${scope}:branch_created`;
  const primed = await redis.exists(seenKey);
  for (const b of (meta.branches || [])) {
    const added = await redis.sadd(seenKey, b.key);
    if (!added) continue;
    await redis.expire(seenKey, SNAP_TTL);
    if (!primed) continue; // seed existing branches on first run
    await emit({
      eventType: "branch_created", fileKey, branchKey: b.key,
      branchName: b.name, parentFile: meta.name, lastModified: b.last_modified,
    }, b.key);
  }
}

// Version-event handler. We snapshot the file's version + lastModified and
// fire when it changes. file_updated / version_published differentiate on
// whether the latest /versions entry is a labelled (named) version.
async function pollVersions(eventType, fileKey, token, scope, emit) {
  const meta = await figmaGet(`/v1/files/${encodeURIComponent(fileKey)}?depth=1`, token);
  const snapKey = `bb:figma:ver:${scope}`;
  const prev = await redis.get(snapKey);
  const current = String(meta.version);
  if (prev === current) return;

  const firstRun = prev === null;
  await redis.set(snapKey, current, "EX", SNAP_TTL);
  if (firstRun) return; // seed only — don't fire on the first observation

  if (eventType === "version_published" || eventType === "version_named") {
    const versions = await figmaGet(`/v1/files/${encodeURIComponent(fileKey)}/versions`, token).catch(() => ({ versions: [] }));
    const latest = (versions.versions || [])[0];
    const isNamed = !!(latest && (latest.label || latest.description));
    if (eventType === "version_named" && !isNamed) return;
    const seenKey = `bb:figma:seen:${scope}:${eventType}`;
    const dedup = `${latest?.id || current}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) return;
    await redis.expire(seenKey, SEEN_TTL);
    await emit({
      eventType, fileKey, fileName: meta.name, version: current,
      versionLabel: latest?.label, versionDescription: latest?.description,
      author: latest?.user?.handle, createdAt: latest?.created_at || meta.lastModified,
    }, dedup);
    return;
  }

  // file_updated / thumbnail_changed / name_changed
  await emit({
    eventType, fileKey, fileName: meta.name, version: current,
    lastModified: meta.lastModified, thumbnailUrl: meta.thumbnailUrl,
  }, current);
}

async function pollNameOrThumb(eventType, fileKey, token, scope, emit) {
  const meta = await figmaGet(`/v1/files/${encodeURIComponent(fileKey)}?depth=1`, token);
  const field = eventType === "name_changed" ? meta.name : meta.thumbnailUrl;
  const snapKey = `bb:figma:${eventType}:${scope}`;
  const prev = await redis.get(snapKey);
  if (prev === String(field)) return;
  const firstRun = prev === null;
  await redis.set(snapKey, String(field), "EX", SNAP_TTL);
  if (firstRun) return;
  await emit({
    eventType, fileKey, fileName: meta.name,
    value: field, version: String(meta.version), lastModified: meta.lastModified,
  }, `${eventType}:${field}`);
}

const EVENT_KIND = {
  file_updated: "version", version_published: "version", version_named: "version",
  comment_added: "comment", comment_reply: "comment", comment_resolved: "comment",
  comment_mentions: "comment", comment_from: "comment",
  name_changed: "snap", thumbnail_changed: "snap",
  branch_created: "branch", comment_count_over: "count",
};

export async function pollFigma(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:figma:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 90);
  if (!locked) return;

  try {
    const { fileKey } = cfg;
    if (!fileKey || !cfg.token) return;
    let token = cfg.token;
    if (cfg.workspaceId) {
      try {
        token = await getOAuthToken(cfg.token, cfg.workspaceId, "Figma trigger");
      } catch {
        /* not a credential id — treat cfg.token as the literal token */
      }
    }
    const eventType = cfg.eventType || cfg.watchType || "file_updated";
    const kind = EVENT_KIND[eventType] || "version";

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const emit = async (payload, dedup) => {
      try {
        await executeAutomation(automation, payload, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `figma:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[FigmaPoller] Failed for "${automation.name}":`, err.message);
      }
    };

    const tc = { targetValue: cfg.targetValue };
    if (kind === "version") await pollVersions(eventType, fileKey, token, scope, emit);
    else if (kind === "comment") await pollComments(eventType, fileKey, token, scope, tc, emit);
    else if (kind === "snap") await pollNameOrThumb(eventType, fileKey, token, scope, emit);
    else if (kind === "branch") await pollBranches(fileKey, token, scope, emit);
    else if (kind === "count") await pollCommentCount(fileKey, token, scope, tc, emit);
  } catch (err) {
    console.warn(`[FigmaPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
