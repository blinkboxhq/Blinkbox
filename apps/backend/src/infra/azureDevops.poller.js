/**
 * Azure DevOps Poller
 * Polls the Azure DevOps REST API with a Personal Access Token (PAT).
 * Azure DevOps webhooks ("service hooks") require org-admin setup per event,
 * so a PAT poller is the portable path. Each event is a distinct real query:
 * work items (WIQL), builds, releases, pull requests and pushes/commits.
 *
 * Auth: HTTP Basic with an empty username and the PAT as the password.
 * `eventType` (via configExtra) selects which resource is polled.
 */
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 14 * 24 * 60 * 60;
const API_VERSION = "7.1";
const lc = (s) => String(s ?? "").toLowerCase();

function authHeader(pat) {
  return "Basic " + Buffer.from(":" + pat).toString("base64");
}

async function adoGet(url, pat) {
  const res = await fetch(url, { headers: { Authorization: authHeader(pat), Accept: "application/json" } });
  if (res.status === 401 || res.status === 403) throw new Error(`Azure DevOps auth failed (${res.status}) — check the PAT scopes`);
  if (!res.ok) throw new Error(`Azure DevOps API ${res.status}`);
  return res.json();
}

async function adoPost(url, pat, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader(pat), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Azure DevOps API ${res.status}`);
  return res.json();
}

function base(cfg) {
  const org = encodeURIComponent(cfg.organization);
  const project = encodeURIComponent(cfg.project);
  return { org, project, root: `https://dev.azure.com/${org}/${project}/_apis` };
}

// WIQL fragment per work-item event. `[bb_filter]` is replaced with an optional
// AND clause so type/assignee/state filters are honoured.
const WIQL = {
  workitem_created: "[System.CreatedDate] > @StartOfDay('-1d')",
  workitem_updated: "[System.ChangedDate] > @StartOfDay('-1d') AND [System.ChangedDate] <> [System.CreatedDate]",
  workitem_assigned: "[System.AssignedTo] = @Me AND [System.ChangedDate] > @StartOfDay('-1d')",
  workitem_state_changed: "[System.ChangedDate] > @StartOfDay('-1d') AND [System.State] <> ''",
  workitem_closed: "[System.State] In ('Closed','Done','Resolved','Completed') AND [System.ChangedDate] > @StartOfDay('-1d')",
  bug_created: "[System.WorkItemType] = 'Bug' AND [System.CreatedDate] > @StartOfDay('-1d')",
};

function workItemDedup(eventType, wi) {
  const fields = wi.fields || {};
  // updates/state changes must re-fire when the item changes, so include the
  // change timestamp; creations dedup on id alone.
  if (eventType === "workitem_created" || eventType === "bug_created") return `wi:${wi.id}`;
  return `wi:${wi.id}:${fields["System.ChangedDate"] || ""}`;
}

function workItemShape(wi) {
  const f = wi.fields || {};
  return {
    id: wi.id,
    type: "workitem",
    workItemType: f["System.WorkItemType"],
    title: f["System.Title"],
    state: f["System.State"],
    assignedTo: f["System.AssignedTo"]?.displayName || f["System.AssignedTo"],
    createdBy: f["System.CreatedBy"]?.displayName,
    changedDate: f["System.ChangedDate"],
    url: wi._links?.html?.href || wi.url,
  };
}

async function pollWorkItems(eventType, cfg, pat, scope, emit) {
  const { root } = base(cfg);
  let clause = WIQL[eventType];
  if (cfg.targetValue && (eventType === "workitem_state_changed" || eventType === "workitem_closed")) {
    clause += ` AND [System.State] = '${String(cfg.targetValue).replace(/'/g, "")}'`;
  }
  const query = `SELECT [System.Id] FROM WorkItems WHERE ${clause} ORDER BY [System.ChangedDate] DESC`;
  const result = await adoPost(`${root}/wit/wiql?api-version=${API_VERSION}`, pat, { query });
  const ids = (result.workItems || []).slice(0, 50).map((w) => w.id);
  if (!ids.length) return;
  const detail = await adoGet(`${root}/wit/workitems?ids=${ids.join(",")}&api-version=${API_VERSION}`, pat);
  const seenKey = `bb:ado:seen:${scope}:${eventType}`;
  for (const wi of (detail.value || []).reverse()) {
    const dedup = workItemDedup(eventType, wi);
    const added = await redis.sadd(seenKey, dedup);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await emit(workItemShape(wi), dedup);
  }
}

async function pollBuilds(eventType, cfg, pat, scope, emit) {
  const { root } = base(cfg);
  const statusFilter = eventType === "build_completed" ? "&statusFilter=completed" : "";
  const data = await adoGet(`${root}/build/builds?api-version=${API_VERSION}&$top=25${statusFilter}`, pat);
  const seenKey = `bb:ado:seen:${scope}:${eventType}`;
  for (const b of (data.value || []).reverse()) {
    if (eventType === "build_failed" && lc(b.result) !== "failed") continue;
    if (eventType === "build_completed" && !b.result) continue;
    const dedup = `build:${b.id}:${b.status}:${b.result || ""}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await emit({
      id: b.id, type: "build", buildNumber: b.buildNumber, status: b.status, result: b.result,
      definition: b.definition?.name, branch: b.sourceBranch, requestedBy: b.requestedBy?.displayName,
      url: b._links?.web?.href, finishTime: b.finishTime,
    }, dedup);
  }
}

async function pollPullRequests(eventType, cfg, pat, scope, emit) {
  const { root } = base(cfg);
  const status = eventType === "pr_merged" ? "completed" : "active";
  const data = await adoGet(`${root}/git/pullrequests?api-version=${API_VERSION}&searchCriteria.status=${status}&$top=25`, pat);
  const seenKey = `bb:ado:seen:${scope}:${eventType}`;
  for (const pr of (data.value || []).reverse()) {
    const added = await redis.sadd(seenKey, `pr:${pr.pullRequestId}`);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await emit({
      id: pr.pullRequestId, type: "pull_request", title: pr.title, status: pr.status,
      sourceBranch: pr.sourceRefName, targetBranch: pr.targetRefName,
      createdBy: pr.createdBy?.displayName, repository: pr.repository?.name,
      url: pr._links?.web?.href, creationDate: pr.creationDate, closedDate: pr.closedDate,
    }, `pr:${pr.pullRequestId}`);
  }
}

async function pollReleases(cfg, pat, scope, emit) {
  const org = encodeURIComponent(cfg.organization);
  const project = encodeURIComponent(cfg.project);
  // The release management API lives on a separate host (vsrm.dev.azure.com).
  const url = `https://vsrm.dev.azure.com/${org}/${project}/_apis/release/deployments?api-version=${API_VERSION}&$top=25`;
  const data = await adoGet(url, pat);
  const seenKey = `bb:ado:seen:${scope}:release_deployed`;
  for (const d of (data.value || []).reverse()) {
    if (lc(d.deploymentStatus) !== "succeeded") continue;
    const dedup = `dep:${d.id}`;
    const added = await redis.sadd(seenKey, dedup);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await emit({
      id: d.id, type: "deployment", releaseName: d.release?.name,
      definition: d.releaseDefinition?.name, environment: d.releaseEnvironment?.name,
      status: d.deploymentStatus, requestedBy: d.requestedBy?.displayName,
      completedOn: d.completedOn,
    }, dedup);
  }
}

async function pollPushes(cfg, pat, scope, emit) {
  const { root } = base(cfg);
  const repos = await adoGet(`${root}/git/repositories?api-version=${API_VERSION}`, pat);
  const seenKey = `bb:ado:seen:${scope}:code_pushed`;
  for (const repo of (repos.value || []).slice(0, 10)) {
    const pushes = await adoGet(`${root}/git/repositories/${repo.id}/pushes?api-version=${API_VERSION}&$top=10`, pat).catch(() => ({ value: [] }));
    for (const p of (pushes.value || []).reverse()) {
      const added = await redis.sadd(seenKey, `push:${repo.id}:${p.pushId}`);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      await emit({
        id: p.pushId, type: "push", repository: repo.name,
        pushedBy: p.pushedBy?.displayName, date: p.date,
        branch: p.refUpdates?.[0]?.name,
      }, `push:${repo.id}:${p.pushId}`);
    }
  }
}

const EVENT_KIND = {
  workitem_created: "wi", workitem_updated: "wi", workitem_assigned: "wi",
  workitem_state_changed: "wi", workitem_closed: "wi", bug_created: "wi",
  build_completed: "build", build_failed: "build",
  pr_created: "pr", pr_merged: "pr", code_pushed: "push", release_deployed: "release",
};

export async function pollAzureDevops(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:ado:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 90);
  if (!locked) return;

  try {
    const { organization, project } = cfg;
    if (!organization || !project || !cfg.pat) return;
    // `pat` is a credential id; resolve it to the real token. Falls back to a
    // raw PAT if a literal value was stored.
    let pat = cfg.pat;
    if (cfg.workspaceId) {
      try {
        pat = await getOAuthToken(cfg.pat, cfg.workspaceId, "Azure DevOps trigger");
      } catch {
        /* not a credential id — treat cfg.pat as the literal token */
      }
    }
    const eventType = cfg.eventType || cfg.watchType || "workitem_created";
    const kind = EVENT_KIND[eventType] || "wi";

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const emit = async (payload, dedup) => {
      try {
        await executeAutomation(automation, { ...payload, organization, project, eventType }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `ado:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[AzureDevopsPoller] Failed for "${automation.name}":`, err.message);
      }
    };

    if (kind === "wi") await pollWorkItems(eventType, cfg, pat, scope, emit);
    else if (kind === "build") await pollBuilds(eventType, cfg, pat, scope, emit);
    else if (kind === "pr") await pollPullRequests(eventType, cfg, pat, scope, emit);
    else if (kind === "push") await pollPushes(cfg, pat, scope, emit);
    else if (kind === "release") await pollReleases(cfg, pat, scope, emit);
  } catch (err) {
    console.warn(`[AzureDevopsPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
