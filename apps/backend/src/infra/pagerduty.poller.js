import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const BASE = "https://api.pagerduty.com";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull the most-recently-created incidents and normalize the fields the event
// predicates compare. PagerDuty auth is a Token header (not Bearer) and the v2
// Accept header is required. Timestamps are ISO strings.
async function fetchIncidents(token, serviceId) {
  const params = new URLSearchParams({ sort_by: "created_at:desc", limit: "50" });
  for (const s of ["triggered", "acknowledged", "resolved"]) params.append("statuses[]", s);
  if (serviceId) params.append("service_ids[]", serviceId);
  const res = await fetch(`${BASE}/incidents?${params}`, {
    headers: {
      Authorization: `Token token=${token}`,
      Accept: "application/vnd.pagerduty+json;version=2",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`PagerDuty API ${res.status}`);
  const data = await res.json();
  return (data.incidents || []).map((i) => ({
    id: String(i.id || ""),
    number: i.incident_number ?? "",
    title: i.title || "",
    status: i.status || "",
    urgency: i.urgency || "",
    priority: i.priority?.summary || "",
    serviceId: i.service?.id || "",
    serviceName: i.service?.summary || "",
    assignees: (i.assignments || []).map((a) => a.assignee?.summary).filter(Boolean),
    escalationLevel: i.escalation_level ?? 0,
    htmlUrl: i.html_url || "",
    createdAt: i.created_at || "",
    lastChangeAt: i.last_status_change_at || "",
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();
const hasAssignee = (i, name) => i.assignees.some((a) => lc(a).includes(lc(name)));

// Each event is a predicate over the current incident (`i`), its previous
// snapshot (`p`, may be null), and config (`c`). `changeAware` events dedup on a
// changing token so they re-fire on each transition; `needsPrev` events stay
// quiet until a baseline snapshot exists.
const PAGERDUTY_EVENTS = {
  incident_triggered: { needsPrev: false, dedup: (i) => `${i.id}`, match: (i, p) => i.status === "triggered" && !p },
  acknowledged:       { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:ack`, match: (i, p) => i.status === "acknowledged" && (!p || p.status !== "acknowledged") },
  resolved:           { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:resolved`, match: (i, p) => i.status === "resolved" && (!p || p.status !== "resolved") },
  reopened:           { needsPrev: true,  changeAware: true, dedup: (i) => `${i.id}:reopened:${i.lastChangeAt}`, match: (i, p) => i.status === "triggered" && p.status === "resolved" },
  escalated:          { needsPrev: true,  changeAware: true, dedup: (i) => `${i.id}:esc:${i.escalationLevel}`, match: (i, p) => Number(i.escalationLevel) > Number(p.escalationLevel || 0) },
  status_changed:     { needsPrev: true,  changeAware: true, dedup: (i) => `${i.id}:${i.status}`, match: (i, p) => i.status !== p.status },
  high_urgency:       { needsPrev: false, dedup: (i) => `${i.id}:high`, match: (i) => lc(i.urgency) === "high" },
  status_is:          { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:${i.status}`, match: (i, _p, c) => lc(i.status) === lc(c.targetValue) },
  priority_is:        { needsPrev: false, dedup: (i) => `${i.id}:prio`, match: (i, _p, c) => lc(i.priority) === lc(c.targetValue) },
  on_service:         { needsPrev: false, dedup: (i) => `${i.id}`, match: (i, _p, c) => lc(i.serviceName).includes(lc(c.targetValue)) || lc(i.serviceId) === lc(c.targetValue) },
  assigned_to:        { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:${i.lastChangeAt}`, match: (i, _p, c) => hasAssignee(i, c.targetValue) },
  title_contains:     { needsPrev: false, dedup: (i) => `${i.id}`, match: (i, _p, c) => lc(i.title).includes(lc(c.targetValue)) },
};

export async function pollPagerDuty(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:pagerduty:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, serviceId } = cfg;
    if (!credentialId) return;
    const eventType = cfg.eventType || cfg.watchType || "incident_triggered";
    const spec = PAGERDUTY_EVENTS[eventType] || PAGERDUTY_EVENTS.incident_triggered;

    const token = await getOAuthToken(credentialId, workspaceId, "PagerDuty Trigger");
    const incidents = await fetchIncidents(token, serviceId);
    if (!incidents.length) return;

    const snapKey = `bb:pagerduty:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const i of incidents) {
      nextSnap[i.id] = { status: i.status, escalationLevel: i.escalationLevel, lastChangeAt: i.lastChangeAt };
    }
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "incident_triggered" || eventType === "acknowledged" || eventType === "resolved")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:pagerduty:seen:${scope}:${eventType}`;
    for (const i of incidents) {
      const prev = prevSnap[i.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(i, prev, cfg)) continue;

      const dedup = spec.dedup(i);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          incidentId: i.id, number: i.number, title: i.title, status: i.status,
          urgency: i.urgency, priority: i.priority, service: i.serviceName,
          serviceId: i.serviceId, assignees: i.assignees, escalationLevel: i.escalationLevel,
          url: i.htmlUrl, createdAt: i.createdAt, lastChangeAt: i.lastChangeAt,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `pagerduty:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[PagerDutyPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[PagerDutyPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
