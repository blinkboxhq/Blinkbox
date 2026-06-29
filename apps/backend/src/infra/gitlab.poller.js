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
import { resolveSecret } from "../utils/resolveSecret.js";
import { assertSafeHost } from "../utils/ssrf.js";

const QUEUE_NAME = "bb-gitlab-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let gitlabQueue = null;
let gitlabWorker = null;

// Maps an event type to its GitLab API v4 path (relative to the project) and a
// shaper that flattens the raw object into a stable $trigger payload.
const GITLAB_SCOPES = {
  merge_request: {
    path: "merge_requests?state=opened&order_by=created_at&sort=desc&per_page=20",
    shape: (m) => ({ title: m.title, state: m.state, sourceBranch: m.source_branch, targetBranch: m.target_branch, draft: m.draft }),
  },
  merge_request_merged: {
    path: "merge_requests?state=merged&order_by=updated_at&sort=desc&per_page=20",
    shape: (m) => ({ title: m.title, state: m.state, mergedBy: m.merged_by?.name, mergedAt: m.merged_at, targetBranch: m.target_branch }),
  },
  issue: {
    path: "issues?state=opened&order_by=created_at&sort=desc&per_page=20",
    shape: (i) => ({ title: i.title, state: i.state, labels: i.labels, assignees: (i.assignees || []).map((a) => a.name) }),
  },
  issue_closed: {
    path: "issues?state=closed&order_by=updated_at&sort=desc&per_page=20",
    shape: (i) => ({ title: i.title, state: i.state, closedAt: i.closed_at }),
  },
  pipeline: {
    path: "pipelines?order_by=id&sort=desc&per_page=20",
    shape: (p) => ({ status: p.status, ref: p.ref, sha: p.sha, source: p.source }),
  },
  pipeline_failed: {
    path: "pipelines?status=failed&order_by=id&sort=desc&per_page=20",
    shape: (p) => ({ status: p.status, ref: p.ref, sha: p.sha, source: p.source }),
  },
  commit: {
    path: "repository/commits?per_page=20",
    shape: (c) => ({ title: c.title, message: c.message, sha: c.id, committerName: c.committer_name }),
  },
  tag: {
    path: "repository/tags?order_by=updated&sort=desc&per_page=20",
    shape: (t) => ({ tag: t.name, message: t.message, sha: t.commit?.id }),
  },
  release: {
    path: "releases?order_by=created_at&sort=desc&per_page=20",
    shape: (r) => ({ tag: r.tag_name, title: r.name, description: r.description, releasedAt: r.released_at }),
  },
  branch: {
    path: "repository/branches?per_page=50",
    shape: (b) => ({ branch: b.name, sha: b.commit?.id, protected: b.protected, default: b.default }),
  },
  member: {
    path: "members?per_page=50",
    shape: (m) => ({ memberName: m.name, username: m.username, accessLevel: m.access_level }),
  },
  milestone: {
    path: "milestones?order_by=created_at&sort=desc&per_page=20",
    shape: (m) => ({ title: m.title, state: m.state, dueDate: m.due_date }),
  },
};

// Objects that lack a numeric id/iid dedup on a stable natural key instead.
function gitlabDedupId(evt) {
  return String(evt.id ?? evt.iid ?? evt.name ?? evt.username ?? evt.tag_name ?? "");
}

async function fetchEvents(host = "gitlab.com", projectId, token, eventType) {
  assertSafeHost(host.split("/")[0]);
  const scope = GITLAB_SCOPES[eventType] || GITLAB_SCOPES.merge_request;
  const url = `https://${host}/api/v4/projects/${encodeURIComponent(projectId)}/${scope.path}`;
  const res = await fetch(url, {
    headers: { "PRIVATE-TOKEN": token },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`GitLab API ${res.status}: ${await res.text()}`);
  return await res.json();
}

export async function pollGitLab(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:gitlab:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { host = "gitlab.com", projectId, token: rawToken, eventType = "merge_request" } = cfg;
    if (!projectId || !rawToken) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const token = await resolveSecret(rawToken, automation.workspaceId?.toString(), "GitLab trigger");
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const events = await fetchEvents(host, projectId, token, eventType);
    const shape = (GITLAB_SCOPES[eventType] || GITLAB_SCOPES.merge_request).shape;
    const seenKey = `bb:gitlab:seen:${scope}:${eventType}`;
    for (const evt of events) {
      const id = gitlabDedupId(evt);
      if (!id) continue;
      const added = await redis.sadd(seenKey, id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const payload = {
        id, type: eventType,
        author: evt.author?.name || evt.user?.name || evt.committer_name || "",
        url: evt.web_url || evt.web_path || "",
        createdAt: evt.created_at || evt.committed_date,
        projectId,
        ...shape(evt),
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `gitlab:${scope}:${eventType}:${id}`,
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
    await pollGitLab(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
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
