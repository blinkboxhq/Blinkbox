import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const BASE = "https://api.intercom.io";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull the most-recently-updated conversations and normalize the fields the
// event predicates compare. Intercom timestamps are unix seconds.
async function fetchConversations(token) {
  const res = await fetch(`${BASE}/conversations?per_page=50&order=desc&sort=updated_at`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Intercom-Version": "2.10",
    },
  });
  if (!res.ok) throw new Error(`Intercom API ${res.status}`);
  const data = await res.json();
  return (data.conversations || []).map((c) => ({
    id: String(c.id),
    state: c.state || "",
    open: !!c.open,
    read: !!c.read,
    priority: c.priority || "",
    adminAssigneeId: c.admin_assignee_id ? String(c.admin_assignee_id) : "",
    teamAssigneeId: c.team_assignee_id ? String(c.team_assignee_id) : "",
    sourceType: c.source?.type || "",
    sourceAuthor: c.source?.author?.email || c.source?.author?.name || "",
    subject: c.source?.subject || c.title || "",
    waitingSince: c.waiting_since || null,
    tags: (c.tags?.tags || []).map((t) => t.name).filter(Boolean),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();

// Each event is a predicate over the current conversation (`c`), its previous
// snapshot (`p`, may be null), and config (`cfg`). `changeAware` events dedup on
// a changing token so they re-fire on each transition; `needsPrev` events stay
// quiet until a baseline snapshot exists.
const INTERCOM_EVENTS = {
  conversation_created: { needsPrev: false, dedup: (c) => `${c.id}`, match: (c, p) => !p },
  conversation_updated: { needsPrev: true,  changeAware: true, dedup: (c) => `${c.id}:${c.updatedAt}`, match: (c, p) => c.updatedAt && c.updatedAt !== p.updatedAt },
  reopened:             { needsPrev: false, changeAware: true, dedup: (c) => `${c.id}:open`, match: (c, p) => c.state === "open" && p && p.state === "closed" },
  closed:               { needsPrev: false, changeAware: true, dedup: (c) => `${c.id}:closed`, match: (c, p) => c.state === "closed" && (!p || p.state !== "closed") },
  snoozed:              { needsPrev: false, dedup: (c) => `${c.id}:snoozed`, match: (c) => c.state === "snoozed" },
  priority_set:         { needsPrev: false, changeAware: true, dedup: (c) => `${c.id}:priority`, match: (c, p) => c.priority === "priority" && (!p || p.priority !== "priority") },
  assigned:             { needsPrev: true,  changeAware: true, dedup: (c) => `${c.id}:${c.adminAssigneeId}`, match: (c, p, cfg) => c.adminAssigneeId && (cfg.targetValue ? c.adminAssigneeId === String(cfg.targetValue) : c.adminAssigneeId !== (p.adminAssigneeId || "")) },
  unassigned:           { needsPrev: false, dedup: (c) => `${c.id}:unassigned`, match: (c) => !c.adminAssigneeId && !c.teamAssigneeId && c.state === "open" },
  waiting:              { needsPrev: false, changeAware: true, dedup: (c) => `${c.id}:${c.waitingSince}`, match: (c) => c.state === "open" && !!c.waitingSince },
  has_tag:              { needsPrev: false, changeAware: true, dedup: (c) => `${c.id}:${c.updatedAt}`, match: (c, _p, cfg) => c.tags.map(lc).includes(lc(cfg.targetValue)) },
  from_source:          { needsPrev: false, dedup: (c) => `${c.id}:src`, match: (c, _p, cfg) => lc(c.sourceType) === lc(cfg.targetValue) },
  subject_contains:     { needsPrev: false, changeAware: true, dedup: (c) => `${c.id}:${c.updatedAt}`, match: (c, _p, cfg) => lc(c.subject).includes(lc(cfg.targetValue)) },
};

export async function pollIntercom(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:intercom:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId } = cfg;
    if (!credentialId) return;
    const eventType = cfg.eventType || cfg.watchType || "conversation_created";
    const spec = INTERCOM_EVENTS[eventType] || INTERCOM_EVENTS.conversation_created;

    const token = await getOAuthToken(credentialId, workspaceId, "Intercom Trigger");
    const convos = await fetchConversations(token);
    if (!convos.length) return;

    const snapKey = `bb:intercom:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const c of convos) {
      nextSnap[c.id] = {
        state: c.state, priority: c.priority,
        adminAssigneeId: c.adminAssigneeId, updatedAt: c.updatedAt,
      };
    }
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "conversation_created")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:intercom:seen:${scope}:${eventType}`;
    for (const c of convos) {
      const prev = prevSnap[c.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(c, prev, cfg)) continue;

      const dedup = spec.dedup(c);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          conversationId: c.id, state: c.state, priority: c.priority,
          assigneeId: c.adminAssigneeId, teamId: c.teamAssigneeId,
          source: c.sourceType, author: c.sourceAuthor, subject: c.subject,
          tags: c.tags, waitingSince: c.waitingSince,
          createdAt: c.createdAt, updatedAt: c.updatedAt,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `intercom:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[IntercomPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[IntercomPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
