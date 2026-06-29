import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const BASE = "https://sentry.io/api/0";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull the most-recently-seen unresolved issues for an org (optionally one
// project) and normalize the fields the predicates compare.
async function fetchIssues(token, org, project, query) {
  const params = new URLSearchParams({
    limit: "50",
    query: query || "is:unresolved",
    sort: "date",
  });
  if (project) params.set("project", project);
  const res = await fetch(`${BASE}/organizations/${encodeURIComponent(org)}/issues/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sentry API ${res.status}`);
  const data = await res.json();
  return (data || []).map((i) => ({
    id: String(i.id),
    shortId: i.shortId,
    title: i.title || i.metadata?.value || "",
    culprit: i.culprit || "",
    level: i.level || "",
    status: i.status || "",
    substatus: i.substatus || "",
    count: Number(i.count || 0),
    userCount: Number(i.userCount || 0),
    firstSeen: i.firstSeen,
    lastSeen: i.lastSeen,
    permalink: i.permalink,
    isUnhandled: !!i.isUnhandled,
    project: i.project?.slug || "",
    assignedTo: i.assignedTo?.name || i.assignedTo?.email || "",
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// Each event is a predicate over the current issue (`i`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events re-fire on each
// new occurrence (dedup on lastSeen); state events fire once per crossing.
const SENTRY_EVENTS = {
  new_issue:       { needsPrev: false, dedup: (i) => `${i.id}`, match: (i, p) => !p },
  any_issue:       { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:${i.lastSeen}`, match: () => true },
  regression:      { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:regressed`, match: (i) => i.substatus === "regressed" },
  escalating:      { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:escalating`, match: (i) => i.substatus === "escalating" },
  level_is:        { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:${i.lastSeen}`, match: (i, _p, c) => lc(i.level) === lc(c.targetValue) },
  fatal_error:     { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:${i.lastSeen}`, match: (i) => i.level === "fatal" },
  unhandled:       { needsPrev: false, dedup: (i) => `${i.id}:unhandled`, match: (i) => i.isUnhandled },
  frequency_over:  { needsPrev: false, dedup: (i) => `${i.id}:${i.count}`, match: (i, _p, c) => i.count >= num(c.targetValue, 1) },
  users_over:      { needsPrev: false, dedup: (i) => `${i.id}:${i.userCount}`, match: (i, _p, c) => i.userCount >= num(c.targetValue, 1) },
  title_contains:  { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:${i.lastSeen}`, match: (i, _p, c) => lc(i.title).includes(lc(c.targetValue)) },
  in_project:      { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:${i.lastSeen}`, match: (i, _p, c) => lc(i.project) === lc(c.targetValue) },
  assigned:        { needsPrev: false, changeAware: true, dedup: (i) => `${i.id}:${lc(i.assignedTo)}`, match: (i, _p, c) => i.assignedTo && (!c.targetValue || lc(i.assignedTo).includes(lc(c.targetValue))) },
};

export async function pollSentry(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:sentry:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, organization, project } = cfg;
    if (!credentialId || !organization) return;
    const eventType = cfg.eventType || cfg.watchType || "new_issue";
    const spec = SENTRY_EVENTS[eventType] || SENTRY_EVENTS.new_issue;

    const token = await getOAuthToken(credentialId, workspaceId, "Sentry Trigger");
    const issues = await fetchIssues(token, organization, project, cfg.query);
    if (!issues.length) return;

    const snapKey = `bb:sentry:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const i of issues) nextSnap[i.id] = { lastSeen: i.lastSeen, count: i.count };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "new_issue")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:sentry:seen:${scope}:${eventType}`;
    for (const i of issues) {
      const prev = prevSnap[i.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(i, prev, cfg)) continue;

      const dedup = spec.dedup(i);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          issueId: i.id, shortId: i.shortId, title: i.title, culprit: i.culprit,
          level: i.level, status: i.status, substatus: i.substatus,
          count: i.count, userCount: i.userCount, project: i.project,
          assignedTo: i.assignedTo, isUnhandled: i.isUnhandled,
          firstSeen: i.firstSeen, lastSeen: i.lastSeen, url: i.permalink,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `sentry:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[SentryPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[SentryPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
