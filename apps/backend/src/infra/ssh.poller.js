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

const QUEUE_NAME = "bb-ssh-poller";
let sshQueue = null;
let sshWorker = null;

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

export async function pollSsh(automationId, cfg) {
  const lockKey = `bb:ssh:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 120);
  if (!locked) return;
  try {
    const { host, command } = cfg;
    if (!host || !command) return;
    assertSafeHost(host);
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const result = await runCommand(cfg);
    const onlyOnChange = cfg.onlyOnChange ?? false;
    if (onlyOnChange) {
      // Only fire if stdout changed since last run (stored in redis)
      const { redis } = await import("./redis.client.js");
      const key = `bb:ssh:last:${automationId}`;
      const last = await redis.get(key);
      if (last === result.stdout) return;
      await redis.set(key, result.stdout, "EX", 30 * 24 * 60 * 60);
    }
    await executeAutomation(automation, { ...result, host, command }, {
      workspaceId: automation.workspaceId,
      idempotencyKey: `ssh:${automationId}:${Date.now()}`,
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
    await pollSsh(job.data.automationId, job.data.cfg);
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
      cfg: { host: cfg.host, port: cfg.port, username: cfg.username, password: cfg.password, privateKey: cfg.privateKey, passphrase: cfg.passphrase, authMethod: cfg.authMethod, command: cfg.command, onlyOnChange: cfg.onlyOnChange },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `ssh-${automation._id}` });
  }
  console.log(`[SshPoller] Synced ${automations.length} automations`);
}

export async function stopSshPoller() {
  if (sshWorker) await sshWorker.close();
  if (sshQueue) await sshQueue.close();
  sshWorker = null; sshQueue = null;
}
