/**
 * Docker Event Poller
 * Polls the Docker Engine API for container/image/volume events.
 * Supports local socket (/var/run/docker.sock) or remote TCP (host:port).
 * Dedup key: bb:docker:seen:{automationId} — event ID based on Actor+Action+time.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { assertSafeHost } from "../utils/ssrf.js";

const QUEUE_NAME = "bb-docker-poller";
const SEEN_TTL = 24 * 60 * 60; // 1 day
let dockerQueue = null;
let dockerWorker = null;

async function fetchDockerEvents(cfg) {
  const { host = "unix:///var/run/docker.sock", since } = cfg;
  const sinceParam = since ? `&since=${since}` : `&since=${Math.floor(Date.now() / 1000) - 300}`;

  if (!host.startsWith("unix://")) {
    const tcpHost = host.replace("tcp://", "").split(":")[0];
    assertSafeHost(tcpHost);
  }

  const baseUrl = host.startsWith("unix://")
    ? "http://localhost/v1.43/events"
    : `http://${host.replace("tcp://", "")}/v1.43/events`;

  const fetchOpts = host.startsWith("unix://")
    ? { socketPath: host.replace("unix://", "") }
    : {};

  const url = `${baseUrl}?until=${Math.floor(Date.now() / 1000)}${sinceParam}`;
  const res = await fetch(url, { ...fetchOpts, signal: AbortSignal.timeout(10000) });

  if (!res.ok) throw new Error(`Docker API ${res.status}`);

  const text = await res.text();
  const events = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch {}
  }
  return events;
}

export async function pollDocker(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:docker:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const { eventType = "all", containerFilter } = cfg;

    const events = await fetchDockerEvents(cfg);
    const seenKey = `bb:docker:seen:${scope}`;

    for (const evt of events) {
      const evtId = `${evt.Type}:${evt.Action}:${evt.Actor?.ID}:${evt.time}`;
      const added = await redis.sadd(seenKey, evtId);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);

      if (eventType !== "all" && evt.Type !== eventType) continue;
      if (containerFilter && !evt.Actor?.Attributes?.name?.includes(containerFilter)) continue;

      const payload = {
        type: evt.Type,
        action: evt.Action,
        actor: evt.Actor?.ID || "",
        name: evt.Actor?.Attributes?.name || "",
        image: evt.Actor?.Attributes?.image || "",
        attributes: evt.Actor?.Attributes || {},
        timestamp: new Date(evt.time * 1000).toISOString(),
        raw: evt,
      };

      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `docker:${scope}:${evtId}`,
      });
    }
  } catch (err) {
    console.warn(`[DockerPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startDockerPoller() {
  console.log("[DockerPoller] Starting...");
  dockerQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  dockerWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollDocker(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  dockerWorker.on("failed", (job, err) => console.error(`[DockerPoller] Job failed:`, err.message));
  await syncDockerJobs();
  console.log("[DockerPoller] Ready");
}

export async function syncDockerJobs() {
  if (!dockerQueue) return;
  const existing = await dockerQueue.getRepeatableJobs();
  for (const job of existing) await dockerQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "docker_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    await dockerQueue.add("docker-poll", {
      automationId: automation._id.toString(),
      cfg: { host: cfg.host, eventType: cfg.eventType, containerFilter: cfg.containerFilter },
    }, { repeat: { every: 30_000 }, jobId: `docker-${automation._id}` });
  }
  console.log(`[DockerPoller] Synced ${automations.length} automations`);
}

export async function stopDockerPoller() {
  if (dockerWorker) await dockerWorker.close();
  if (dockerQueue) await dockerQueue.close();
  dockerWorker = null; dockerQueue = null;
}
