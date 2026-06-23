/**
 * Database Row Poller
 *
 * Polls PostgreSQL or MySQL tables for new/updated rows using a watermark
 * strategy: stores the last-seen timestamp in Redis and queries
 *   WHERE {timestampColumn} > {watermark} ORDER BY {timestampColumn} ASC LIMIT {max}
 *
 * This avoids CDC infrastructure requirements while covering 90% of use cases.
 *
 * Supported:
 *   - PostgreSQL (via `pg`)
 *   - MySQL / MariaDB (via `mysql2`)
 *
 * Both packages are optional — only loaded when a db_trigger automation exists.
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const DB_QUEUE_NAME = "bb-db-poller";

let dbQueue = null;
let dbWorker = null;

// ── DB query helpers ──────────────────────────────────────────────────────────

async function queryPostgres(connectionString, sql, params) {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    throw new Error("pg package not installed. Run: cd apps/backend && npm install pg");
  }
  const { Client } = pg.default || pg;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function queryMysql(connectionString, sql, params) {
  let mysql;
  try {
    mysql = await import("mysql2/promise");
  } catch {
    throw new Error("mysql2 package not installed. Run: cd apps/backend && npm install mysql2");
  }
  const conn = await mysql.createConnection(connectionString);
  try {
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    await conn.end();
  }
}

async function queryRows(dbType, connectionString, tableName, timestampColumn, watermark, limit) {
  // Sanitize table/column names (no user-controlled interpolation into SQL)
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(tableName)) {
    throw new Error(`Invalid table name: "${tableName}"`);
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(timestampColumn)) {
    throw new Error(`Invalid column name: "${timestampColumn}"`);
  }

  const sql = dbType === "mysql"
    ? `SELECT * FROM \`${tableName}\` WHERE \`${timestampColumn}\` > ? ORDER BY \`${timestampColumn}\` ASC LIMIT ?`
    : `SELECT * FROM "${tableName}" WHERE "${timestampColumn}" > $1 ORDER BY "${timestampColumn}" ASC LIMIT $2`;

  return dbType === "mysql"
    ? queryMysql(connectionString, sql, [watermark, limit])
    : queryPostgres(connectionString, sql, [watermark, limit]);
}

// ── Poll logic ────────────────────────────────────────────────────────────────

export async function pollTable(automationId, cfg, resolvedConnectionString) {
  const {
    dbType = "postgres",
    tableName,
    timestampColumn = "created_at",
    watchMode = "new_rows",
    maxRowsPerPoll = 100,
  } = cfg;

  if (!tableName) return;

  // Prevent concurrent workers from reading the same watermark and double-firing rows
  const pollLockKey = `bb:dbpoll:lock:${automationId}`;
  const pollLocked = await acquireLock(pollLockKey, "poller", 120);
  if (!pollLocked) {
    console.warn(`[DBPoller] Automation ${automationId} already polling, skipping concurrent tick`);
    return;
  }

  try {
    await pollTableInner(automationId, cfg, resolvedConnectionString, dbType, tableName, timestampColumn, watchMode, maxRowsPerPoll);
  } finally {
    await releaseLock(pollLockKey, "poller");
  }
}

export async function pollTableInner(automationId, cfg, resolvedConnectionString, dbType, tableName, timestampColumn, watchMode, maxRowsPerPoll) {
  const watermarkKey = `bb:dbpoll:watermark:${automationId}`;
  const watermarkRaw = await redis.get(watermarkKey);
  // Default: 1 minute ago on first run to avoid mass-triggering historical data
  const watermark = watermarkRaw
    ? new Date(watermarkRaw)
    : new Date(Date.now() - 60_000);

  // For updated_rows we use updated_at, for new_rows we use created_at
  const effectiveColumn =
    watchMode === "updated_rows"
      ? (cfg.updatedAtColumn || "updated_at")
      : timestampColumn;

  let rows;
  try {
    rows = await queryRows(dbType, resolvedConnectionString, tableName, effectiveColumn, watermark, maxRowsPerPoll);
  } catch (err) {
    console.warn(`[DBPoller] Query failed for ${automationId}: ${err.message}`);
    return;
  }

  if (!rows.length) return;

  const { executeAutomation } = await import(
    "../modules/automation/automation.executor.js"
  );
  const automation = await Automation.findOne({ _id: automationId, active: true });
  if (!automation) return;

  const detectedAt = new Date().toISOString();
  const eventType = watchMode === "updated_rows" ? "updated_row" : "new_row";

  // Track the max timestamp from this batch as the new watermark
  let maxTs = watermark;

  for (const row of rows) {
    const rowTs = row[effectiveColumn];
    if (rowTs && new Date(rowTs) > maxTs) maxTs = new Date(rowTs);

    try {
      await executeAutomation(
        automation,
        { row, tableName, event: eventType, detectedAt },
        { workspaceId: automation.workspaceId, idempotencyKey: `db:${automationId}:${tableName}:${row[cfg.primaryKeyColumn || "id"] ?? new Date(rowTs).getTime()}` },
      );
      console.log(`[DBPoller] Fired "${automation.name}" for row in ${tableName}`);
    } catch (err) {
      console.error(`[DBPoller] Failed to fire "${automation.name}":`, err.message);
    }
  }

  // Advance watermark past last processed row
  await redis.set(watermarkKey, maxTs.toISOString());
}

// ── BullMQ setup ──────────────────────────────────────────────────────────────

export async function startDbPoller() {
  console.log("[DBPoller] Starting...");

  dbQueue = new Queue(DB_QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  });

  dbWorker = new Worker(
    DB_QUEUE_NAME,
    async (job) => {
      const { automationId, cfg, credentialId, rawConnectionString } = job.data;

      let connectionString = rawConnectionString || cfg.connectionString || "";

      // Resolve connection string from vault if stored as credential
      if (credentialId && !connectionString) {
        try {
          const { resolveCredential } = await import("../modules/credentials/credential.service.js");
          const cred = await resolveCredential(credentialId);
          connectionString = cred?.value || cred?.connectionString || "";
        } catch (err) {
          console.error(`[DBPoller] Credential resolution failed for ${automationId}:`, err.message);
          return;
        }
      }

      if (!connectionString) {
        console.warn(`[DBPoller] No connection string for automation ${automationId}`);
        return;
      }

      await pollTable(automationId, cfg, connectionString);
    },
    { connection: createBullMQConnection(), concurrency: 3 },
  );

  dbWorker.on("failed", (job, err) => {
    console.error(`[DBPoller] Job failed for ${job?.data?.automationId}:`, err.message);
  });

  await syncDbJobs();
  console.log("[DBPoller] Ready");
}

export async function syncDbJobs() {
  if (!dbQueue) return;

  const existing = await dbQueue.getRepeatableJobs();
  for (const job of existing) {
    await dbQueue.removeRepeatableByKey(job.key);
  }

  const dbAutomations = await Automation.find({ trigger: "db_trigger", active: true });

  for (const automation of dbAutomations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    const pollInterval = cfg.pollInterval || "* * * * *";

    if (!cfg.tableName) {
      console.warn(`[DBPoller] Automation ${automation._id} missing tableName, skipping`);
      continue;
    }

    await dbQueue.add(
      "db-poll",
      {
        automationId: automation._id.toString(),
        cfg,
        credentialId: cfg.credentialId || null,
        rawConnectionString: cfg.connectionString || null,
      },
      { repeat: { pattern: pollInterval }, jobId: `db-${automation._id}` },
    );

    console.log(`[DBPoller] Registered: "${automation.name}" → ${cfg.dbType || "postgres"}/${cfg.tableName}`);
  }

  console.log(`[DBPoller] Synced ${dbAutomations.length} DB automations`);
}

export async function addDbJob(automationId, cfg, credentialId, pollInterval) {
  if (!dbQueue) return;
  await dbQueue.add(
    "db-poll",
    { automationId: automationId.toString(), cfg, credentialId },
    { repeat: { pattern: pollInterval || "* * * * *" }, jobId: `db-${automationId}` },
  );
}

export async function removeDbJob(automationId) {
  if (!dbQueue) return;
  const jobs = await dbQueue.getRepeatableJobs();
  for (const job of jobs) {
    if (job.id === `db-${automationId}`) {
      await dbQueue.removeRepeatableByKey(job.key);
    }
  }
}

export async function stopDbPoller() {
  if (dbWorker) await dbWorker.close();
  if (dbQueue) await dbQueue.close();
  dbWorker = null;
  dbQueue = null;
}
