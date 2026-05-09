/**
 * GitLab Poller
 * Polls GitLab projects for new merge requests, issues, or pipeline events.
 * Dedup key: bb:gitlab:seen:{automationId} — event ID set, 30-day TTL.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { assertSafeHost } from "../utils/ssrf.js";

const QUEUE_NAME = "bb-gitlab-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let gitlabQueue = null;
let gitlabWorker = null;

async function fetchEvents(host = "gitlab.com", projectId, token, eventType) {
  assertSafeHost(host.split("/")[0]);
  const scope = eventType === "merge_request" ? "merge_requests" : eventType === "pipeline" ? "pipelines" : "issues";
  const url = `https://${host}/api/v4/projects/${encodeURIComponent(projectId)}/${scope}?per_page=20&order_by=created_at&sort=desc`;
  const res = await fetch(url, {
    headers: { "PRIVATE-TOKEN": token },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`GitLab API ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function pollGitLab(automationId, cfg) {
  const lockKey = `bb:gitlab:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { host = "gitlab.com", projectId, token, eventType = "merge_request" } = cfg;
    if (!projectId || !token) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const events = await fetchEvents(host, projectId, token, eventType);
    const seenKey = `bb:gitlab:seen:${automationId}`;
    for (const evt of events) {
      const id = String(evt.id || evt.iid);
      const added = await redis.sadd(seenKey, id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const payload = {
        id, type: eventType,
        title: evt.title || evt.name || "",
        state: evt.state || evt.status || "",
        author: evt.author?.name || evt.user?.name || "",
        url: evt.web_url || evt.web_path || "",
        createdAt: evt.created_at,
        projectId,
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        idempotencyKey: `gitlab:${automationId}:${eventType}:${id}`,
      });
    }
  } catch (err) {
    console.warn(`[GitLabPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startGitLabPoller() {
  console.log("[GitLabPoller] Starting...");
  gitlabQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  gitlabWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollGitLab(job.data.automationId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  gitlabWorker.on("failed", (job, err) => console.error(`[GitLabPoller] Job failed:`, err.message));
  await syncGitLabJobs();
  console.log("[GitLabPoller] Ready");
}

export async function syncGitLabJobs() {
  if (!gitlabQueue) return;
  const existing = await gitlabQueue.getRepeatableJobs();
  for (const job of existing) await gitlabQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "gitlab_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.projectId || !cfg.token) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await gitlabQueue.add("gitlab-poll", {
      automationId: automation._id.toString(),
      cfg: { host: cfg.host, projectId: cfg.projectId, token: cfg.token, eventType: cfg.eventType },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `gitlab-${automation._id}` });
  }
  console.log(`[GitLabPoller] Synced ${automations.length} automations`);
}

export async function stopGitLabPoller() {
  if (gitlabWorker) await gitlabWorker.close();
  if (gitlabQueue) await gitlabQueue.close();
  gitlabWorker = null; gitlabQueue = null;
}
