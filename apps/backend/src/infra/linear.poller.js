import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

// Each view is a real, distinct Linear event: its own server-side filter,
// ordering, and dedup mode. `dedupOn:'updated'` re-fires when an issue changes.
const LINEAR_VIEWS = {
  issue_created:   { filter: "", order: "createdAt", dedupOn: "id" },
  issue_updated:   { filter: "", order: "updatedAt", dedupOn: "updated" },
  issue_started:   { filter: 'state: { type: { eq: "started" } }', order: "updatedAt", dedupOn: "updated" },
  issue_completed: { filter: 'state: { type: { eq: "completed" } }', order: "updatedAt", dedupOn: "updated" },
  issue_canceled:  { filter: 'state: { type: { eq: "canceled" } }', order: "updatedAt", dedupOn: "updated" },
  high_priority:   { filter: 'priority: { lte: 2 }, state: { type: { neq: "completed" } }', order: "createdAt", dedupOn: "id" },
  urgent:          { filter: "priority: { eq: 1 }", order: "createdAt", dedupOn: "id" },
  unassigned:      { filter: 'assignee: { null: true }, state: { type: { in: ["backlog", "unstarted", "started"] } }', order: "createdAt", dedupOn: "id" },
  no_estimate:     { filter: 'estimate: { null: true }, state: { type: { neq: "completed" } }', order: "createdAt", dedupOn: "id" },
  blocked:         { filter: 'labels: { name: { eq: "Blocked" } }', order: "updatedAt", dedupOn: "updated" },
};

async function fetchLinearIssues(apiKey, teamId, assigneeId, labelFilter, statusFilter, view = "issue_created") {
  const v = LINEAR_VIEWS[view] || LINEAR_VIEWS.issue_created;
  const teamFilter = teamId ? `team: { id: { eq: "${teamId}" } }` : "";
  const assigneeFilter = assigneeId ? `assignee: { id: { eq: "${assigneeId}" } }` : "";
  const labelFilter_ = labelFilter ? `labels: { name: { eq: "${labelFilter}" } }` : "";
  const statusFilter_ = statusFilter ? `state: { name: { eq: "${statusFilter}" } }` : "";
  const filter = [v.filter, teamFilter, assigneeFilter, labelFilter_, statusFilter_].filter(Boolean).join(", ");

  const query = `query {
    issues(first: 25, filter: { ${filter} }, orderBy: ${v.order}) {
      nodes {
        id title description url
        state { name type }
        priority priorityLabel
        createdAt updatedAt
        assignee { name email }
        team { name key }
        labels { nodes { name color } }
        project { name }
        creator { name email }
      }
    }
  }`;

  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Linear API ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`Linear: ${data.errors[0]?.message}`);
  return data.data?.issues?.nodes || [];
}

export async function pollLinear(automationId, cfg) {
  const lockKey = `bb:linear:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { apiKey, teamId, assigneeId, labelFilter, statusFilter, view = "issue_created" } = cfg;
    if (!apiKey) return;

    const issues = await fetchLinearIssues(apiKey, teamId, assigneeId, labelFilter, statusFilter, view);
    if (!issues.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const dedupOn = (LINEAR_VIEWS[view] || LINEAR_VIEWS.issue_created).dedupOn;
    const seenKey = `bb:linear:seen:${automationId}:${view}`;
    for (const issue of issues) {
      const dedupId = dedupOn === "updated" ? `${issue.id}:${issue.updatedAt}` : issue.id;
      const added = await redis.sadd(seenKey, dedupId);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, {
          id: issue.id, title: issue.title, description: issue.description,
          url: issue.url, status: issue.state?.name, statusType: issue.state?.type,
          priority: issue.priority, priorityLabel: issue.priorityLabel,
          assignee: issue.assignee?.name, assigneeEmail: issue.assignee?.email,
          team: issue.team?.name, teamKey: issue.team?.key,
          labels: (issue.labels?.nodes || []).map(l => l.name),
          project: issue.project?.name, creator: issue.creator?.name,
          createdAt: issue.createdAt, updatedAt: issue.updatedAt,
        }, { workspaceId: automation.workspaceId, idempotencyKey: `linear:${automation._id}:${view}:${dedupId}` });
      } catch (err) {
        console.error(`[LinearPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[LinearPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
