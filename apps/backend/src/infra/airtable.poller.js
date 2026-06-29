/**
 * Airtable Poller
 *
 * Polls an Airtable base/table for new (and optionally updated) records.
 * Uses a Redis watermark (ISO timestamp) to fetch only records created/modified
 * after the last poll. Falls back to a full listing on first run.
 *
 * Watermark key: bb:airtable:wm:{automationId} -> ISO timestamp string
 * Seen-record dedup: bb:airtable:seen:{automationId} -> Redis Set of record IDs
 * TTL: 30 days
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { resolveSecret } from "../utils/resolveSecret.js";

const AIRTABLE_QUEUE = "bb-airtable-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;

let atQueue = null;
let atWorker = null;

// Build the per-event Airtable filterByFormula from a mode + field/value.
// Each mode is a genuinely different query; `raw` is the power-user escape hatch.
function escAt(v) {
  return String(v).replace(/'/g, "\\'");
}
function buildFormula(cfg) {
  const { formulaMode, filterField, filterValue, filterFormula } = cfg;
  const f = filterField ? `{${filterField}}` : "";
  switch (formulaMode) {
    case "field_equals":     return f ? `${f} = '${escAt(filterValue)}'` : "";
    case "field_changed_to": return f ? `${f} = '${escAt(filterValue)}'` : "";
    case "checkbox_checked": return f ? `${f} = TRUE()` : "";
    case "field_not_empty":  return f ? `NOT({${filterField}} = '')` : "";
    case "field_empty":      return f ? `{${filterField}} = ''` : "";
    case "number_over":      return f ? `${f} >= ${Number(filterValue) || 0}` : "";
    case "date_today":       return f ? `IS_SAME(${f}, TODAY(), 'day')` : "";
    case "raw":              return filterFormula || "";
    default:                 return filterFormula || "";
  }
}

async function airtableGet(apiKey, baseId, tableId, params = {}) {
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Airtable API ${res.status}`);
  }
  return res.json();
}

export async function pollAirtable(
  automationId, triggerNodeId, apiKey, baseId, tableId,
  viewName, filterFormula, maxRecords, triggerOnUpdate, workspaceId, extra = {},
) {
  const scope = triggerNodeId || automationId;
  const lockKey  = `bb:airtable:lock:${scope}`;
  const seenKey  = `bb:airtable:seen:${scope}`;
  const wmKey    = `bb:airtable:wm:${scope}`;

  const locked = await acquireLock(lockKey, "poller", 120);
  if (!locked) return;

  try {
    apiKey = await resolveSecret(apiKey, workspaceId, "Airtable trigger");
    const watermark = await redis.get(wmKey);
    const now = new Date().toISOString();

    const params = {
      pageSize: Math.min(maxRecords || 20, 100),
      sort: JSON.stringify([{ field: "Created", direction: "asc" }]),
    };
    if (viewName) params.view = viewName;

    let formula = buildFormula({ ...extra, filterFormula }) || filterFormula || "";
    if (watermark) {
      const tsFilter = triggerOnUpdate
        ? `IS_AFTER(LAST_MODIFIED_TIME(), '${watermark}')`
        : `IS_AFTER(CREATED_TIME(), '${watermark}')`;
      formula = formula ? `AND(${formula}, ${tsFilter})` : tsFilter;
    }
    if (formula) params.filterByFormula = formula;

    const data = await airtableGet(apiKey, baseId, tableId, params);
    const records = data.records || [];

    if (!records.length) {
      await redis.set(wmKey, now);
      return;
    }

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    for (const record of records) {
      const claimed = await redis.sadd(seenKey, `${record.id}:${record.fields["Modified"] || record.createdTime}`);
      await redis.expire(seenKey, SEEN_TTL);
      if (claimed === 0 && !triggerOnUpdate) continue;

      try {
        const payload = { id: record.id, createdTime: record.createdTime, fields: record.fields, _meta: { baseId, tableId } };
        await executeAutomation(automation, payload, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `airtable:${scope}:${record.id}:${record.fields["Modified"] || record.createdTime}` });
        console.log(`[AirtablePoller] Fired for "${automation.name}" record: ${record.id}`);
      } catch (err) {
        console.error(`[AirtablePoller] Failed to process ${record.id}:`, err.message);
      }
    }

    await redis.set(wmKey, now);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startAirtablePoller() {
  console.log("[AirtablePoller] Starting...");

  atQueue = new Queue(AIRTABLE_QUEUE, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });

  atWorker = new Worker(
    AIRTABLE_QUEUE,
    async (job) => {
      const { automationId, triggerNodeId, apiKey, baseId, tableId, viewName, filterFormula, maxRecords, triggerOnUpdate, workspaceId, formulaMode, filterField, filterValue } = job.data;
      await pollAirtable(automationId, triggerNodeId, apiKey, baseId, tableId, viewName, filterFormula, maxRecords, triggerOnUpdate, workspaceId, { formulaMode, filterField, filterValue });
    },
    { connection: createBullMQConnection(), concurrency: 4 },
  );

  atWorker.on("failed", (job, err) => {
    console.error(`[AirtablePoller] Job failed for ${job?.data?.automationId}:`, err.message);
  });

  await syncAirtableJobs();
  console.log("[AirtablePoller] Ready");
}

export async function syncAirtableJobs() {
  if (!atQueue) return;

  const existing = await atQueue.getRepeatableJobs();
  for (const job of existing) await atQueue.removeRepeatableByKey(job.key);

  const automations = await Automation.find({ trigger: "airtable_trigger", active: true });

  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || entryNode?.data || {};
    const { apiKey, baseId, tableId, viewName, filterFormula, maxRecords, triggerOnUpdate, pollInterval, formulaMode, filterField, filterValue } = cfg;

    if (!apiKey || !baseId || !tableId) {
      console.warn(`[AirtablePoller] Automation ${automation._id} missing required fields, skipping`);
      continue;
    }

    const interval = pollInterval || "*/5 * * * *";
    await atQueue.add(
      "airtable-poll",
      {
        automationId: automation._id.toString(),
        apiKey, baseId, tableId, viewName, filterFormula,
        maxRecords: maxRecords || 20,
        triggerOnUpdate: !!triggerOnUpdate,
        workspaceId: automation.workspaceId,
        formulaMode, filterField, filterValue,
      },
      { repeat: { pattern: interval }, jobId: `airtable-${automation._id}` },
    );
    console.log(`[AirtablePoller] Registered: "${automation.name}" → ${baseId}/${tableId} every ${interval}`);
  }

  console.log(`[AirtablePoller] Synced ${automations.length} Airtable automations`);
}

export async function stopAirtablePoller() {
  if (atWorker) await atWorker.close();
  if (atQueue)  await atQueue.close();
  atWorker = null;
  atQueue = null;
}
