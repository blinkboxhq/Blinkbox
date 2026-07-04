/**
 * Linear Webhook Auto-Registrar
 *
 * Called when a linear_trigger automation is activated. Uses the Linear GraphQL
 * API (webhookCreate / webhookDelete mutations) to create a webhook pointing at
 * the automation's BlinkBox webhook URL, then tears it down on deactivation.
 *
 * Signature: Linear signs every delivery with the webhook secret and sends the
 * HMAC-SHA256 digest (hex) in the `linear-signature` header. We generate the
 * secret ourselves and store it as `linearWebhookSecret` for the inbound
 * controller to verify against. One webhook per active trigger node.
 */

import crypto from "crypto";
import { BACKEND_URL } from "../config/env.js";
import Automation from "../models/automation.model.js";

const LINEAR_API = "https://api.linear.app/graphql";

// Our internal eventType → Linear resourceType. Linear webhooks subscribe to
// resource types (Issue, Comment, …); the event verb (create/update/remove)
// arrives in the payload `action`, so one resourceType covers create+update.
const RESOURCE_MAP = {
  issue_created: "Issue",
  issue_updated: "Issue",
  issue_status_changed: "Issue",
  issue_assigned: "Issue",
  comment_created: "Comment",
  project_updated: "Project",
};

async function linearRequest(token, query, variables) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      "User-Agent": "BlinkBox/1.0",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(
      `Linear API → ${res.status}: ${json.errors ? JSON.stringify(json.errors) : JSON.stringify(json)}`,
    );
  }
  return json.data;
}

export async function registerLinearWebhook(automationId, eventType, teamId, token, nodeId = null) {
  const webhookUrl = `${BACKEND_URL}/webhook/${automationId}`;
  const secret = crypto.randomBytes(24).toString("hex");
  const resourceType = RESOURCE_MAP[eventType] || "Issue";

  const mutation = `
    mutation WebhookCreate($input: WebhookCreateInput!) {
      webhookCreate(input: $input) { success webhook { id } }
    }`;
  const input = {
    url: webhookUrl,
    resourceTypes: [resourceType],
    secret,
    ...(teamId ? { teamId } : { allPublicTeams: true }),
  };

  const data = await linearRequest(token, mutation, { input });
  const webhookId = data?.webhookCreate?.webhook?.id;
  if (!data?.webhookCreate?.success || !webhookId) {
    throw new Error("Linear webhookCreate did not return a webhook id.");
  }

  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode) {
      entryNode.data = entryNode.data || {};
      entryNode.data.config = {
        ...(entryNode.data.config || {}),
        linearWebhookId: webhookId,
        linearWebhookSecret: secret,
        webhookRegistered: true,
      };
    }
    await automation.save();
  }

  console.log(`[Linear] Registered webhook ${webhookId} (${resourceType}) for automation ${automationId}`);
  return { webhookId, secret };
}

export async function unregisterLinearWebhook(automationId, webhookId, token, nodeId = null) {
  try {
    const mutation = `
      mutation WebhookDelete($id: String!) {
        webhookDelete(id: $id) { success }
      }`;
    await linearRequest(token, mutation, { id: webhookId });
    console.log(`[Linear] Deleted webhook ${webhookId}`);
  } catch (err) {
    if (!err.message.includes("not found") && !err.message.includes("Entity not found")) throw err;
  }

  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode?.data?.config) {
      delete entryNode.data.config.linearWebhookId;
      delete entryNode.data.config.linearWebhookSecret;
      entryNode.data.config.webhookRegistered = false;
      await automation.save();
    }
  }
}
