import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const API = "https://api.vercel.com";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull the most-recent deployments and normalize the fields the event predicates
// compare. Vercel auth is a Bearer token. readyState is the live state (QUEUED,
// BUILDING, READY, ERROR, CANCELED); createdAt is an epoch-ms number.
async function fetchDeployments(token, projectId, teamId) {
  const params = new URLSearchParams({ limit: "50" });
  if (projectId) params.set("projectId", projectId);
  if (teamId) params.set("teamId", teamId);
  const res = await fetch(`${API}/v6/deployments?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Vercel API ${res.status}`);
  const data = await res.json();
  return (data.deployments || []).map((d) => ({
    id: String(d.uid || d.id || ""),
    name: d.name || "",
    state: d.readyState || d.state || "",
    target: d.target || "",
    branch: d.meta?.githubCommitRef || d.meta?.gitlabCommitRef || d.meta?.bitbucketCommitRef || "",
    commitMessage: d.meta?.githubCommitMessage || d.meta?.gitlabCommitMessage || "",
    creator: d.creator?.username || d.creator?.email || "",
    url: d.url ? `https://${d.url}` : "",
    inspectorUrl: d.inspectorUrl || "",
    createdAt: d.createdAt ?? null,
    buildingAt: d.buildingAt ?? null,
    ready: d.ready ?? null,
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();
const buildSeconds = (d) => (d.ready != null && d.buildingAt != null ? (Number(d.ready) - Number(d.buildingAt)) / 1000 : null);

// Each event is a predicate over the current deployment (`d`), its previous
// snapshot (`p`, may be null), and config (`c`). `changeAware` events dedup on a
// changing token so they re-fire on each transition; `needsPrev` events stay
// quiet until a baseline snapshot exists. Vercel readyState values are uppercase.
const VERCEL_EVENTS = {
  deployment_created: { needsPrev: false, dedup: (d) => `${d.id}`, match: (d, p) => !p },
  deploy_ready:       { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:ready`, match: (d, p) => lc(d.state) === "ready" && (!p || lc(p.state) !== "ready") },
  deploy_error:       { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:error`, match: (d, p) => lc(d.state) === "error" && (!p || lc(p.state) !== "error") },
  deploy_building:    { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:building`, match: (d, p) => lc(d.state) === "building" && (!p || lc(p.state) !== "building") },
  deploy_queued:      { needsPrev: false, dedup: (d) => `${d.id}:queued`, match: (d) => lc(d.state) === "queued" || lc(d.state) === "initializing" },
  deploy_canceled:    { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:canceled`, match: (d, p) => lc(d.state) === "canceled" && (!p || lc(p.state) !== "canceled") },
  state_changed:      { needsPrev: true,  changeAware: true, dedup: (d) => `${d.id}:${d.state}`, match: (d, p) => d.state !== p.state },
  state_is:           { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:${d.state}`, match: (d, _p, c) => lc(d.state) === lc(c.targetValue) },
  on_branch:          { needsPrev: false, dedup: (d) => `${d.id}`, match: (d, _p, c) => lc(d.branch) === lc(c.targetValue) },
  production_deploy:  { needsPrev: false, dedup: (d) => `${d.id}:prod`, match: (d) => lc(d.target) === "production" },
  preview_deploy:     { needsPrev: false, dedup: (d) => `${d.id}:preview`, match: (d) => lc(d.target) === "preview" || (!d.target && lc(d.state) !== "") },
  slow_deploy:        { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:slow`, match: (d, _p, c) => { const s = buildSeconds(d); return s != null && s >= Number(c.targetValue || 0); } },
};

export async function pollVercel(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:vercel:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, projectId, teamId } = cfg;
    if (!credentialId) return;
    const eventType = cfg.eventType || cfg.watchType || "deployment_created";
    const spec = VERCEL_EVENTS[eventType] || VERCEL_EVENTS.deployment_created;

    const token = await getOAuthToken(credentialId, workspaceId, "Vercel Trigger");
    const deployments = await fetchDeployments(token, projectId, teamId);
    if (!deployments.length) return;

    const snapKey = `bb:vercel:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const d of deployments) nextSnap[d.id] = { state: d.state };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "deployment_created")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:vercel:seen:${scope}:${eventType}`;
    for (const d of deployments) {
      const prev = prevSnap[d.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(d, prev, cfg)) continue;

      const dedup = spec.dedup(d);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          deploymentId: d.id, name: d.name, state: d.state, target: d.target,
          branch: d.branch, commitMessage: d.commitMessage, creator: d.creator,
          url: d.url, inspectorUrl: d.inspectorUrl, buildSeconds: buildSeconds(d),
          createdAt: d.createdAt, projectId: projectId || "",
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `vercel:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[VercelPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[VercelPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
