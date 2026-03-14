import crypto from "crypto";
import Automation from "../../models/automation.model.js";
import { startWorkflowExecution } from "../execution/execution.service.js";
import { redis } from "../../infra/redis.client.js";

const RATE_LIMIT = 60;
const RATE_WINDOW_SECONDS = 60;

async function isRateLimited(automationId) {
  const key = `bb:ratelimit:webhook:${automationId}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, RATE_WINDOW_SECONDS);
  }
  return current > RATE_LIMIT;
}

export async function handlePublicWebhook(req, res) {
  try {
    const { automationId } = req.params;

    if (await isRateLimited(automationId)) {
      return res.status(429).json({ error: "Too many requests. Slow down." });
    }

    const automation = await Automation.findById(automationId);
    if (!automation || !automation.active) {
      return res.status(404).json({ error: "Webhook not found or inactive" });
    }

    const webhookData = {
      body:    req.body    || {},
      query:   req.query   || {},
      headers: req.headers || {},
      method:  req.method,
    };

    const idempotencyKey = crypto.randomUUID();

    // Fire-and-forget: Temporal handles retries, timeouts, and crash recovery
    startWorkflowExecution(automation, webhookData, {
      idempotencyKey,
      workspaceId: automation.workspaceId,
    }).catch((err) => {
      console.error(`[Webhook] Temporal start error for ${automationId}:`, err.message);
    });

    return res.status(200).json({
      success: true,
      message: "Webhook accepted",
      workflowKey: idempotencyKey,
    });
  } catch (err) {
    console.error("[Webhook] Controller error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
