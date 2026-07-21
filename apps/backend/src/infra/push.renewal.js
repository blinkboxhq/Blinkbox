import Automation from "../models/automation.model.js";
import { findAutomationsWithTrigger, getTriggerNodesOfType, getTriggerConfig } from "./triggerNodes.util.js";
import { WEBHOOK_APPS, registerWebhook, unregisterWebhook } from "./webhook.registry.js";
import { syncPollerHub } from "./poller.hub.js";
import { redis } from "./redis.client.js";
import { GOOGLE_PUBSUB_TOPIC } from "../config/env.js";

const INTERVAL_MS = 6 * 60 * 60 * 1000;
const LOCK_KEY = "bb:push:renewal:lock";

// Graph subscriptions extend in place via PATCH; Google channels cannot be
// extended and must be swapped for a fresh one before they lapse.
const GRAPH_TYPES = ["outlook_trigger", "onedrive_trigger", "sharepoint_trigger"];
const DRIVE_CHANNEL_TYPES = [
  "google_sheets_trigger", "google_docs_trigger",
  "google_drive_trigger", "google_calendar_trigger",
];

async function renewGraph(type) {
  const automations = await findAutomationsWithTrigger(type);
  let fellBack = false;

  for (const automation of automations) {
    if (!automation.active) continue;
    for (const node of getTriggerNodesOfType(automation, type)) {
      const cfg = getTriggerConfig(node);
      const subId = cfg[`${type}_webhookId`];
      if (!cfg.webhookRegistered || !subId) continue;
      try {
        const token = await WEBHOOK_APPS[type].resolveToken(cfg, automation.workspaceId);
        const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(),
          }),
        });
        if (!res.ok) throw new Error(`Graph renew → ${res.status}`);
      } catch (err) {
        console.warn(`[PushRenewal] ${type} ${automation._id}: ${err.message} — recreating`);
        fellBack = (await recreate(type, automation, node, cfg)) || fellBack;
      }
    }
  }
  return fellBack;
}

async function renewDriveChannel(type) {
  const automations = await findAutomationsWithTrigger(type);
  let fellBack = false;

  for (const automation of automations) {
    if (!automation.active) continue;
    for (const node of getTriggerNodesOfType(automation, type)) {
      const cfg = getTriggerConfig(node);
      if (!cfg.webhookRegistered || !cfg[`${type}_webhookId`]) continue;
      // Drive channels can't be extended — swap in a fresh one before expiry
      if ((Number(cfg.driveExpiresAt) || 0) - Date.now() > INTERVAL_MS + 2 * 60 * 60 * 1000) continue;
      fellBack = (await recreate(type, automation, node, cfg)) || fellBack;
    }
  }
  return fellBack;
}

// Gmail watches expire after 7 days and re-calling watch extends in place
// (Google recommends re-watching daily), so every cycle just re-watches
async function renewGmail() {
  const automations = await findAutomationsWithTrigger("gmail_trigger");
  let fellBack = false;

  for (const automation of automations) {
    if (!automation.active) continue;
    for (const node of getTriggerNodesOfType(automation, "gmail_trigger")) {
      const cfg = getTriggerConfig(node);
      if (!cfg.webhookRegistered || !cfg.gmail_trigger_webhookId) continue;
      try {
        const token = await WEBHOOK_APPS.gmail_trigger.resolveToken(cfg, automation.workspaceId);
        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ topicName: GOOGLE_PUBSUB_TOPIC }),
        });
        if (!res.ok) throw new Error(`Gmail re-watch → ${res.status}`);
      } catch (err) {
        console.warn(`[PushRenewal] gmail ${automation._id}: ${err.message} — recreating`);
        fellBack = (await recreate("gmail_trigger", automation, node, cfg)) || fellBack;
      }
    }
  }
  return fellBack;
}

// Forms watches expire after 7 days; :renew extends the existing one
async function renewForms() {
  const automations = await findAutomationsWithTrigger("google_forms_trigger");
  let fellBack = false;

  for (const automation of automations) {
    if (!automation.active) continue;
    for (const node of getTriggerNodesOfType(automation, "google_forms_trigger")) {
      const cfg = getTriggerConfig(node);
      const watchId = cfg.google_forms_trigger_webhookId;
      if (!cfg.webhookRegistered || !watchId) continue;
      try {
        const token = await WEBHOOK_APPS.google_forms_trigger.resolveToken(cfg, automation.workspaceId);
        const res = await fetch(
          `https://forms.googleapis.com/v1/forms/${encodeURIComponent(cfg.formId)}/watches/${watchId}:renew`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error(`Forms renew → ${res.status}`);
      } catch (err) {
        console.warn(`[PushRenewal] forms ${automation._id}: ${err.message} — recreating`);
        fellBack = (await recreate("google_forms_trigger", automation, node, cfg)) || fellBack;
      }
    }
  }
  return fellBack;
}

// returns true when the node ended up unregistered (poller must take over)
async function recreate(type, automation, node, cfg) {
  const id = automation._id.toString();
  try {
    await unregisterWebhook(type, id, cfg, automation.workspaceId, node.id);
  } catch { /* teardown is best-effort */ }
  try {
    const fresh = await Automation.findById(id);
    const freshNode = fresh?.nodes?.find((n) => n.id === node.id);
    const freshCfg = freshNode ? getTriggerConfig(freshNode) : {};
    if (freshCfg.webhookRegistered) return true;
    await registerWebhook(type, id, freshCfg, automation.workspaceId, node.id);
    return false;
  } catch (err) {
    console.warn(`[PushRenewal] ${type} re-register failed for ${id} — poller takes over: ${err.message}`);
    return true;
  }
}

async function runRenewal() {
  const lock = await redis.set(LOCK_KEY, "1", "EX", 300, "NX");
  if (!lock) return;
  try {
    for (const t of GRAPH_TYPES) {
      if (await renewGraph(t)) await syncPollerHub(t);
    }
    for (const t of DRIVE_CHANNEL_TYPES) {
      if (await renewDriveChannel(t)) await syncPollerHub(t);
    }
    if (await renewGmail()) await syncPollerHub("gmail_trigger");
    if (await renewForms()) await syncPollerHub("google_forms_trigger");
  } catch (err) {
    console.error("[PushRenewal] cycle failed:", err.message);
  } finally {
    await redis.del(LOCK_KEY).catch(() => {});
  }
}

export function startPushRenewal() {
  setInterval(() => runRenewal().catch(() => {}), INTERVAL_MS);
  setTimeout(() => runRenewal().catch(() => {}), 60 * 1000);
  console.log("[PushRenewal] Graph subscription renew + Drive channel swap every 6h");
}
