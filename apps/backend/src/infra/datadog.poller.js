import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const SEEN_TTL = 7 * 24 * 60 * 60;

async function fetchDatadogEvents(apiKey, appKey, tags, priority, windowMinutes) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - (windowMinutes || 15) * 60;

  const params = new URLSearchParams({ start: String(start), end: String(now) });
  if (tags) params.set("tags", tags);
  if (priority) params.set("priority", priority);

  const res = await fetch(`https://api.datadoghq.com/api/v1/events?${params}`, {
    headers: { "DD-API-KEY": apiKey, "DD-APPLICATION-KEY": appKey },
  });
  if (!res.ok) throw new Error(`Datadog API ${res.status}`);
  const data = await res.json();
  return (data.events || []).map(e => ({
    id: String(e.id), title: e.title, text: e.text,
    alertType: e.alert_type, priority: e.priority,
    date_happened: new Date(e.date_happened * 1000).toISOString(),
    tags: e.tags || [], url: e.url, host: e.host,
    source: e.source_type_name,
  }));
}

const hasVal = (s) => String(s ?? "").trim() !== "";
// Each event = a client-side predicate over a normalized Datadog event.
// Filter events read cfg.targetValue. `eventType` selects the entry.
const DATADOG_EVENTS = {
  any_event:      { match: () => true },
  alert_error:    { match: (e) => e.alertType === "error" },
  alert_warning:  { match: (e) => e.alertType === "warning" },
  alert_recovery: { match: (e) => e.alertType === "success" || e.alertType === "recovery" },
  alert_info:     { match: (e) => e.alertType === "info" || !hasVal(e.alertType) },
  high_priority:  { match: (e) => e.priority === "normal" },
  low_priority:   { match: (e) => e.priority === "low" },
  from_source:    { match: (e, c) => (e.source || "").toLowerCase() === String(c.targetValue || "").toLowerCase() },
  from_host:      { match: (e, c) => (e.host || "").toLowerCase() === String(c.targetValue || "").toLowerCase() },
  has_tag:        { match: (e, c) => (e.tags || []).some(t => t.toLowerCase() === String(c.targetValue || "").toLowerCase()) },
  title_contains: { match: (e, c) => (e.title || "").toLowerCase().includes(String(c.targetValue || "").toLowerCase()) },
  text_contains:  { match: (e, c) => (e.text || "").toLowerCase().includes(String(c.targetValue || "").toLowerCase()) },
};

export async function pollDatadog(automationId, cfg) {
  const lockKey = `bb:datadog:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { apiKey, appKey, tags, priority, windowMinutes } = cfg;
    if (!apiKey || !appKey) return;
    const eventType = cfg.eventType || cfg.watchType || "any_event";
    const spec = DATADOG_EVENTS[eventType] || DATADOG_EVENTS.any_event;

    const events = await fetchDatadogEvents(apiKey, appKey, tags, priority, windowMinutes);
    if (!events.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:datadog:seen:${automationId}:${eventType}`;
    for (const event of events) {
      if (!spec.match(event, cfg)) continue;
      const added = await redis.sadd(seenKey, event.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, event, { workspaceId: automation.workspaceId, idempotencyKey: `datadog:${automation._id}:${eventType}:${event.id}` });
      } catch (err) {
        console.error(`[DatadogPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[DatadogPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
