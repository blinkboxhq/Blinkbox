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
const SNAP_TTL = 30 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();

let ghQueue = null;
let ghWorker = null;

// Fetch open + recently-updated issues/PRs so state transitions (closed,
// reopened) and comment/reaction growth are visible to the diff. `state=all` +
// `sort=updated` surfaces items that changed since the last poll.
async function fetchIssues(owner, repo, token, type = "both", labelFilter) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "BlinkBox/1.0",
    "Accept": "application/vnd.github+json",
  };

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=all&sort=updated&direction=desc&per_page=30`;
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
      milestone: item.milestone?.title || "",
      comments: item.comments || 0,
      reactions: item.reactions?.total_count || 0,
      createdAt: item.created_at || "",
      type: item.pull_request ? "pull_request" : "issue",
    }));
}

// Each event is a predicate over the current item (`i`), its previous snapshot
// (`prev`, may be null) and config (`c`). Comments/reactions/labels/state mutate,
// so `changeAware` events dedup on a changing token; `needsPrev` events stay quiet
// until a baseline snapshot exists.
const GH_ISSUE_EVENTS = {
  new_issue:      { needsPrev: false, dedup: (i) => `${i.number}`, match: (i) => i.type === "issue" },
  new_pr:         { needsPrev: false, dedup: (i) => `${i.number}`, match: (i) => i.type === "pull_request" },
  title_contains: { needsPrev: false, dedup: (i) => `${i.number}`, match: (i, _p, c) => lc(i.title).includes(lc(c.targetValue)) },
  by_author:      { needsPrev: false, dedup: (i) => `${i.number}`, match: (i, _p, c) => lc(i.author) === lc(c.targetValue).replace(/^@/, "") },
  has_label:      { needsPrev: false, dedup: (i) => `${i.number}:${lc(i.labels.join(","))}`, match: (i, _p, c) => i.labels.map(lc).includes(lc(c.targetValue)) },
  is_assigned:    { needsPrev: false, changeAware: true, dedup: (i) => `${i.number}:a${i.assignees.length}`, match: (i) => i.assignees.length > 0 },
  milestone_set:  { needsPrev: false, dedup: (i) => `${i.number}:m${lc(i.milestone)}`, match: (i) => !!i.milestone },
  closed:         { needsPrev: true,  dedup: (i) => `${i.number}:closed`, match: (i, prev) => i.state === "closed" && prev.state === "open" },
  reopened:       { needsPrev: true,  dedup: (i) => `${i.number}:reopen`, match: (i, prev) => i.state === "open" && prev.state === "closed" },
  new_comment:    { needsPrev: true,  changeAware: true, dedup: (i) => `${i.number}:c${i.comments}`, match: (i, prev) => Number(i.comments) > Number(prev.comments || 0) },
  comments_over:  { needsPrev: false, changeAware: true, dedup: (i) => `${i.number}:c${i.comments}`, match: (i, _p, c) => Number(i.comments) >= Number(c.targetValue || 0) },
  reactions_over: { needsPrev: false, changeAware: true, dedup: (i) => `${i.number}:r${i.reactions}`, match: (i, _p, c) => Number(i.reactions) >= Number(c.targetValue || 0) },
};

export async function pollRepo(automationId, triggerNodeId, credentialId, workspaceId, owner, repo, type, labelFilter, eventType, targetValue) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:ghissue:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const evType = eventType || "new_issue";
    const spec = GH_ISSUE_EVENTS[evType] || GH_ISSUE_EVENTS.new_issue;
    const token = await getOAuthToken(credentialId, workspaceId, "GitHub Issue Trigger");
    const items = await fetchIssues(owner, repo, token, type, labelFilter);
    if (!items.length) return;

    const snapKey = `bb:ghissue:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;
    const nextSnap = {};
    for (const i of items) nextSnap[i.number] = { state: i.state, comments: i.comments, reactions: i.reactions };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    // Only "new_issue"/"new_pr" need to skip the first sync — every item in that
    // initial pull would otherwise look "new". Content predicates (title_contains,
    // has_label, milestone_set, etc.) describe the item itself, not its novelty, so
    // they fire on first sync too.
    if (firstSync && (spec.needsPrev || evType === "new_issue" || evType === "new_pr")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const cfg = { targetValue };
    const seenKey = `bb:ghissue:seen:${scope}:${evType}`;
    for (const item of items) {
      const prev = prevSnap[item.number] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(item, prev, cfg)) continue;

      const added = await redis.sadd(seenKey, spec.dedup(item));
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, item, { workspaceId: automation.workspaceId, entryNodeId: triggerNodeId || automation.entryNodeId, idempotencyKey: `ghissue:${scope}:${evType}:${spec.dedup(item)}` });
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
    const { automationId, triggerNodeId, credentialId, workspaceId, owner, repo, type, labelFilter, eventType, targetValue } = job.data;
    await pollRepo(automationId, triggerNodeId, credentialId, workspaceId, owner, repo, type, labelFilter, eventType, targetValue);
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
      triggerNodeId: automation.entryNodeId,
      credentialId: cfg.credentialId,
      workspaceId: automation.workspaceId.toString(),
      owner: cfg.owner,
      repo: cfg.repo,
      type: cfg.type || "both",
      labelFilter: cfg.labelFilter || "",
      eventType: cfg.eventType || cfg.watchType,
      targetValue: cfg.targetValue || "",
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `ghissue-${automation._id}` });
  }
  console.log(`[GHIssuePoller] Synced ${automations.length} automations`);
}

export async function stopGitHubIssuePoller() {
  if (ghWorker) await ghWorker.close();
  if (ghQueue) await ghQueue.close();
  ghWorker = null; ghQueue = null;
}
