/**
 * GitHub Webhook Auto-Registrar
 *
 * Called when a github_trigger automation is activated.
 * Uses the GitHub REST API to create a webhook on the target repo
 * pointing to the automation's BlinkBox webhook URL.
 *
 * On deactivation: deletes the webhook from GitHub.
 *
 * Webhook secret: we generate a random secret per automation and
 * store it in the trigger config so the webhook controller can verify
 * the X-Hub-Signature-256 header.
 *
 * The webhook controller already handles generic webhooks — GitHub events
 * arrive as normal POST requests and the payload is available as $trigger.body.*.
 * We also expose $trigger.event from the X-GitHub-Event header.
 */

import crypto from "crypto";
import { BACKEND_URL } from "../config/env.js";
import Automation from "../models/automation.model.js";

const GITHUB_API = "https://api.github.com";

async function githubRequest(path, method, token, body = null) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "BlinkBox/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`GitHub API ${method} ${path} → ${res.status}: ${json.message || JSON.stringify(json)}`);
  }
  return json;
}

/**
 * Register a GitHub webhook for the given automation.
 * Returns the webhook ID and signing secret (stored in automation config).
 */
export async function registerGitHubWebhook(automationId, repo, events, token, nodeId = null) {
  const webhookUrl = `${BACKEND_URL}/webhook/${automationId}`;
  const secret = crypto.randomBytes(24).toString("hex");

  const data = await githubRequest(`/repos/${repo}/hooks`, "POST", token, {
    name: "web",
    active: true,
    events: events.length ? events : ["push"],
    config: {
      url: webhookUrl,
      content_type: "json",
      secret,
      insecure_ssl: "0",
    },
  });

  // Store the webhook ID and secret back into the automation's trigger config
  // so we can delete it on deactivation and verify signatures on incoming events.
  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode) {
      entryNode.data = entryNode.data || {};
      entryNode.data.config = {
        ...(entryNode.data.config || {}),
        githubWebhookId: data.id,
        secret,
        authEnabled: true, // tells webhook.controller.js to verify the token
        webhookRegistered: true,
      };
    }
    await automation.save();
  }

  console.log(`[GitHub] Registered webhook ${data.id} on ${repo} for automation ${automationId}`);
  return { webhookId: data.id, secret };
}

/**
 * Delete the GitHub webhook for the given automation.
 */
export async function unregisterGitHubWebhook(automationId, repo, webhookId, token, nodeId = null) {
  try {
    await githubRequest(`/repos/${repo}/hooks/${webhookId}`, "DELETE", token);
    console.log(`[GitHub] Deleted webhook ${webhookId} from ${repo}`);
  } catch (err) {
    // If webhook already gone, that's fine
    if (!err.message.includes("404")) throw err;
  }

  // Clear the stored webhook metadata
  const automation = await Automation.findById(automationId);
  if (automation) {
    const targetId = nodeId || automation.entryNodeId;
    const entryNode = automation.nodes.find((n) => n.id === targetId);
    if (entryNode?.data?.config) {
      delete entryNode.data.config.githubWebhookId;
      delete entryNode.data.config.secret;
      entryNode.data.config.webhookRegistered = false;
      await automation.save();
    }
  }
}

/**
 * Verify GitHub webhook signature (X-Hub-Signature-256 header).
 * Call this in the webhook controller before processing github_trigger payloads.
 */
export function verifyGitHubSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
