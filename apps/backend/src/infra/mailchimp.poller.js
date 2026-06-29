import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Mailchimp API keys are "key-dcXX"; the datacenter suffix selects the host and
// auth is HTTP Basic anystring:apikey (not Bearer).
function buildClient(apiKey) {
  const dc = String(apiKey).split("-").pop();
  if (!dc || dc === apiKey) throw new Error("Mailchimp: API key format invalid — expected 'key-dcXX'.");
  return {
    base: `https://${dc}.api.mailchimp.com/3.0`,
    auth: "Basic " + Buffer.from(`anystring:${apiKey}`).toString("base64"),
  };
}

// Pull a list's most-recently-changed members and normalize the fields the
// event predicates compare. last_changed is an ISO string.
async function fetchMembers(client, listId) {
  const params = new URLSearchParams({ count: "50", sort_field: "last_changed", sort_dir: "DESC" });
  const res = await fetch(`${client.base}/lists/${encodeURIComponent(listId)}/members?${params}`, {
    headers: { Authorization: client.auth, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Mailchimp API ${res.status}`);
  const data = await res.json();
  return (data.members || []).map((m) => ({
    id: String(m.id || m.email_address || ""),
    email: m.email_address || "",
    status: m.status || "",
    rating: m.member_rating ?? 0,
    openRate: m.stats?.avg_open_rate ?? 0,
    vip: !!m.vip,
    tags: (m.tags || []).map((t) => t.name).filter(Boolean),
    source: m.source || "",
    country: m.location?.country_code || "",
    firstName: m.merge_fields?.FNAME || "",
    lastName: m.merge_fields?.LNAME || "",
    signupAt: m.timestamp_signup || "",
    lastChanged: m.last_changed || "",
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();

// Each event is a predicate over the current member (`m`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire on each transition; `needsPrev` events stay quiet until
// a baseline snapshot exists.
const MAILCHIMP_EVENTS = {
  member_subscribed:   { needsPrev: false, changeAware: true, dedup: (m) => `${m.id}:subscribed`, match: (m, p) => m.status === "subscribed" && (!p || p.status !== "subscribed") },
  member_unsubscribed: { needsPrev: false, changeAware: true, dedup: (m) => `${m.id}:unsubscribed`, match: (m, p) => m.status === "unsubscribed" && (!p || p.status !== "unsubscribed") },
  status_changed:      { needsPrev: true,  changeAware: true, dedup: (m) => `${m.id}:${m.status}`, match: (m, p) => m.status !== p.status },
  cleaned:             { needsPrev: false, changeAware: true, dedup: (m) => `${m.id}:cleaned`, match: (m, p) => m.status === "cleaned" && (!p || p.status !== "cleaned") },
  pending:             { needsPrev: false, dedup: (m) => `${m.id}:pending`, match: (m) => m.status === "pending" },
  vip_added:           { needsPrev: true,  changeAware: true, dedup: (m) => `${m.id}:vip`, match: (m, p) => m.vip && !p.vip },
  tagged:              { needsPrev: false, changeAware: true, dedup: (m) => `${m.id}:${m.lastChanged}`, match: (m, _p, c) => m.tags.map(lc).includes(lc(c.targetValue)) },
  rating_over:         { needsPrev: false, changeAware: true, dedup: (m) => `${m.id}:${m.rating}`, match: (m, _p, c) => Number(m.rating) >= Number(c.targetValue || 0) },
  open_rate_over:      { needsPrev: false, changeAware: true, dedup: (m) => `${m.id}:${Math.round(m.openRate * 100)}`, match: (m, _p, c) => Number(m.openRate) * 100 >= Number(c.targetValue || 0) },
  member_updated:      { needsPrev: true,  changeAware: true, dedup: (m) => `${m.id}:${m.lastChanged}`, match: (m, p) => m.lastChanged && m.lastChanged !== p.lastChanged },
  from_source:         { needsPrev: false, dedup: (m) => `${m.id}:src`, match: (m, _p, c) => lc(m.source).includes(lc(c.targetValue)) },
  in_country:          { needsPrev: false, dedup: (m) => `${m.id}`, match: (m, _p, c) => lc(m.country) === lc(c.targetValue) },
};

export async function pollMailchimp(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:mailchimp:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, listId } = cfg;
    if (!credentialId || !listId) return;
    const eventType = cfg.eventType || cfg.watchType || "member_subscribed";
    const spec = MAILCHIMP_EVENTS[eventType] || MAILCHIMP_EVENTS.member_subscribed;

    const apiKey = await getOAuthToken(credentialId, workspaceId, "Mailchimp Trigger");
    const client = buildClient(apiKey);
    const members = await fetchMembers(client, listId);
    if (!members.length) return;

    const snapKey = `bb:mailchimp:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const m of members) {
      nextSnap[m.id] = { status: m.status, vip: m.vip, lastChanged: m.lastChanged };
    }
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "member_subscribed" || eventType === "member_unsubscribed" || eventType === "cleaned")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:mailchimp:seen:${scope}:${eventType}`;
    for (const m of members) {
      const prev = prevSnap[m.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(m, prev, cfg)) continue;

      const dedup = spec.dedup(m);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          memberId: m.id, email: m.email, status: m.status, rating: m.rating,
          openRate: m.openRate, vip: m.vip, tags: m.tags, source: m.source,
          country: m.country, firstName: m.firstName, lastName: m.lastName,
          signupAt: m.signupAt, lastChanged: m.lastChanged, listId,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `mailchimp:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[MailchimpPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[MailchimpPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
