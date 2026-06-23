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

export async function pollDatadog(automationId, cfg) {
  const lockKey = `bb:datadog:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { apiKey, appKey, tags, priority, windowMinutes } = cfg;
    if (!apiKey || !appKey) return;

    const events = await fetchDatadogEvents(apiKey, appKey, tags, priority, windowMinutes);
    if (!events.length) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:datadog:seen:${automationId}`;
    for (const event of events) {
      const added = await redis.sadd(seenKey, event.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, event, { workspaceId: automation.workspaceId, idempotencyKey: `datadog:${automation._id}:${event.id}` });
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
