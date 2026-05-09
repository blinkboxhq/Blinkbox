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

    // ── Telegram: X-Telegram-Bot-Api-Secret-Token header ─────────────────────
    if (triggerConfig.telegramSecretToken) {
      const provided = req.headers["x-telegram-bot-api-secret-token"] || "";
      if (provided !== triggerConfig.telegramSecretToken) {
        return res.status(401).json({ error: "Invalid Telegram secret token" });
      }
    }

    // ── Slack: HMAC v0=sha256(signingSecret, "v0:timestamp:rawBody") ─────────
    if (triggerConfig.slackSigningSecret) {
      // Auto-respond to Slack URL verification challenge
      if (req.body?.type === "url_verification") {
        return res.status(200).json({ challenge: req.body.challenge });
      }
      const ts = req.headers["x-slack-request-timestamp"] || "";
      const slackSig = req.headers["x-slack-signature"] || "";
      if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
        return res.status(401).json({ error: "Slack request timestamp too old" });
      }
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const sigBase = `v0:${ts}:${rawBody.toString()}`;
      const computed = "v0=" + crypto.createHmac("sha256", triggerConfig.slackSigningSecret)
        .update(sigBase).digest("hex");
      const sigBuf = Buffer.from(slackSig.padEnd(computed.length));
      const expBuf = Buffer.from(computed);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return res.status(401).json({ error: "Invalid Slack signature" });
      }
    }

    // ── Shopify: X-Shopify-Hmac-Sha256 (base64-encoded HMAC) ─────────────────
    if (triggerConfig.shopifyWebhookSecret) {
      const provided = req.headers["x-shopify-hmac-sha256"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = crypto.createHmac("sha256", triggerConfig.shopifyWebhookSecret)
        .update(rawBody).digest("base64");
      if (provided !== expected) {
        return res.status(401).json({ error: "Invalid Shopify webhook signature" });
      }
    }

    // ── Linear: linear-signature header ──────────────────────────────────────
    if (triggerConfig.linearWebhookSecret) {
      const provided = req.headers["linear-signature"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = crypto.createHmac("sha256", triggerConfig.linearWebhookSecret)
        .update(rawBody).digest("hex");
      if (provided !== expected) {
        return res.status(401).json({ error: "Invalid Linear webhook signature" });
      }
    }

    // ── Typeform: Typeform-Signature header (sha256=base64 HMAC) ─────────────
    if (triggerConfig.typeformWebhookSecret) {
      const provided = req.headers["typeform-signature"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = "sha256=" + crypto.createHmac("sha256", triggerConfig.typeformWebhookSecret)
        .update(rawBody).digest("base64");
      if (provided !== expected) {
        return res.status(401).json({ error: "Invalid Typeform webhook signature" });
      }
    }

    // ── Meta WhatsApp: hub.verify_token challenge (GET requests) ─────────────
    if (triggerConfig.metaVerifyToken && req.method === "GET") {
      const mode  = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];
      if (mode === "subscribe" && token === triggerConfig.metaVerifyToken) {
        return res.status(200).type("text/plain").send(String(challenge));
      }
      return res.status(403).json({ error: "Meta webhook verification failed" });
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
