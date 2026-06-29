/**
 * Google Sheets Poller
 * Polls a Google Sheet for new rows using the Sheets API v4.
 * Requires a Google OAuth credential (sheets.readonly scope).
 * Dedup key: bb:gsheets:seen:{automationId} — row index watermark in Redis.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const QUEUE_NAME = "bb-gsheets-poller";
let gsheetsQueue = null;
let gsheetsWorker = null;

const HASH_TTL = 30 * 24 * 60 * 60;

async function fetchRows(spreadsheetId, range, accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.values || [];
}

function colVal(payload, col) {
  if (!col) return undefined;
  if (Object.prototype.hasOwnProperty.call(payload, col)) return payload[col];
  const idx = /^[A-Za-z]+$/.test(col) ? colLetterToIndex(col) : parseInt(col, 10);
  return Number.isInteger(idx) ? (payload._cells || [])[idx] : undefined;
}
function colLetterToIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
function isFilled(v) { return v !== undefined && v !== null && String(v).trim() !== ""; }
function isChecked(v) {
  const s = String(v).trim().toLowerCase();
  return v === true || s === "true" || s === "yes" || s === "✓" || s === "checked";
}

// Each event = a predicate over a row + its change kind (added/updated/deleted).
// Column events read cfg.columnName (header name, A1 letter, or 0-based index).
const SHEETS_EVENTS = {
  row_added:      { kinds: ["added"],            match: () => true },
  row_updated:    { kinds: ["updated"],          match: () => true },
  row_deleted:    { kinds: ["deleted"],          match: () => true },
  any_change:     { kinds: ["added", "updated", "deleted"], match: () => true },
  cell_equals:    { kinds: ["added", "updated"], match: (p, c) => String(colVal(p, c.columnName) ?? "") === String(c.targetValue ?? "") },
  cell_changed_to:{ kinds: ["updated"],          match: (p, c) => String(colVal(p, c.columnName) ?? "") === String(c.targetValue ?? "") },
  cell_filled:    { kinds: ["added", "updated"], match: (p, c) => isFilled(colVal(p, c.columnName)) },
  cell_cleared:   { kinds: ["updated"],          match: (p, c) => !isFilled(colVal(p, c.columnName)) },
  contains_text:  { kinds: ["added", "updated"], match: (p, c) => String(colVal(p, c.columnName) ?? "").toLowerCase().includes(String(c.targetValue ?? "").toLowerCase()) },
  number_over:    { kinds: ["added", "updated"], match: (p, c) => Number(colVal(p, c.columnName)) >= Number(c.targetValue || 0) },
  number_under:   { kinds: ["added", "updated"], match: (p, c) => Number(colVal(p, c.columnName)) <= Number(c.targetValue || 0) },
  checkbox_checked:{ kinds: ["added", "updated"], match: (p, c) => isChecked(colVal(p, c.columnName)) },
};

function rowId(row, rowNumber) {
  const first = (row[0] ?? "").toString().trim();
  return first || `#${rowNumber}`;
}

export async function pollGoogleSheets(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:gsheets:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { credentialId, workspaceId, spreadsheetId, range = "Sheet1", hasHeader = true } = cfg;
    if (!spreadsheetId || !credentialId) return;
    const eventType = cfg.eventType || cfg.watchType || "row_added";
    const spec = SHEETS_EVENTS[eventType] || SHEETS_EVENTS.row_added;
    const accessToken = await getOAuthToken(credentialId, workspaceId, "Google Sheets Trigger");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const rows = await fetchRows(spreadsheetId, range, accessToken);
    const header = hasHeader && rows.length > 0 ? rows[0] : null;
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const hashKey = `bb:gsheets:hashes:${scope}`;
    const prev = (await redis.hgetall(hashKey)) || {};
    const current = {};
    const seen = new Set();

    const detected = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = (hasHeader ? i + 2 : i + 1);
      const id = rowId(row, rowNumber);
      const hash = JSON.stringify(row);
      current[id] = hash;
      seen.add(id);
      if (!(id in prev)) detected.push({ kind: "added", row, rowNumber, id });
      else if (prev[id] !== hash) detected.push({ kind: "updated", row, rowNumber, id });
    }
    for (const id of Object.keys(prev)) {
      if (!seen.has(id)) detected.push({ kind: "deleted", row: [], rowNumber: -1, id });
    }

    await redis.del(hashKey);
    if (Object.keys(current).length) await redis.hset(hashKey, current);
    await redis.expire(hashKey, HASH_TTL);

    const firstSync = Object.keys(prev).length === 0;
    if (firstSync) return;

    for (const ch of detected) {
      if (!spec.kinds.includes(ch.kind)) continue;
      const payload = header
        ? Object.fromEntries(header.map((h, j) => [h, ch.row[j] ?? ""]))
        : { values: ch.row };
      payload._cells = ch.row;
      payload._rowNumber = ch.rowNumber;
      payload._changeKind = ch.kind;
      payload._spreadsheetId = spreadsheetId;
      payload._range = range;
      if (!spec.match(payload, cfg)) continue;
      const dedup = ch.kind === "deleted" ? `${ch.id}:del` : `${ch.id}:${JSON.stringify(ch.row)}`;
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `gsheets:${scope}:${eventType}:${dedup}`,
      });
    }
  } catch (err) {
    console.warn(`[GoogleSheetsPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startGoogleSheetsPoller() {
  console.log("[GoogleSheetsPoller] Starting...");
  gsheetsQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  gsheetsWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollGoogleSheets(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  gsheetsWorker.on("failed", (job, err) => console.error(`[GoogleSheetsPoller] Job failed:`, err.message));
  await syncGoogleSheetsJobs();
  console.log("[GoogleSheetsPoller] Ready");
}

export async function syncGoogleSheetsJobs() {
  if (!gsheetsQueue) return;
  const existing = await gsheetsQueue.getRepeatableJobs();
  for (const job of existing) await gsheetsQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "google_sheets_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.spreadsheetId || !cfg.credentialId) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await gsheetsQueue.add("gsheets-poll", {
      automationId: automation._id.toString(),
      triggerNodeId: automation.entryNodeId,
      cfg: { credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(), spreadsheetId: cfg.spreadsheetId, range: cfg.range, hasHeader: cfg.hasHeader, eventType: cfg.eventType || cfg.watchType, columnName: cfg.columnName, targetValue: cfg.targetValue },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `gsheets-${automation._id}` });
  }
  console.log(`[GoogleSheetsPoller] Synced ${automations.length} automations`);
}

export async function stopGoogleSheetsPoller() {
  if (gsheetsWorker) await gsheetsWorker.close();
  if (gsheetsQueue) await gsheetsQueue.close();
  gsheetsWorker = null; gsheetsQueue = null;
}
