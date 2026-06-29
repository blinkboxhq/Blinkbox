import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const BASE = "https://api.clickup.com/api/v2";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull the most-recently-updated tasks from a list and normalize the fields the
// event predicates care about. ClickUp timestamps are ms-epoch strings.
async function fetchTasks(token, listId) {
  const url = `${BASE}/list/${encodeURIComponent(listId)}/task?order_by=updated&subtasks=true&include_closed=true`;
  const res = await fetch(url, { headers: { Authorization: token } });
  if (!res.ok) throw new Error(`ClickUp API ${res.status}`);
  const data = await res.json();
  return (data.tasks || []).map((t) => ({
    id: t.id,
    name: t.name || "",
    url: t.url,
    status: t.status?.status || "",
    statusType: t.status?.type || "",
    priority: t.priority?.priority || "",
    assignees: (t.assignees || []).map((a) => ({ id: a.id, name: a.username || a.email || "" })),
    tags: (t.tags || []).map((g) => g.name),
    dueDate: t.due_date ? Number(t.due_date) : null,
    dateCreated: t.date_created ? Number(t.date_created) : null,
    dateUpdated: t.date_updated ? Number(t.date_updated) : null,
    dateDone: t.date_done ? Number(t.date_done) : null,
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();
const hasUser = (task, val) =>
  task.assignees.some((a) => lc(a.name) === lc(val) || String(a.id) === String(val));

// Each event is a predicate over the current task (`t`), its previous snapshot
// (`p`, may be null), and the config (`c`). `changeAware` events dedup on a
// changing token so they re-fire on each transition; `needsPrev` events stay
// quiet until a baseline snapshot exists.
const CLICKUP_EVENTS = {
  task_created:    { needsPrev: false, dedup: (t) => `${t.id}`, match: (t, p) => !p },
  task_updated:    { needsPrev: true,  changeAware: true, dedup: (t) => `${t.id}:${t.dateUpdated}`, match: (t, p) => t.dateUpdated && t.dateUpdated !== p.dateUpdated },
  status_changed:  { needsPrev: true,  changeAware: true, dedup: (t) => `${t.id}:${lc(t.status)}`, match: (t, p) => lc(t.status) !== lc(p.status) },
  moved_to_status: { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:${lc(t.status)}`, match: (t, _p, c) => lc(t.status) === lc(c.targetValue) },
  completed:       { needsPrev: false, dedup: (t) => `${t.id}:done`, match: (t) => t.statusType === "closed" || t.statusType === "done" || !!t.dateDone },
  priority_set:    { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:${lc(t.priority)}`, match: (t, _p, c) => lc(t.priority) === lc(c.targetValue) },
  assignee_added:  { needsPrev: true,  changeAware: true, dedup: (t) => `${t.id}:${t.assignees.length}`, match: (t, p, c) => (c.targetValue ? hasUser(t, c.targetValue) : t.assignees.length > (p.assigneeCount || 0)) && t.assignees.length > (p.assigneeCount || 0) },
  unassigned:      { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:un`, match: (t) => t.assignees.length === 0 },
  due_date_set:    { needsPrev: true,  dedup: (t) => `${t.id}:due:${t.dueDate}`, match: (t, p) => !!t.dueDate && !p.dueDate },
  overdue:         { needsPrev: false, dedup: (t) => `${t.id}:overdue`, match: (t) => !!t.dueDate && t.dueDate < Date.now() && t.statusType !== "closed" && t.statusType !== "done" },
  tag_added:       { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:tag:${lc(String((t.tags || [])))}`, match: (t, _p, c) => t.tags.map(lc).includes(lc(c.targetValue)) },
  name_contains:   { needsPrev: false, changeAware: true, dedup: (t) => `${t.id}:${t.dateUpdated}`, match: (t, _p, c) => lc(t.name).includes(lc(c.targetValue)) },
};

export async function pollClickUp(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:clickup:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, listId } = cfg;
    if (!credentialId || !listId) return;
    const eventType = cfg.eventType || cfg.watchType || "task_created";
    const spec = CLICKUP_EVENTS[eventType] || CLICKUP_EVENTS.task_created;

    const token = await getOAuthToken(credentialId, workspaceId, "ClickUp Trigger");
    const tasks = await fetchTasks(token, listId);
    if (!tasks.length) return;

    const snapKey = `bb:clickup:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const t of tasks) {
      nextSnap[t.id] = {
        status: t.status, dateUpdated: t.dateUpdated,
        dueDate: t.dueDate, assigneeCount: t.assignees.length,
      };
    }
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && spec.needsPrev) return;
    if (firstSync && eventType === "task_created") return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:clickup:seen:${scope}:${eventType}`;
    for (const t of tasks) {
      const prev = prevSnap[t.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(t, prev, cfg)) continue;

      const dedup = spec.dedup(t);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          taskId: t.id, name: t.name, url: t.url, status: t.status,
          priority: t.priority, assignees: t.assignees.map((a) => a.name).join(", "),
          tags: t.tags, dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
          createdAt: t.dateCreated ? new Date(t.dateCreated).toISOString() : null,
          updatedAt: t.dateUpdated ? new Date(t.dateUpdated).toISOString() : null,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `clickup:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[ClickUpPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[ClickUpPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
