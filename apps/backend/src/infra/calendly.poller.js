import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const BASE = "https://api.calendly.com";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

async function getUserUri(token) {
  const res = await fetch(`${BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Calendly API ${res.status} (users/me)`);
  const data = await res.json();
  return data.resource?.uri || "";
}

// Pull a user's most-recent scheduled events and normalize the fields the
// event predicates compare. Calendly identifies events by a full URI; we key
// snapshots on the trailing UUID. Timestamps are ISO strings.
async function fetchEvents(token, userUri) {
  const params = new URLSearchParams({
    user: userUri,
    count: "50",
    sort: "start_time:desc",
  });
  const res = await fetch(`${BASE}/scheduled_events?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Calendly API ${res.status}`);
  const data = await res.json();
  return (data.collection || []).map((e) => ({
    id: String(e.uri || "").split("/").pop(),
    uri: e.uri || "",
    name: e.name || "",
    status: e.status || "",
    startTime: e.start_time || "",
    endTime: e.end_time || "",
    eventTypeUri: e.event_type || "",
    locationType: e.location?.type || "",
    locationValue: e.location?.location || e.location?.join_url || "",
    inviteesActive: e.invitees_counter?.active ?? 0,
    inviteesTotal: e.invitees_counter?.total ?? 0,
    inviteesLimit: e.invitees_counter?.limit ?? 0,
    createdAt: e.created_at || "",
    updatedAt: e.updated_at || "",
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();
const minsUntil = (iso) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return (t - Date.now()) / 60000;
};

// Each event is a predicate over the current scheduled event (`e`), its previous
// snapshot (`p`, may be null), and config (`c`). `changeAware` events dedup on a
// changing token so they re-fire on each transition; `needsPrev` events stay
// quiet until a baseline snapshot exists.
const CALENDLY_EVENTS = {
  event_scheduled:  { needsPrev: false, dedup: (e) => `${e.id}`, match: (e, p) => !p },
  event_updated:    { needsPrev: true,  changeAware: true, dedup: (e) => `${e.id}:${e.updatedAt}`, match: (e, p) => e.updatedAt && e.updatedAt !== p.updatedAt },
  rescheduled:      { needsPrev: true,  changeAware: true, dedup: (e) => `${e.id}:${e.startTime}`, match: (e, p) => e.startTime && p.startTime && e.startTime !== p.startTime },
  canceled:         { needsPrev: false, changeAware: true, dedup: (e) => `${e.id}:canceled`, match: (e, p) => e.status === "canceled" && (!p || p.status !== "canceled") },
  starting_soon:    { needsPrev: false, dedup: (e) => `${e.id}:soon`, match: (e) => e.status === "active" && minsUntil(e.startTime) > 0 && minsUntil(e.startTime) <= (15) },
  upcoming:         { needsPrev: false, dedup: (e) => `${e.id}:upcoming`, match: (e) => e.status === "active" && minsUntil(e.startTime) > 0 },
  ended:            { needsPrev: false, dedup: (e) => `${e.id}:ended`, match: (e) => e.status === "active" && minsUntil(e.endTime) < 0 },
  status_is:        { needsPrev: false, changeAware: true, dedup: (e) => `${e.id}:${e.status}`, match: (e, _p, c) => lc(e.status) === lc(c.targetValue) },
  event_type_is:    { needsPrev: false, dedup: (e) => `${e.id}`, match: (e, _p, c) => lc(e.eventTypeUri).includes(lc(c.targetValue)) || lc(e.name) === lc(c.targetValue) },
  location_is:      { needsPrev: false, dedup: (e) => `${e.id}:loc`, match: (e, _p, c) => lc(e.locationType) === lc(c.targetValue) },
  fully_booked:     { needsPrev: false, changeAware: true, dedup: (e) => `${e.id}:${e.inviteesActive}`, match: (e) => e.inviteesLimit > 0 && e.inviteesActive >= e.inviteesLimit },
  name_contains:    { needsPrev: false, dedup: (e) => `${e.id}`, match: (e, _p, c) => lc(e.name).includes(lc(c.targetValue)) },
};

export async function pollCalendly(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:calendly:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId } = cfg;
    if (!credentialId) return;
    const eventType = cfg.eventType || cfg.watchType || "event_scheduled";
    const spec = CALENDLY_EVENTS[eventType] || CALENDLY_EVENTS.event_scheduled;

    const token = await getOAuthToken(credentialId, workspaceId, "Calendly Trigger");
    const userUri = await getUserUri(token);
    if (!userUri) return;
    const events = await fetchEvents(token, userUri);
    if (!events.length) return;

    const snapKey = `bb:calendly:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const e of events) {
      nextSnap[e.id] = {
        status: e.status, startTime: e.startTime,
        inviteesActive: e.inviteesActive, updatedAt: e.updatedAt,
      };
    }
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    if (firstSync && (spec.needsPrev || eventType === "event_scheduled")) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:calendly:seen:${scope}:${eventType}`;
    for (const e of events) {
      const prev = prevSnap[e.id] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(e, prev, cfg)) continue;

      const dedup = spec.dedup(e);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          eventId: e.id, eventUri: e.uri, name: e.name, status: e.status,
          startTime: e.startTime, endTime: e.endTime, locationType: e.locationType,
          location: e.locationValue, inviteesActive: e.inviteesActive,
          inviteesLimit: e.inviteesLimit, eventTypeUri: e.eventTypeUri,
          createdAt: e.createdAt, updatedAt: e.updatedAt,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `calendly:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[CalendlyPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[CalendlyPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
