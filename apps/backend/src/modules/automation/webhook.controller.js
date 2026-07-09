import crypto from "crypto";
import Automation from "../../models/automation.model.js";
import { startAndAwaitWorkflowExecution } from "../execution/execution.service.js";
import { validateAutomation } from "./engine/automation.validator.js";
import { redis } from "../../infra/redis.client.js";
import { webhookQueue } from "../../infra/webhook.queue.js";
import { sanitizeAndLog } from "../../utils/errors.js";
import { getTriggerConfig, getTriggerNodesOfType } from "../../infra/triggerNodes.util.js";
import { matchesWhatsappEvent, shapeWhatsappPayload } from "../../infra/whatsapp.classify.js";
import { resolveSecret } from "../../utils/resolveSecret.js";

// Constant-time string compare that never throws. The naive pattern
// (`a.length !== b.length` + `timingSafeEqual(Buffer.from(a), Buffer.from(b))`)
// compares UTF-16 code-unit length but builds UTF-8 byte buffers — a multibyte
// header slips past the length guard and makes timingSafeEqual throw RangeError,
// surfacing as a 500 instead of a clean 401. Comparing byte buffers directly and
// bailing on any length mismatch removes both the throw and the timing leak.
function safeEqual(provided, expected) {
  const p = Buffer.from(String(provided ?? ""), "utf8");
  const e = Buffer.from(String(expected ?? ""), "utf8");
  if (p.length !== e.length) return false;
  return crypto.timingSafeEqual(p, e);
}

// Config fields whose value is a CredentialPicker id (or legacy literal) that must
// be decrypted to the real secret before any HMAC/token comparison. The config
// panels store a credential `_id`, so comparing against it raw makes every
// signature check fail → the provider's event is rejected 401 and the trigger
// never fires. Resolve them up-front so the verify blocks see the real secret.
const CREDENTIAL_SECRET_FIELDS = [
  "slackSigningSecret", "shopifyWebhookSecret", "linearWebhookSecret",
  "typeformWebhookSecret", "gitlabWebhookSecret", "pagerdutyWebhookSecret",
  "calendlyWebhookSecret", "figmaWebhookPasscode", "mailchimpWebhookSecret",
  "telegramSecretToken", "hmacSecret", "secret", "metaVerifyToken",
  "metaAppSecret", "woocommerceWebhookSecret", "clickupWebhookSecret",
  "zendeskWebhookSecret", "vercelWebhookSecret", "netlifyWebhookSecret",
  "airtableWebhookSecret", "asanaWebhookSecret", "stripeWebhookSecret",
  "githubWebhookSecret",
];

// Header fingerprint → the externally-registered trigger type that owns it.
// Used to disambiguate which trigger node an inbound webhook belongs to.
const WEBHOOK_HEADER_SIGNATURES = [
  { header: "x-hub-signature-256", type: "github_trigger" },
  { header: "stripe-signature", type: "stripe_trigger" },
  { header: "x-telegram-bot-api-secret-token", type: "telegram_trigger" },
  { header: "x-slack-signature", type: "slack_trigger" },
  { header: "x-shopify-hmac-sha256", type: "shopify_trigger" },
  { header: "linear-signature", type: "linear_trigger" },
  { header: "typeform-signature", type: "typeform_trigger" },
  { header: "x-gitlab-token", type: "gitlab_trigger" },
  { header: "x-wc-webhook-signature", type: "woocommerce_trigger" },
  { header: "calendly-webhook-signature", type: "calendly_trigger" },
  { header: "x-signature", type: "clickup_trigger" },
  { header: "x-zendesk-webhook-signature", type: "zendesk_trigger" },
  { header: "x-pagerduty-signature", type: "pagerduty_trigger" },
  { header: "x-vercel-signature", type: "vercel_trigger" },
  { header: "x-webhook-signature", type: "netlify_trigger" },
  { header: "x-airtable-content-mac", type: "airtable_trigger" },
  { header: "x-hook-signature", type: "asana_trigger" },
];

// HMAC-verified apps registered via webhook.registry.js. Each maps the trigger
// type → { header it signs with, config key holding the secret, digest encoding,
// optional prefix }. timingSafe-compared in the generic verify block below.
const HMAC_WEBHOOK_APPS = {
  woocommerce_trigger: { header: "x-wc-webhook-signature", secretKey: "woocommerceWebhookSecret", enc: "base64" },
  clickup_trigger:     { header: "x-signature", secretKey: "clickupWebhookSecret", enc: "hex" },
  zendesk_trigger:     { header: "x-zendesk-webhook-signature", secretKey: "zendeskWebhookSecret", enc: "base64" },
  vercel_trigger:      { header: "x-vercel-signature", secretKey: "vercelWebhookSecret", enc: "hex" },
  netlify_trigger:     { header: "x-webhook-signature", secretKey: "netlifyWebhookSecret", enc: "hex" },
  airtable_trigger:    { header: "x-airtable-content-mac", secretKey: "airtableWebhookSecret", enc: "base64", prefix: "hmac-sha256=", secretIsBase64: true },
  asana_trigger:       { header: "x-hook-signature", secretKey: "asanaWebhookSecret", enc: "hex" },
};

/**
 * Pick which trigger node an inbound webhook belongs to.
 * 1. Match the stored per-node registration record (webhook id / secret).
 * 2. Else match the trigger type implied by request headers, taking the first
 *    trigger node of that type.
 * 3. Else fall back to the automation's entry node.
 */
function resolveWebhookTriggerNode(automation, req) {
  const triggerEntries = automation.triggerNodes?.length
    ? automation.triggerNodes
    : [{ nodeId: automation.entryNodeId, type: automation.trigger }];

  // Meta WhatsApp shares the x-hub-signature-256 header with GitHub, so route
  // by payload shape first: the GET verify (hub.mode) and POST (object) both
  // self-identify as a whatsapp_business_account.
  const isMeta = req.query?.["hub.mode"] === "subscribe"
    || req.body?.object === "whatsapp_business_account";
  if (isMeta) {
    const matches = getTriggerNodesOfType(automation, "whatsapp_trigger");
    if (matches.length) return { node: matches[0], config: getTriggerConfig(matches[0]) };
  }

  for (const sig of WEBHOOK_HEADER_SIGNATURES) {
    if (!req.headers[sig.header]) continue;
    const matches = getTriggerNodesOfType(automation, sig.type);
    if (matches.length) {
      return { node: matches[0], config: getTriggerConfig(matches[0]) };
    }
  }

  const entry =
    triggerEntries.find((e) => e.nodeId === automation.entryNodeId) ||
    triggerEntries[0];
  const node =
    automation.nodes.find((n) => n.id === entry?.nodeId) ||
    automation.nodes.find((n) => n.id === automation.entryNodeId);
  return { node, config: node ? getTriggerConfig(node) : {} };
}

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

    // ── Resolve which trigger node this webhook belongs to ──────────────────
    const { node: entryNode, config: triggerConfig } = resolveWebhookTriggerNode(
      automation,
      req,
    );
    const entryNodeId = entryNode?.id || automation.entryNodeId;
    let isWhatsapp = false;

    // Decrypt any credential-picker secrets in place so the signature/token checks
    // below compare against the REAL secret, not the stored credential id.
    const wsId = automation.workspaceId?.toString();
    await Promise.all(
      CREDENTIAL_SECRET_FIELDS.map(async (field) => {
        if (triggerConfig[field]) {
          triggerConfig[field] = await resolveSecret(triggerConfig[field], wsId, field);
        }
      }),
    );

    // ── Registration handshakes (answered before any auth / signature check) ──
    // Asana: echo the X-Hook-Secret header back on the confirmation handshake and
    // remember it as the HMAC secret for future X-Hook-Signature deliveries.
    // SECURITY: the handshake is unauthenticated by nature, so accept it ONLY
    // while we're expecting one — the node must be an Asana trigger AND flagged
    // `asanaAwaitingHandshake` (set when we create the subscription). We never
    // overwrite an already-established secret; otherwise anyone could POST an
    // X-Hook-Secret of their choice, learn the HMAC key, and forge signed events.
    const asanaHookSecret = req.headers["x-hook-secret"];
    if (asanaHookSecret) {
      const isAsanaNode = entryNode?.data?.config
        && (entryNode.type === "asana_trigger" || entryNode.data.type === "asana_trigger");
      const awaiting = isAsanaNode
        && entryNode.data.config.asanaAwaitingHandshake === true
        && !entryNode.data.config.asanaWebhookSecret;
      if (!awaiting) {
        return res.status(401).json({ error: "Unexpected handshake" });
      }
      try {
        entryNode.data.config.asanaWebhookSecret = asanaHookSecret;
        entryNode.data.config.asanaAwaitingHandshake = false;
        await automation.save();
      } catch { /* best-effort persist */ }
      res.set("X-Hook-Secret", asanaHookSecret);
      return res.status(200).json({});
    }
    // Monday: reply to the one-time URL verification challenge.
    if (req.body?.challenge && !req.body?.event) {
      return res.status(200).json({ challenge: req.body.challenge });
    }

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

      if (!safeEqual(receivedSig, expectedSig)) {
        return res.status(401).json({ error: "Webhook signature verification failed" });
      }
    }

    // ── GitHub: X-Hub-Signature-256 = sha256=<hex HMAC of rawBody> ────────────
    // The branded GitHub trigger stores its secret in githubWebhookSecret; verify
    // it here so a normally-configured GitHub trigger is signature-checked even
    // when the user never flips the generic hmacEnabled toggle.
    if (triggerConfig.githubWebhookSecret) {
      const provided = req.headers["x-hub-signature-256"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = "sha256=" + crypto.createHmac("sha256", triggerConfig.githubWebhookSecret)
        .update(rawBody).digest("hex");
      if (!safeEqual(provided, expected)) {
        return res.status(401).json({ error: "Invalid GitHub webhook signature" });
      }
    }

    // ── Telegram: X-Telegram-Bot-Api-Secret-Token header ─────────────────────
    if (triggerConfig.telegramSecretToken) {
      const provided = req.headers["x-telegram-bot-api-secret-token"] || "";
      if (!safeEqual(provided, triggerConfig.telegramSecretToken)) {
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
      if (!safeEqual(slackSig, computed)) {
        return res.status(401).json({ error: "Invalid Slack signature" });
      }
    }

    // ── Shopify: X-Shopify-Hmac-Sha256 (base64-encoded HMAC) ─────────────────
    if (triggerConfig.shopifyWebhookSecret) {
      const provided = req.headers["x-shopify-hmac-sha256"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = crypto.createHmac("sha256", triggerConfig.shopifyWebhookSecret)
        .update(rawBody).digest("base64");
      if (!safeEqual(provided, expected)) {
        return res.status(401).json({ error: "Invalid Shopify webhook signature" });
      }
    }

    // ── Linear: linear-signature header ──────────────────────────────────────
    if (triggerConfig.linearWebhookSecret) {
      const provided = req.headers["linear-signature"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = crypto.createHmac("sha256", triggerConfig.linearWebhookSecret)
        .update(rawBody).digest("hex");
      if (!safeEqual(provided, expected)) {
        return res.status(401).json({ error: "Invalid Linear webhook signature" });
      }
    }

    // ── Typeform: Typeform-Signature header (sha256=base64 HMAC) ─────────────
    if (triggerConfig.typeformWebhookSecret) {
      const provided = req.headers["typeform-signature"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = "sha256=" + crypto.createHmac("sha256", triggerConfig.typeformWebhookSecret)
        .update(rawBody).digest("base64");
      if (!safeEqual(provided, expected)) {
        return res.status(401).json({ error: "Invalid Typeform webhook signature" });
      }
    }

    // ── GitLab: plaintext secret token compare (X-Gitlab-Token) ──────────────
    if (triggerConfig.gitlabWebhookSecret) {
      const provided = req.headers["x-gitlab-token"] || "";
      if (!safeEqual(provided, triggerConfig.gitlabWebhookSecret)) {
        return res.status(401).json({ error: "Invalid GitLab webhook token" });
      }
    }

    // ── PagerDuty: X-PagerDuty-Signature (v1=<hex>, may list multiple) ───────
    if (triggerConfig.pagerdutyWebhookSecret) {
      const provided = req.headers["x-pagerduty-signature"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = crypto.createHmac("sha256", triggerConfig.pagerdutyWebhookSecret)
        .update(rawBody).digest("hex");
      const sigs = provided.split(",").map((s) => s.trim().replace(/^v1=/, ""));
      if (!sigs.some((s) => safeEqual(s, expected))) {
        return res.status(401).json({ error: "Invalid PagerDuty webhook signature" });
      }
    }

    // ── Calendly: Calendly-Webhook-Signature "t=<ts>,v1=<hex>" over `${t}.${body}` ─
    if (triggerConfig.calendlyWebhookSecret) {
      const provided = req.headers["calendly-webhook-signature"] || "";
      const parts = Object.fromEntries(
        provided.split(",").map((p) => p.trim().split("=").map((s) => s.trim())),
      );
      const rawBody = (req.rawBody || Buffer.from(JSON.stringify(req.body))).toString("utf8");
      const expected = crypto.createHmac("sha256", triggerConfig.calendlyWebhookSecret)
        .update(`${parts.t}.${rawBody}`).digest("hex");
      const got = parts.v1 || "";
      if (!parts.t || !safeEqual(got, expected)) {
        return res.status(401).json({ error: "Invalid Calendly webhook signature" });
      }
    }

    // ── Generic HMAC-signed apps (webhook.registry.js registrations) ─────────
    for (const [type, spec] of Object.entries(HMAC_WEBHOOK_APPS)) {
      const secret = triggerConfig[spec.secretKey];
      if (!secret) continue;
      const provided = req.headers[spec.header] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const key = spec.secretIsBase64 ? Buffer.from(secret, "base64") : secret;
      let expected = crypto.createHmac("sha256", key).update(rawBody).digest(spec.enc);
      if (spec.prefix) expected = spec.prefix + expected;
      if (!safeEqual(provided, expected)) {
        return res.status(401).json({ error: `Invalid ${type.replace("_trigger", "")} webhook signature` });
      }
    }

    // ── Figma: passcode echoed in the POST body (no HMAC) ────────────────────
    if (triggerConfig.figmaWebhookPasscode) {
      const provided = req.body?.passcode || "";
      // Figma also sends a PING event on creation — let it through to confirm.
      if (req.body?.event_type !== "PING" &&
        !safeEqual(provided, triggerConfig.figmaWebhookPasscode)) {
        return res.status(401).json({ error: "Invalid Figma webhook passcode" });
      }
    }

    // ── Mailchimp: no HMAC — we verify the ?bbsecret=<secret> we set at register ─
    if (triggerConfig.mailchimpWebhookSecret) {
      const provided = String(req.query.bbsecret || "");
      // Mailchimp sends a GET to validate the URL on creation — let it through.
      if (req.method !== "GET" &&
        !safeEqual(provided, triggerConfig.mailchimpWebhookSecret)) {
        return res.status(401).json({ error: "Invalid Mailchimp webhook secret" });
      }
    }

    // ── Azure DevOps service hooks carry no signature; auth is the per-automation
    //    URL + stored subscription id. No inbound check to fake here.

    // ── Meta WhatsApp: hub.verify_token challenge (GET requests) ─────────────
    if (triggerConfig.metaVerifyToken && req.method === "GET") {
      const mode  = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];
      if (mode === "subscribe" && safeEqual(token, triggerConfig.metaVerifyToken)) {
        return res.status(200).type("text/plain").send(String(challenge));
      }
      return res.status(403).json({ error: "Meta webhook verification failed" });
    }

    // ── Meta WhatsApp: app-secret signature + per-event classification (POST) ─
    if (triggerConfig.metaVerifyToken && req.method === "POST") {
      // WhatsApp is nuclear-priority: require the app-secret signature. Without a
      // configured metaAppSecret we cannot authenticate the sender, so refuse.
      if (!triggerConfig.metaAppSecret) {
        return res.status(401).json({ error: "Meta app secret not configured" });
      }
      const provided = req.headers["x-hub-signature-256"] || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const expected = "sha256=" + crypto.createHmac("sha256", triggerConfig.metaAppSecret)
        .update(rawBody).digest("hex");
      if (!safeEqual(provided, expected)) {
        return res.status(401).json({ error: "Invalid Meta webhook signature" });
      }
      // Meta sends every subscribed change to one URL; drop payloads that don't
      // match the selected event so each trigger only fires on its own event.
      const eventType = triggerConfig.whatsappEvent || triggerConfig.eventType;
      if (eventType && !matchesWhatsappEvent(req.body, eventType, { targetValue: triggerConfig.targetValue })) {
        return res.status(200).json({ ignored: true });
      }
      isWhatsapp = true;
    }

    // WhatsApp triggers run on a flattened payload so $trigger.text / $trigger.from
    // resolve directly; the raw Meta body stays under $trigger.raw.
    const webhookData = isWhatsapp
      ? shapeWhatsappPayload(req.body)
      : {
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
          targetHandle: e.targetHandle ?? null,
        })),
        entryNodeId,
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
          entryNodeId,
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
        entryNodeId,
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
