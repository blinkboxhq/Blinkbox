import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Zendesk credentials are a JSON {token, email} blob in the vault; older
// single-string creds fall back to token-only (email then required in cfg).
async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Zendesk Trigger");
  try {
    const j = JSON.parse(raw);
    return { token: j.token, email: j.email };
  } catch {
    return { token: raw, email: "" };
  }
}

// Pull the most-recently-updated tickets for a subdomain and normalize the
// fields the event predicates compare. Auth is HTTP Basic email/token:apitoken.
async function fetchTickets(subdomain, email, token) {
  const base = `https://${subdomain}.zendesk.com/api/v2`;
  const auth = Buffer.from(`${email}/token:${token}`).toString("base64");
  const res = await fetch(`${base}/tickets.json?sort_by=updated_at&sort_order=desc&per_page=50`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Zendesk API ${res.status}`);
  const data = await res.json();
  return (data.tickets || []).map((t) => ({
    id: String(t.id),
    subject: t.subject || "",
    description: t.description || "",
    status: t.status || "",
    priority: t.priority || "",
    type: t.type || "",
    channel: t.via?.channel || "",
    requesterId: t.requester_id ? String(t.requester_id) : "",
    assigneeId: t.assignee_id ? String(t.assignee_id) : "",
    tags: t.tags || [],
    satisfaction: t.satisfaction_rating?.score || "",
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();

// Each event is a predicate over the current ticket (`t`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire on each transition; `needsPrev` events stay quiet until
// a baseline snapshot exists.
const ZENDESK_EVENTS = {
  ticket_created:  { needsPrev: false, dedup: (t) => `${t.id}`, match: (t, p) => !p },
  ticket_updated:  { needsPrev: true,  changeAware: true, dedup: (t) => `${t.id}:${t.updatedAt}`, match: (t, p) => t.updatedAt && t.updatedAt !== p.updatedAt },
  status_changed:  { needsPrev: true,  changeAware: true, dedup: (t) => `${t.id}:${t.status}`, match: (t, p) => t.status !== p.status },
  status_is:       { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:${t.status}`, match: (t, _p, c) => lc(t.status) === lc(c.targetValue) },
  solved:          { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:solved`, match: (t, p) => t.status === "solved" && (!p || p.status !== "solved") },
  pending:         { needsPrev: false, dedup: (t) => `${t.id}:pending`, match: (t) => t.status === "pending" },
  priority_is:     { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:${t.priority}`, match: (t, _p, c) => lc(t.priority) === lc(c.targetValue) },
  urgent:          { needsPrev: false, dedup: (t) => `${t.id}:urgent`, match: (t) => t.priority === "urgent" },
  assigned:        { needsPrev: true,  changeAware: true, dedup: (t) => `${t.id}:${t.assigneeId}`, match: (t, p, c) => t.assigneeId && (c.targetValue ? t.assigneeId === String(c.targetValue) : t.assigneeId !== (p.assigneeId || "")) },
  unassigned:      { needsPrev: false, dedup: (t) => `${t.id}:unassigned`, match: (t) => !t.assigneeId },
  has_tag:         { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:${t.updatedAt}`, match: (t, _p, c) => t.tags.map(lc).includes(lc(c.targetValue)) },
  subject_contains:{ needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:${t.updatedAt}`, match: (t, _p, c) => lc(t.subject).includes(lc(c.targetValue)) },
};

export async function pollZendesk(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:zendesk:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, subdomain } = cfg;
    if (!credentialId || !subdomain) return;
    const eventType = cfg.eventType || cfg.watchType || "ticket_created";
    const spec = ZENDESK_EVENTS[eventType] || ZENDESK_EVENTS.ticket_created;

    const { token, email } = await getCreds(credentialId, workspaceId);
    if (!token) return;
    const tickets = await fetchTickets(subdomain, email || cfg.email || "", token);
    if (!tickets.length) return;

    const snapKey = `bb:zendesk:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const t of tickets) {
      nextSnap[t.id] = {
        status: t.status, priority: t.priority,
        assigneeId: t.assigneeId, updatedAt: t.updatedAt,
      };
    }
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "ticket_created")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:zendesk:seen:${scope}:${eventType}`;
    for (const t of tickets) {
      const prev = prevSnap[t.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(t, prev, cfg)) continue;

      const dedup = spec.dedup(t);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          ticketId: t.id, subject: t.subject, status: t.status,
          priority: t.priority, type: t.type, channel: t.channel,
          requesterId: t.requesterId, assigneeId: t.assigneeId,
          tags: t.tags, satisfaction: t.satisfaction,
          createdAt: t.createdAt, updatedAt: t.updatedAt,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `zendesk:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[ZendeskPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[ZendeskPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
