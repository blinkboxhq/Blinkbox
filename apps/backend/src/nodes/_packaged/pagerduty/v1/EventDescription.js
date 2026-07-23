/**
 * PagerDuty — Events API v2 (trigger/resolve/acknowledge). These ops need no
 * REST auth token; they post to EVENTS_URL with a routing key, so they receive
 * only `(config)` and are listed in EVENT_OPS so the router skips auth.
 */
import axios from "axios";
import { EVENTS_URL, need } from "../GenericFunctions.js";

async function opTriggerEvent(config) {
  let e = need(config, "routingKey", "triggerEvent"); if (e) return e;
  e = need(config, "summary", "triggerEvent"); if (e) return e;
  const payload = {
    routing_key: config.routingKey,
    event_action: "trigger",
    payload: {
      summary: config.summary,
      source: config.source || "blinkbox",
      severity: config.severity || "critical",
    },
  };
  if (config.dedupKey) payload.dedup_key = config.dedupKey;
  if (config.component) payload.payload.component = config.component;
  if (config.eventClass) payload.payload.class = config.eventClass;
  const { data } = await axios.post(EVENTS_URL, payload, { timeout: 120000 });
  return { success: true, status: data.status, dedup_key: data.dedup_key, message: data.message };
}

async function opResolveEvent(config) {
  let e = need(config, "routingKey", "resolveEvent"); if (e) return e;
  e = need(config, "dedupKey", "resolveEvent"); if (e) return e;
  const { data } = await axios.post(EVENTS_URL, { routing_key: config.routingKey, event_action: "resolve", dedup_key: config.dedupKey }, { timeout: 120000 });
  return { success: true, status: data.status, dedup_key: data.dedup_key };
}

async function opAcknowledgeEvent(config) {
  let e = need(config, "routingKey", "acknowledgeEvent"); if (e) return e;
  e = need(config, "dedupKey", "acknowledgeEvent"); if (e) return e;
  const { data } = await axios.post(EVENTS_URL, { routing_key: config.routingKey, event_action: "acknowledge", dedup_key: config.dedupKey }, { timeout: 120000 });
  return { success: true, status: data.status, dedup_key: data.dedup_key };
}

export const eventOperations = {
  triggerEvent: opTriggerEvent,
  resolveEvent: opResolveEvent,
  acknowledgeEvent: opAcknowledgeEvent,
};

export const EVENT_OP_NAMES = ["triggerEvent", "resolveEvent", "acknowledgeEvent"];
