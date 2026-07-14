import Automation from "../models/automation.model.js";
import { findAutomationsWithTrigger, getTriggerNodesOfType, getTriggerConfig } from "./triggerNodes.util.js";
import { WEBHOOK_APPS, registerWebhook, unregisterWebhook } from "./webhook.registry.js";
import { syncPollerHub } from "./poller.hub.js";
import { redis } from "./redis.client.js";

const INTERVAL_MS = 6 * 60 * 60 * 1000;
const LOCK_KEY = "bb:push:renewal:lock";

async function renewOutlook() {
  const automations = await findAutomationsWithTrigger("outlook_trigger");
  let fellBack = false;

  for (const automation of automations) {
    if (!automation.active) continue;
    for (const node of getTriggerNodesOfType(automation, "outlook_trigger")) {
      const cfg = getTriggerConfig(node);
      const subId = cfg.outlook_trigger_webhookId;
      if (!cfg.webhookRegistered || !subId) continue;
      try {
        const token = await WEBHOOK_APPS.outlook_trigger.resolveToken(cfg, automation.workspaceId);
        const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(),
          }),
        });
        if (!res.ok) throw new Error(`Graph renew → ${res.status}`);
      } catch (err) {
        console.warn(`[PushRenewal] outlook ${automation._id}: ${err.message} — recreating`);
        fellBack = (await recreate("outlook_trigger", automation, node, cfg)) || fellBack;
      }
    }
  }
  return fellBack;
}

async function renewSheets() {
  const automations = await findAutomationsWithTrigger("google_sheets_trigger");
  let fellBack = false;

  for (const automation of automations) {
    if (!automation.active) continue;
    for (const node of getTriggerNodesOfType(automation, "google_sheets_trigger")) {
      const cfg = getTriggerConfig(node);
      if (!cfg.webhookRegistered || !cfg.google_sheets_trigger_webhookId) continue;
      // Drive channels can't be extended — swap in a fresh one before expiry
      if ((Number(cfg.driveExpiresAt) || 0) - Date.now() > INTERVAL_MS + 2 * 60 * 60 * 1000) continue;
      fellBack = (await recreate("google_sheets_trigger", automation, node, cfg)) || fellBack;
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
    if (await renewOutlook()) await syncPollerHub("outlook_trigger");
    if (await renewSheets()) await syncPollerHub("google_sheets_trigger");
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
