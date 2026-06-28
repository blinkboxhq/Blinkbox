/**
 * GitHub Issue/PR Poller
 * Polls GitHub for new issues and/or pull requests in a repository.
 * Dedup key: bb:ghissue:seen:{automationId} (30-day TTL)
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const QUEUE_NAME = "bb-ghissue-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;

let ghQueue = null;
let ghWorker = null;

async function fetchIssues(owner, repo, token, type = "both", labelFilter) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "BlinkBox/1.0",
    "Accept": "application/vnd.github+json",
  };

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&sort=created&direction=desc&per_page=20`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`GitHub: repo ${owner}/${repo} not found.`);
    if (res.status === 401) throw new Error("GitHub: Invalid token.");
    throw new Error(`GitHub API ${res.status}`);
  }
  const items = await res.json();

  return items
    .filter((item) => {
      if (type === "issues" && item.pull_request) return false;
      if (type === "pulls" && !item.pull_request) return false;
      if (labelFilter) {
        const labels = (item.labels || []).map((l) => l.name.toLowerCase());
        if (!labels.includes(labelFilter.toLowerCase())) return false;
      }
      return true;
    })
    .map((item) => ({
      id: item.id,
      number: item.number,
      title: item.title || "",
      body: item.body || "",
      state: item.state || "",
      url: item.html_url || "",
      author: item.user?.login || "",
      labels: (item.labels || []).map((l) => l.name),
      assignees: (item.assignees || []).map((a) => a.login),
      createdAt: item.created_at || "",
      type: item.pull_request ? "pull_request" : "issue",
    }));
}

export async function pollRepo(automationId, triggerNodeId, credentialId, workspaceId, owner, repo, type, labelFilter) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:ghissue:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const token = await getOAuthToken(credentialId, workspaceId, "GitHub Issue Trigger");
    const items = await fetchIssues(owner, repo, token, type, labelFilter);
    if (!items.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:ghissue:seen:${scope}`;
    for (const item of items) {
      const key = `${item.type}-${item.number}`;
      const added = await redis.sadd(seenKey, key);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, item, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `ghissue:${scope}:${item.type}-${item.number}` });
      } catch (err) {
        console.error(`[GHIssuePoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[GHIssuePoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startGitHubIssuePoller() {
  console.log("[GHIssuePoller] Starting...");
  ghQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  ghWorker = new Worker(QUEUE_NAME, async (job) => {
    const { automationId, triggerNodeId, credentialId, workspaceId, owner, repo, type, labelFilter } = job.data;
    await pollRepo(automationId, triggerNodeId, credentialId, workspaceId, owner, repo, type, labelFilter);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  ghWorker.on("failed", (job, err) => console.error(`[GHIssuePoller] Job failed:`, err.message));
  await syncGitHubIssueJobs();
  console.log("[GHIssuePoller] Ready");
}

export async function syncGitHubIssueJobs() {
  if (!ghQueue) return;
  const existing = await ghQueue.getRepeatableJobs();
  for (const job of existing) await ghQueue.removeRepeatableByKey(job.key);

  const automations = await Automation.find({ trigger: "github_issue_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.owner || !cfg.repo) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await ghQueue.add("ghissue-poll", {
      automationId: automation._id.toString(),
      credentialId: cfg.credentialId,
      workspaceId: automation.workspaceId.toString(),
      owner: cfg.owner,
      repo: cfg.repo,
      type: cfg.type || "both",
      labelFilter: cfg.labelFilter || "",
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `ghissue-${automation._id}` });
  }
  console.log(`[GHIssuePoller] Synced ${automations.length} automations`);
}

export async function stopGitHubIssuePoller() {
  if (ghWorker) await ghWorker.close();
  if (ghQueue) await ghQueue.close();
  ghWorker = null; ghQueue = null;
}
