import crypto from "crypto";
import Automation from "../../models/automation.model.js";
import { startAndAwaitWorkflowExecution } from "../execution/execution.service.js";
import { validateAutomation } from "./engine/automation.validator.js";
import { redis } from "../../infra/redis.client.js";
import { webhookQueue } from "../../infra/webhook.queue.js";
import { sanitizeAndLog } from "../../utils/errors.js";

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

    // ── Enforce trigger config: allowed methods + auth ──────────────────────
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const triggerConfig = entryNode?.data || {};

    if (triggerConfig.allowedMethods && triggerConfig.allowedMethods.length > 0) {
      if (!triggerConfig.allowedMethods.includes(req.method)) {
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
      }
    }

    if (triggerConfig.authEnabled && triggerConfig.secret) {
      const authHeader = req.headers["authorization"] || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (token !== triggerConfig.secret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    // HMAC signature verification (GitHub/Stripe-style)
    if (triggerConfig.hmacEnabled && triggerConfig.hmacSecret) {
      const headerName = (triggerConfig.hmacHeader || "x-hub-signature-256").toLowerCase();
      const algorithm = triggerConfig.hmacAlgorithm || "sha256";
      const receivedSig = req.headers[headerName] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expectedSig = `${algorithm}=` + crypto.createHmac(algorithm, triggerConfig.hmacSecret)
        .update(rawBody).digest("hex");

      if (
        receivedSig.length !== expectedSig.length ||
        !crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))
      ) {
        return res.status(401).json({ error: "Webhook signature verification failed" });
      }
    }

    const webhookData = {
      body:    req.body    || {},
      query:   req.query   || {},
      headers: req.headers || {},
      method:  req.method,
    };

    const idempotencyKey = crypto.randomUUID();

    // Validate DAG before scheduling — reject cycles and malformed graphs
    try {
      validateAutomation({
        nodes: automation.nodes,
        edges: automation.edges.map((e) => ({
          source: e.source ?? e.from,
          target: e.target ?? e.to,
        })),
        entryNodeId: automation.entryNodeId,
      });
    } catch (err) {
      return res.status(400).json({ error: `Invalid workflow: ${err.message}` });
    }

    const isSynchronous = req.query.wait === "true";

    if (isSynchronous) {
      // ── Synchronous mode: hold the HTTP connection until the DAG completes ──
      // The caller gets the respond_webhook node's output as the HTTP response.
      try {
        const result = await startAndAwaitWorkflowExecution(automation, webhookData, {
          idempotencyKey,
          workspaceId: automation.workspaceId,
        });

        // If the DAG contains a respond_webhook node, use its response
        if (result && result.__webhookResponse) {
          const { statusCode = 200, body, contentType } = result.__webhookResponse;
          if (contentType === "text") {
            return res.status(statusCode).type("text/plain").send(String(body ?? ""));
          }
          return res.status(statusCode).json(body ?? {});
        }

        // No respond_webhook node — return the full workflow output
        return res.status(200).json({
          success: true,
          message: "Workflow completed",
          workflowKey: idempotencyKey,
          output: result,
        });
      } catch (err) {
        const safeMsg = sanitizeAndLog(err, `Webhook Sync ${automationId}`);
        return res.status(500).json({ error: safeMsg });
      }
    }

    // ── Async mode (default): push to BullMQ shock absorber ────────────────
    // The webhook worker drains this queue with concurrency limits,
    // protecting the Temporal client from traffic spikes.
    await webhookQueue.add(
      "webhook-trigger",
      {
        automationId,
        webhookData,
        idempotencyKey,
        workspaceId: automation.workspaceId,
      },
      { jobId: idempotencyKey },
    );

    return res.status(202).json({
      success: true,
      message: "Webhook accepted",
      workflowKey: idempotencyKey,
    });
  } catch (err) {
    sanitizeAndLog(err, "Webhook Controller");
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
