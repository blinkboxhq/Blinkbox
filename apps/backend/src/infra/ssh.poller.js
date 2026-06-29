/**
 * SSH Command Poller
 * Runs a command on a remote server via SSH on a schedule.
 * Fires the automation with stdout/stderr/exitCode output.
 * Dedup key: bb:ssh:lastRun:{automationId} — fires every interval regardless (no dedup, output always emitted).
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { Client as SshClient } from "ssh2";
import { assertSafeHost } from "../utils/ssrf.js";
import crypto from "crypto";

const QUEUE_NAME = "bb-ssh-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();
const firstNumber = (s) => {
  const m = String(s ?? "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

let sshQueue = null;
let sshWorker = null;

// Each event is a predicate over the run result (`r` = {stdout,stderr,exitCode})
// and config (`c`). Most are stateless per-run classifiers; `output_changed`
// compares against the last stdout hash (caller passes `c.lastHash`). `dedup`
// keeps a given outcome from re-firing until it changes — except command_runs,
// which fires every successful run.
const SSH_EVENTS = {
  command_runs:       { dedup: () => `${Date.now()}`, match: () => true },
  output_changed:     { dedup: (r) => `h:${r.hash}`, match: (r, c) => !!c.lastHash && r.hash !== c.lastHash },
  output_contains:    { dedup: (r) => `c:${r.hash}`, match: (r, c) => !!c.targetValue && lc(r.stdout).includes(lc(c.targetValue)) },
  output_not_contains:{ dedup: (r) => `nc:${r.hash}`, match: (r, c) => !!c.targetValue && !lc(r.stdout).includes(lc(c.targetValue)) },
  exit_nonzero:       { dedup: (r) => `ec:${r.exitCode}`, match: (r) => Number(r.exitCode) !== 0 },
  exit_zero:          { dedup: (r) => `ok:${r.hash}`, match: (r) => Number(r.exitCode) === 0 },
  stderr_present:     { dedup: (r) => `se:${r.hash}`, match: (r) => r.stderr.length > 0 },
  output_empty:       { dedup: (r) => `empty:${r.exitCode}`, match: (r) => r.stdout.length === 0 },
  output_over_lines:  { dedup: (r) => `ln:${r.lines}`, match: (r, c) => r.lines >= Number(c.targetValue || 0) },
  numeric_over:       { dedup: (r) => `gt:${r.num}`, match: (r, c) => r.num != null && r.num > Number(c.targetValue) },
  numeric_under:      { dedup: (r) => `lt:${r.num}`, match: (r, c) => r.num != null && r.num < Number(c.targetValue) },
  matches_regex:      { dedup: (r) => `re:${r.hash}`, match: (r, c) => { try { return !!c.targetValue && new RegExp(c.targetValue).test(r.stdout); } catch { return false; } } },
};

function runCommand(cfg) {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    let stdout = "";
    let stderr = "";

    conn.on("ready", () => {
      conn.exec(cfg.command, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream.on("data", (d) => { stdout += d.toString(); });
        stream.stderr.on("data", (d) => { stderr += d.toString(); });
        stream.on("close", (exitCode) => {
          conn.end();
          resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode });
        });
      });
    });

    conn.on("error", reject);

    const connectCfg = {
      host: cfg.host,
      port: parseInt(cfg.port) || 22,
      username: cfg.username,
      readyTimeout: 15000,
    };

    if (cfg.authMethod === "password") {
      connectCfg.password = cfg.password;
    } else {
      connectCfg.privateKey = cfg.privateKey;
      if (cfg.passphrase) connectCfg.passphrase = cfg.passphrase;
    }

    conn.connect(connectCfg);
  });
}

export async function pollSsh(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:ssh:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 120);
  if (!locked) return;
  try {
    const { host, command } = cfg;
    if (!host || !command) return;
    assertSafeHost(host);
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const { redis } = await import("./redis.client.js");

    // `onlyOnChange` is the legacy single-event behaviour — map it onto the new
    // output_changed event so old automations keep working.
    const evType = cfg.eventType || cfg.watchType || (cfg.onlyOnChange ? "output_changed" : "command_runs");
    const spec = SSH_EVENTS[evType] || SSH_EVENTS.command_runs;

    const raw = await runCommand(cfg);
    const result = {
      ...raw,
      hash: crypto.createHash("sha1").update(raw.stdout).digest("hex"),
      lines: raw.stdout ? raw.stdout.split("\n").length : 0,
      num: firstNumber(raw.stdout),
    };

    const hashKey = `bb:ssh:last:${scope}`;
    const lastHash = await redis.get(hashKey);
    await redis.set(hashKey, result.hash, "EX", SEEN_TTL);

    const c = { targetValue: cfg.targetValue, lastHash };
    if (!spec.match(result, c)) return;

    const dedup = spec.dedup(result, c);
    const seenKey = `bb:ssh:seen:${scope}:${evType}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) return;
    await redis.expire(seenKey, SEEN_TTL);

    await executeAutomation(automation, { ...result, host, command, eventType: evType }, {
      workspaceId: automation.workspaceId,
      entryNodeId: triggerNodeId || automation.entryNodeId,
      idempotencyKey: `ssh:${scope}:${evType}:${dedup}`,
    });
  } catch (err) {
    console.warn(`[SshPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startSshPoller() {
  console.log("[SshPoller] Starting...");
  sshQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  sshWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollSsh(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  sshWorker.on("failed", (job, err) => console.error(`[SshPoller] Job failed:`, err.message));
  await syncSshJobs();
  console.log("[SshPoller] Ready");
}

export async function syncSshJobs() {
  if (!sshQueue) return;
  const existing = await sshQueue.getRepeatableJobs();
  for (const job of existing) await sshQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "ssh_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.host || !cfg.command) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await sshQueue.add("ssh-poll", {
      automationId: automation._id.toString(),
      triggerNodeId: automation.entryNodeId,
      cfg: { host: cfg.host, port: cfg.port, username: cfg.username, password: cfg.password, privateKey: cfg.privateKey, passphrase: cfg.passphrase, authMethod: cfg.authMethod, command: cfg.command, onlyOnChange: cfg.onlyOnChange, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `ssh-${automation._id}` });
  }
  console.log(`[SshPoller] Synced ${automations.length} automations`);
}

export async function stopSshPoller() {
  if (sshWorker) await sshWorker.close();
  if (sshQueue) await sshQueue.close();
  sshWorker = null; sshQueue = null;
}
