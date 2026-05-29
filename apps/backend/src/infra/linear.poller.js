import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

async function fetchLinearIssues(apiKey, teamId, assigneeId, labelFilter, statusFilter) {
  const teamFilter = teamId ? `team: { id: { eq: "${teamId}" } }` : "";
  const assigneeFilter = assigneeId ? `assignee: { id: { eq: "${assigneeId}" } }` : "";
  const labelFilter_ = labelFilter ? `labels: { name: { eq: "${labelFilter}" } }` : "";
  const statusFilter_ = statusFilter ? `state: { name: { eq: "${statusFilter}" } }` : "";
  const filter = [teamFilter, assigneeFilter, labelFilter_, statusFilter_].filter(Boolean).join(", ");

  const query = `query {
    issues(first: 25, filter: { ${filter} }, orderBy: createdAt) {
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
    const { apiKey, teamId, assigneeId, labelFilter, statusFilter } = cfg;
    if (!apiKey) return;

    const issues = await fetchLinearIssues(apiKey, teamId, assigneeId, labelFilter, statusFilter);
    if (!issues.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:linear:seen:${automationId}`;
    for (const issue of issues) {
      const added = await redis.sadd(seenKey, issue.id);
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
        }, { workspaceId: automation.workspaceId, idempotencyKey: `linear:${automation._id}:${issue.id}` });
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
