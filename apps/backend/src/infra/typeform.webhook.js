/**
 * Typeform Webhook Auto-Registrar
 *
 * Called when a typeform_trigger automation is activated. Uses the Typeform
 * Create Webhook API (PUT /forms/{formId}/webhooks/{tag}) to create a webhook
 * pointing at the automation's BlinkBox webhook URL, then deletes it on
 * deactivation.
 *
 * Signature: Typeform signs every delivery with the webhook secret and sends the
 * base64 HMAC-SHA256 digest (prefixed `sha256=`) in the `typeform-signature`
 * header. We generate the secret ourselves and store it as `typeformWebhookSecret`
 * for the inbound controller to verify against. One webhook (tag) per trigger node.
 */

import crypto from "crypto";
import { BACKEND_URL } from "../config/env.js";
import Automation from "../models/automation.model.js";

const TYPEFORM_API = "https://api.typeform.com";

async function typeformRequest(token, path, method, body = null) {
  const res = await fetch(`${TYPEFORM_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "BlinkBox/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Typeform API ${method} ${path} → ${res.status}: ${json.description || JSON.stringify(json)}`,
    );
  }
  return json;
}

// Typeform identifies a webhook by a caller-chosen tag scoped to the form. We
// derive it from the automation id so it's stable and unique per automation.
function webhookTag(automationId) {
  return `blinkbox-${automationId}`;
}

export async function registerTypeformWebhook(automationId, formId, token, nodeId = null) {
  const webhookUrl = `${BACKEND_URL}/webhook/${automationId}`;
  const secret = crypto.randomBytes(24).toString("hex");
  const tag = webhookTag(automationId);

  await typeformRequest(token, `/forms/${formId}/webhooks/${tag}`, "PUT", {
    url: webhookUrl,
    enabled: true,
    secret,
    verify_ssl: true,
  });

  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode) {
      entryNode.data = entryNode.data || {};
      entryNode.data.config = {
        ...(entryNode.data.config || {}),
        typeformWebhookTag: tag,
        typeformFormId: formId,
        typeformWebhookSecret: secret,
        webhookRegistered: true,
      };
    }
    await automation.save();
  }

  console.log(`[Typeform] Registered webhook ${tag} on form ${formId} for automation ${automationId}`);
  return { tag, secret };
}

export async function unregisterTypeformWebhook(automationId, formId, tag, token, nodeId = null) {
  try {
    await typeformRequest(token, `/forms/${formId}/webhooks/${tag}`, "DELETE");
    console.log(`[Typeform] Deleted webhook ${tag} from form ${formId}`);
  } catch (err) {
    if (!err.message.includes("404")) throw err;
  }

  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode?.data?.config) {
      delete entryNode.data.config.typeformWebhookTag;
      delete entryNode.data.config.typeformFormId;
      delete entryNode.data.config.typeformWebhookSecret;
      entryNode.data.config.webhookRegistered = false;
      await automation.save();
    }
  }
}
