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

export async function pollGoogleSheets(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:gsheets:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { credentialId, workspaceId, spreadsheetId, range = "Sheet1", hasHeader = true } = cfg;
    if (!spreadsheetId || !credentialId) return;
    const accessToken = await getOAuthToken(credentialId, workspaceId, "Google Sheets Trigger");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const rows = await fetchRows(spreadsheetId, range, accessToken);
    const watermarkKey = `bb:gsheets:watermark:${scope}`;
    const lastSeen = parseInt(await redis.get(watermarkKey) || "0");
    const startRow = hasHeader ? Math.max(1, lastSeen) : lastSeen;
    const header = hasHeader && rows.length > 0 ? rows[0] : null;
    const newRows = rows.slice(startRow);
    if (newRows.length === 0) return;

    await redis.set(watermarkKey, rows.length, "EX", 30 * 24 * 60 * 60);
    for (let i = 0; i < newRows.length; i++) {
      const row = newRows[i];
      const payload = header
        ? Object.fromEntries(header.map((h, j) => [h, row[j] ?? ""]))
        : { values: row, rowIndex: startRow + i };
      payload._rowNumber = startRow + i + 1;
      payload._spreadsheetId = spreadsheetId;
      payload._range = range;
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `gsheets:${scope}:row:${startRow + i}`,
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
    await pollGoogleSheets(job.data.automationId, job.data.cfg);
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
      cfg: { credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(), spreadsheetId: cfg.spreadsheetId, range: cfg.range, hasHeader: cfg.hasHeader },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `gsheets-${automation._id}` });
  }
  console.log(`[GoogleSheetsPoller] Synced ${automations.length} automations`);
}

export async function stopGoogleSheetsPoller() {
  if (gsheetsWorker) await gsheetsWorker.close();
  if (gsheetsQueue) await gsheetsQueue.close();
  gsheetsWorker = null; gsheetsQueue = null;
}
