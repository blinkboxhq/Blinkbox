import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const API = "https://api.netlify.com/api/v1";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull a site's most-recent deploys and normalize the fields the event
// predicates compare. Netlify auth is a Bearer PAT. Timestamps are ISO strings.
async function fetchDeploys(token, siteId) {
  const res = await fetch(`${API}/sites/${encodeURIComponent(siteId)}/deploys?per_page=50`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Netlify API ${res.status}`);
  const data = await res.json();
  return (data || []).map((d) => ({
    id: String(d.id || ""),
    state: d.state || "",
    context: d.context || "",
    branch: d.branch || "",
    url: d.deploy_ssl_url || d.url || "",
    title: d.title || "",
    commitRef: d.commit_ref || "",
    deployTime: d.deploy_time ?? null,
    errorMessage: d.error_message || "",
    createdAt: d.created_at || "",
    updatedAt: d.updated_at || "",
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();

// Each event is a predicate over the current deploy (`d`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire on each transition; `needsPrev` events stay quiet until
// a baseline snapshot exists.
const NETLIFY_EVENTS = {
  deploy_started:   { needsPrev: false, dedup: (d) => `${d.id}`, match: (d, p) => !p },
  deploy_succeeded: { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:ready`, match: (d, p) => d.state === "ready" && (!p || p.state !== "ready") },
  deploy_failed:    { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:error`, match: (d, p) => d.state === "error" && (!p || p.state !== "error") },
  deploy_building:  { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:building`, match: (d, p) => d.state === "building" && (!p || p.state !== "building") },
  deploy_enqueued:  { needsPrev: false, dedup: (d) => `${d.id}:enqueued`, match: (d) => d.state === "enqueued" || d.state === "new" },
  deploy_canceled:  { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:canceled`, match: (d, p) => d.state === "canceled" && (!p || p.state !== "canceled") },
  state_changed:    { needsPrev: true,  changeAware: true, dedup: (d) => `${d.id}:${d.state}`, match: (d, p) => d.state !== p.state },
  state_is:         { needsPrev: false, changeAware: true, dedup: (d) => `${d.id}:${d.state}`, match: (d, _p, c) => lc(d.state) === lc(c.targetValue) },
  on_branch:        { needsPrev: false, dedup: (d) => `${d.id}`, match: (d, _p, c) => lc(d.branch) === lc(c.targetValue) },
  production_deploy:{ needsPrev: false, dedup: (d) => `${d.id}:prod`, match: (d) => lc(d.context) === "production" },
  preview_deploy:   { needsPrev: false, dedup: (d) => `${d.id}:preview`, match: (d) => lc(d.context) === "deploy-preview" },
  slow_deploy:      { needsPrev: false, dedup: (d) => `${d.id}:slow`, match: (d, _p, c) => d.deployTime != null && Number(d.deployTime) >= Number(c.targetValue || 0) },
};

export async function pollNetlify(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:netlify:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, siteId } = cfg;
    if (!credentialId || !siteId) return;
    const eventType = cfg.eventType || cfg.watchType || "deploy_started";
    const spec = NETLIFY_EVENTS[eventType] || NETLIFY_EVENTS.deploy_started;

    const token = await getOAuthToken(credentialId, workspaceId, "Netlify Trigger");
    const deploys = await fetchDeploys(token, siteId);
    if (!deploys.length) return;

    const snapKey = `bb:netlify:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const d of deploys) nextSnap[d.id] = { state: d.state, updatedAt: d.updatedAt };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "deploy_started")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:netlify:seen:${scope}:${eventType}`;
    for (const d of deploys) {
      const prev = prevSnap[d.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(d, prev, cfg)) continue;

      const dedup = spec.dedup(d);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          deployId: d.id, state: d.state, context: d.context, branch: d.branch,
          url: d.url, title: d.title, commitRef: d.commitRef, deployTime: d.deployTime,
          errorMessage: d.errorMessage, createdAt: d.createdAt, updatedAt: d.updatedAt, siteId,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `netlify:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[NetlifyPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[NetlifyPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
