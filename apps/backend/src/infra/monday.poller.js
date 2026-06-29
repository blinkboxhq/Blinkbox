import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const GQL_URL = "https://api.monday.com/v2";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull a board's most-recent items via GraphQL and normalize the fields the
// event predicates compare. Column text is keyed by both column id and title
// so events can match a column by either.
async function fetchItems(token, boardId) {
  const query = `
    query($boardId: ID!, $limit: Int) {
      boards(ids: [$boardId]) {
        items_page(limit: $limit) {
          items {
            id name state created_at updated_at
            group { id title }
            column_values { id text type ... on StatusValue { label } }
          }
        }
      }
    }`;
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query, variables: { boardId: String(boardId), limit: 100 } }),
  });
  if (!res.ok) throw new Error(`Monday API ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Monday GraphQL — ${json.errors[0]?.message || "error"}`);
  const items = json.data?.boards?.[0]?.items_page?.items || [];
  return items.map((it) => {
    const cols = {};
    const statusValues = [];
    let person = "";
    for (const c of it.column_values || []) {
      const text = c.label || c.text || "";
      if (c.id) cols[c.id] = text;
      if (c.type === "status" || c.type === "color") statusValues.push(text);
      if ((c.type === "people" || c.type === "person") && c.text) person = c.text;
    }
    return {
      id: String(it.id),
      name: it.name || "",
      state: it.state || "",
      group: it.group?.title || "",
      groupId: it.group?.id || "",
      columns: cols,
      statusText: statusValues.filter(Boolean).join(", "),
      statusValues,
      person,
      createdAt: it.created_at,
      updatedAt: it.updated_at,
    };
  });
}

const lc = (s) => String(s ?? "").toLowerCase();
const colHas = (it, val) =>
  Object.values(it.columns).some((t) => lc(t) === lc(val));

// Each event is a predicate over the current item (`it`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire on each transition; `needsPrev` events stay quiet until
// a baseline snapshot exists.
const MONDAY_EVENTS = {
  item_created:    { needsPrev: false, dedup: (it) => `${it.id}`, match: (it, p) => !p },
  item_updated:    { needsPrev: true,  changeAware: true, dedup: (it) => `${it.id}:${it.updatedAt}`, match: (it, p) => it.updatedAt && it.updatedAt !== p.updatedAt },
  status_changed:  { needsPrev: true,  changeAware: true, dedup: (it) => `${it.id}:${lc(it.statusText)}`, match: (it, p) => lc(it.statusText) !== lc(p.statusText || "") },
  status_is:       { needsPrev: false, changeAware: true, dedup: (it) => `${it.id}:${lc(it.statusText)}`, match: (it, _p, c) => it.statusValues.map(lc).includes(lc(c.targetValue)) },
  done:            { needsPrev: false, changeAware: true, dedup: (it) => `${it.id}:done`, match: (it) => it.statusValues.map(lc).some((s) => s === "done" || s === "complete" || s === "completed") },
  stuck:           { needsPrev: false, dedup: (it) => `${it.id}:stuck`, match: (it) => it.statusValues.map(lc).includes("stuck") },
  moved_group:     { needsPrev: true,  changeAware: true, dedup: (it) => `${it.id}:${lc(it.group)}`, match: (it, p) => lc(it.group) !== lc(p.group || "") },
  in_group:        { needsPrev: false, changeAware: true, dedup: (it) => `${it.id}:${it.updatedAt}`, match: (it, _p, c) => lc(it.group) === lc(c.targetValue) },
  assigned:        { needsPrev: false, changeAware: true, dedup: (it) => `${it.id}:${lc(it.person)}`, match: (it, _p, c) => it.person && (!c.targetValue || lc(it.person).includes(lc(c.targetValue))) },
  archived:        { needsPrev: false, dedup: (it) => `${it.id}:archived`, match: (it) => it.state === "archived" },
  name_contains:   { needsPrev: false, changeAware: true, dedup: (it) => `${it.id}:${it.updatedAt}`, match: (it, _p, c) => lc(it.name).includes(lc(c.targetValue)) },
  column_value_is: { needsPrev: false, changeAware: true, dedup: (it) => `${it.id}:${it.updatedAt}`, match: (it, _p, c) => colHas(it, c.targetValue) },
};

export async function pollMonday(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:monday:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, boardId } = cfg;
    if (!credentialId || !boardId) return;
    const eventType = cfg.eventType || cfg.watchType || "item_created";
    const spec = MONDAY_EVENTS[eventType] || MONDAY_EVENTS.item_created;

    const token = await getOAuthToken(credentialId, workspaceId, "Monday Trigger");
    const items = await fetchItems(token, boardId);
    if (!items.length) return;

    const snapKey = `bb:monday:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const it of items) {
      nextSnap[it.id] = { statusText: it.statusText, group: it.group, updatedAt: it.updatedAt };
    }
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "item_created")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:monday:seen:${scope}:${eventType}`;
    for (const it of items) {
      const prev = prevSnap[it.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(it, prev, cfg)) continue;

      const dedup = spec.dedup(it);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          itemId: it.id, name: it.name, state: it.state,
          group: it.group, status: it.statusText, assignee: it.person,
          columns: it.columns, createdAt: it.createdAt, updatedAt: it.updatedAt,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `monday:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[MondayPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[MondayPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
