/**
 * Jira Poller
 * Polls Jira REST API for new issues matching a JQL filter.
 * Dedup key: bb:jira:seen:{automationId} — issue key set, 30-day TTL.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const QUEUE_NAME = "bb-jira-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let jiraQueue = null;
let jiraWorker = null;

async function fetchIssues(domain, email, token, jql) {
  const url = `https://${domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=25&fields=summary,status,priority,assignee,reporter,created,updated,labels,issuetype,description`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Jira API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.issues || [];
}

async function pollJira(automationId, cfg) {
  const lockKey = `bb:jira:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { domain, email, token, jql = "created >= -15m ORDER BY created DESC" } = cfg;
    if (!domain || !email || !token) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const issues = await fetchIssues(domain, email, token, jql);
    const seenKey = `bb:jira:seen:${automationId}`;
    for (const issue of issues) {
      const added = await redis.sadd(seenKey, issue.key);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const f = issue.fields;
      const payload = {
        key: issue.key,
        summary: f.summary || "",
        status: f.status?.name || "",
        priority: f.priority?.name || "",
        issueType: f.issuetype?.name || "",
        assignee: f.assignee?.displayName || "",
        reporter: f.reporter?.displayName || "",
        labels: f.labels || [],
        created: f.created,
        updated: f.updated,
        url: `https://${domain}/browse/${issue.key}`,
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        idempotencyKey: `jira:${automationId}:${issue.key}`,
      });
    }
  } catch (err) {
    console.warn(`[JiraPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startJiraPoller() {
  console.log("[JiraPoller] Starting...");
  jiraQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  jiraWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollJira(job.data.automationId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  jiraWorker.on("failed", (job, err) => console.error(`[JiraPoller] Job failed:`, err.message));
  await syncJiraJobs();
  console.log("[JiraPoller] Ready");
}

export async function syncJiraJobs() {
  if (!jiraQueue) return;
  const existing = await jiraQueue.getRepeatableJobs();
  for (const job of existing) await jiraQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "jira_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.domain || !cfg.token) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await jiraQueue.add("jira-poll", {
      automationId: automation._id.toString(),
      cfg: { domain: cfg.domain, email: cfg.email, token: cfg.token, jql: cfg.jql },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `jira-${automation._id}` });
  }
  console.log(`[JiraPoller] Synced ${automations.length} automations`);
}

export async function stopJiraPoller() {
  if (jiraWorker) await jiraWorker.close();
  if (jiraQueue) await jiraQueue.close();
  jiraWorker = null; jiraQueue = null;
}
