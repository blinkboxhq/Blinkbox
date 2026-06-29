import crypto from "crypto";
import cronParser from "cron-parser";
const { parseExpression: parseCron } = cronParser;
import Automation from "../../../models/automation.model.js";
import Execution from "../../../models/execution.model.js";
import { validateAutomation } from "./automation.validator.js";
import { executeAutomation } from "../automation.executor.js";
import { syncCronJobs } from "../../../infra/cron.scheduler.js";
import { syncPollerHub } from "../../../infra/poller.hub.js";
import { emitToCollabRoom } from "../../../infra/socket.server.js";
import {
  registerGitHubWebhook,
  unregisterGitHubWebhook,
} from "../../../infra/github.webhook.js";
import {
  registerStripeWebhook,
  unregisterStripeWebhook,
} from "../../../infra/stripe.webhook.js";
import {
  unregisterTelegramWebhook,
} from "../../../infra/telegram.webhook.js";
import { snapshotBeforeSave } from "../version.routes.js";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";
import { getTriggerConfig } from "../../../infra/triggerNodes.util.js";

// The GitHub trigger stores a credentialId (OAuth account) — resolve it to the
// real access token before calling the GitHub API. A raw PAT (legacy githubToken)
// is passed through unchanged.
async function resolveGitHubToken(value, workspaceId) {
  if (!value) return null;
  const looksLikeCredentialId = /^[a-f\d]{24}$/i.test(value);
  if (!looksLikeCredentialId) return value;
  const cred = await resolveCredential(value, workspaceId, "GitHub trigger");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

/**
 * ===============================
 * CREATE / UPDATE AUTOMATION
 * ===============================
 */
export async function saveAutomation(req, res) {
  try {
    let automation;

    // Strip fields that must never be overwritten via save
    delete req.body.active;
    delete req.body.status;
    delete req.body._id;
    delete req.body.__v;
    delete req.body.createdAt;
    delete req.body.updatedAt;

    if (req.params.id) {
      // Updating an existing automation —
      // allow owner OR an editor-role collaborator to save.
      // Do NOT overwrite workspaceId (ownership stays with original creator).
      // Do NOT let an editor overwrite collaborators (privilege escalation).
      delete req.body.workspaceId;
      delete req.body.collaborators;

      const accessFilter = {
        _id: req.params.id,
        $or: [
          { workspaceId: req.user.id },
          { collaborators: { $elemMatch: { userId: String(req.user.id), role: "editor" } } },
        ],
      };

      const existing = await Automation.findOne(accessFilter);
      if (!existing) throw new Error("Automation not found or access denied");

      await snapshotBeforeSave(existing, existing.workspaceId);

      automation = await Automation.findOneAndUpdate(
        { _id: req.params.id, workspaceId: existing.workspaceId },
        req.body,
        { returnDocument: "after" },
      );
    } else {
      // Creating a brand new automation — inject current user as owner
      req.body.workspaceId = req.user.id;
      automation = await Automation.create(req.body);
    }

    // Broadcast updated graph to everyone else editing this automation
    if (req.params.id && automation) {
      emitToCollabRoom(String(automation._id), "collab:graph_sync", {
        automationId: String(automation._id),
        nodes: automation.nodes,
        edges: automation.edges,
        savedBy: String(req.user.id),
      });
    }

    res.json({ success: true, automation });
  } catch (err) {
    console.error("SAVE ERROR:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
}
/**
 * ===============================
 * ACTIVATE AUTOMATION (HARD GATE)
 * ===============================
 */
export async function activateAutomation(req, res) {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!automation) throw new Error("Automation not found or access denied");

    if (!automation.entryNodeId) {
      throw new Error(
        "No trigger node found. Please save your workflow before activating.",
      );
    }

    validateAutomation(automation); // 🔒 Structural + logic validation

    const triggerEntries = automation.triggerNodes?.length
      ? automation.triggerNodes
      : [{ nodeId: automation.entryNodeId, type: automation.trigger }];

    const triggerTypesSeen = new Set();

    for (const entry of triggerEntries) {
      const triggerNode = automation.nodes.find((n) => n.id === entry.nodeId);
      if (!triggerNode) {
        throw new Error(
          "Trigger node not found. Please save your workflow and try again.",
        );
      }

      const trigger = entry.type;
      const cfg = getTriggerConfig(triggerNode);

      // Validate cron expression before going live — bad expressions silently never fire
      if (trigger === "cron_trigger") {
        const expr = cfg.schedule || cfg.customCron;
        if (!expr)
          throw new Error(
            "Cron trigger requires a schedule. Open the trigger node and set a cron expression.",
          );
        try {
          parseCron(expr);
        } catch {
          throw new Error(
            `Cron trigger has an invalid schedule expression: "${expr}". Please check your cron syntax.`,
          );
        }
      }

      // ── Auto-register external webhooks ────────────────────────────────────
      // Each external resource is keyed by (automationId, nodeId) so multiple
      // trigger nodes register and tear down independently.
      // Re-read node config after registration (register* saves the secret back).
      if (trigger === "github_trigger") {
        const repo = cfg.repo;
        const events = cfg.events || ["push"];
        if (!repo)
          throw new Error("GitHub trigger requires a repository (owner/repo).");
        const token = await resolveGitHubToken(
          cfg.tokenCredentialKey || cfg.githubToken,
          automation.workspaceId,
        );
        if (!token) throw new Error("GitHub trigger requires a connected GitHub account.");
        if (!cfg.webhookRegistered) {
          await registerGitHubWebhook(
            automation._id.toString(),
            repo,
            events,
            token,
            entry.nodeId,
          );
          // Re-fetch automation after registerGitHubWebhook saved the secret into it
          const refreshed = await Automation.findById(automation._id);
          if (refreshed) Object.assign(automation, refreshed.toObject());
        }
      }

      if (trigger === "stripe_trigger") {
        const apiKey = cfg.stripeKeyCredential;
        const events = cfg.events || ["payment_intent.succeeded"];
        if (!apiKey)
          throw new Error("Stripe trigger requires a Stripe secret key.");
        if (!cfg.webhookRegistered) {
          await registerStripeWebhook(
            automation._id.toString(),
            events,
            apiKey,
            entry.nodeId,
          );
          const refreshed = await Automation.findById(automation._id);
          if (refreshed) Object.assign(automation, refreshed.toObject());
        }
      }

      if (trigger === "telegram_trigger") {
        const credentialId = cfg.botToken;
        if (!credentialId)
          throw new Error("Telegram trigger requires a Bot Token credential. Open the trigger node and select your bot token.");
        // Telegram is polled via getUpdates, which Telegram rejects while a
        // webhook is set — clear any stale webhook so the poller can read.
        resolveCredential(credentialId, automation.workspaceId, "Telegram trigger")
          .then((cred) => {
            const token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
            return unregisterTelegramWebhook(token);
          })
          .catch((err) =>
            console.error(`[Telegram] Webhook clear failed for ${automation._id}/${entry.nodeId}:`, err.message)
          );
      }

      triggerTypesSeen.add(trigger);
    }

    automation.active = true;
    automation.status = "active";
    await automation.save();

    // Re-sync so the new automation is picked up immediately. The poller hub is the
    // single live worker for all polled triggers and iterates every trigger node;
    // cron runs on its own scheduler.
    if (triggerTypesSeen.has("cron_trigger")) syncCronJobs().catch(console.error);
    syncPollerHub().catch(console.error);

    res.json({ success: true, automation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * ===============================
 * DEACTIVATE AUTOMATION
 * ===============================
 */
export async function deactivateAutomation(req, res) {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!automation)
      return res
        .status(404)
        .json({ success: false, message: "Automation not found" });

    // Tear down every externally-registered webhook, keyed by (automationId, nodeId).
    const triggerEntries = automation.triggerNodes?.length
      ? automation.triggerNodes
      : [{ nodeId: automation.entryNodeId, type: automation.trigger }];

    for (const entry of triggerEntries) {
      const triggerNode = automation.nodes.find((n) => n.id === entry.nodeId);
      if (!triggerNode) continue;
      const cfg = getTriggerConfig(triggerNode);

      if (entry.type === "github_trigger" && cfg.githubWebhookId && cfg.repo) {
        const token = await resolveGitHubToken(
          cfg.tokenCredentialKey || cfg.githubToken,
          automation.workspaceId,
        ).catch(() => null);
        await unregisterGitHubWebhook(
          automation._id.toString(),
          cfg.repo,
          cfg.githubWebhookId,
          token,
          entry.nodeId,
        ).catch((e) => console.error("[GitHub] Teardown failed:", e.message));
      }

      if (entry.type === "stripe_trigger" && cfg.stripeWebhookId) {
        await unregisterStripeWebhook(
          automation._id.toString(),
          cfg.stripeWebhookId,
          cfg.stripeKeyCredential,
          entry.nodeId,
        ).catch((e) => console.error("[Stripe] Teardown failed:", e.message));
      }

      if (entry.type === "telegram_trigger") {
        const credentialId = cfg.botToken;
        if (credentialId) {
          resolveCredential(credentialId, automation.workspaceId, "Telegram trigger")
            .then((cred) => {
              const token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
              return unregisterTelegramWebhook(token);
            })
            .catch((e) => console.error("[Telegram] Teardown failed:", e.message));
        }
      }
    }

    // Re-fetch to capture config cleared by the unregister helpers, then deactivate.
    const fresh = await Automation.findById(automation._id);
    const target = fresh || automation;
    target.active = false;
    target.status = "draft";
    await target.save();

    // Re-sync so the deactivated automation drops out of the job sets.
    const triggerTypesSeen = new Set(triggerEntries.map((e) => e.type));
    if (triggerTypesSeen.has("cron_trigger")) syncCronJobs().catch(console.error);
    syncPollerHub().catch(console.error);

    res.json({ success: true, automation: target });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * ===============================
 * TRIGGER AUTOMATION (STEP 5)
 * ===============================
 * Idempotent. Safe. Crash-proof.
 */
export async function triggerAutomation(req, res) {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!automation) throw new Error("Automation not found or access denied");

    if (!automation.active) {
      throw new Error("Engine is paused or inactive.");
    }

    // Validate DAG before execution — reject cycles and malformed graphs
    validateAutomation({
      nodes: automation.nodes,
      edges: automation.edges.map((e) => ({
        source: e.source ?? e.from,
        target: e.target ?? e.to,
        id: e.id,
        targetHandle: e.targetHandle ?? null,
      })),
      entryNodeId: automation.entryNodeId,
    });

    const trigger = automation.trigger;

    // 🛡️ FIX 1: Extract the secure User ID from the authenticated token
    const workspaceId = req.user.id;

    const idempotencyKey =
      req.headers["x-idempotency-key"] ||
      req.body?.idempotencyKey ||
      crypto
        .createHash("sha256")
        .update(JSON.stringify(req.body || {}))
        .digest("hex");

    // Scope the lookup to this specific user's workspace
    let execution = await Execution.findOne({
      automationId: automation._id,
      trigger,
      idempotencyKey,
      workspaceId,
    });

    if (execution) {
      return res.json({ success: true, reused: true, execution });
    }

    // Create the execution record (handle race with duplicate key)
    try {
      execution = await Execution.create({
        automationId: automation._id,
        workspaceId: workspaceId,
        name: automation.name,
        trigger,
        idempotencyKey,
        status: "pending",
        cursors: [{ nodeId: automation.entryNodeId }],
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Duplicate key — another request won the race
        execution = await Execution.findOne({
          automationId: automation._id,
          idempotencyKey,
          workspaceId,
        });
        if (execution) {
          return res.json({ success: true, reused: true, execution });
        }
      }
      throw createErr;
    }

    const result = await executeAutomation(automation, req.body || {}, {
      executionId: execution._id,
      workspaceId: workspaceId,
      idempotencyKey: idempotencyKey,
    });

    res.json({ success: true, reused: false, execution: result });
  } catch (err) {
    if (err.message !== "Engine is paused or inactive.") {
      console.error("Trigger error:", err.message);
    }
    res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * ===============================
 * DELETE AUTOMATION
 * ===============================
 */
export async function deleteAutomation(req, res) {
  try {
    const automation = await Automation.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!automation) {
      return res
        .status(404)
        .json({ success: false, message: "Not found or access denied" });
    }

    // Clean up external webhook registrations on delete, per trigger node.
    const triggerEntries = automation.triggerNodes?.length
      ? automation.triggerNodes
      : [{ nodeId: automation.entryNodeId, type: automation.trigger }];

    for (const entry of triggerEntries) {
      const triggerNode = automation.nodes.find((n) => n.id === entry.nodeId);
      if (!triggerNode) continue;
      const cfg = getTriggerConfig(triggerNode);

      if (entry.type === "github_trigger" && cfg.githubWebhookId && cfg.repo) {
        resolveGitHubToken(
          cfg.tokenCredentialKey || cfg.githubToken,
          automation.workspaceId,
        )
          .catch(() => null)
          .then((token) =>
            unregisterGitHubWebhook(
              automation._id.toString(),
              cfg.repo,
              cfg.githubWebhookId,
              token,
              entry.nodeId,
            ),
          )
          .catch((e) => console.error("[GitHub] Cleanup failed:", e.message));
      }
      if (entry.type === "stripe_trigger" && cfg.stripeWebhookId) {
        unregisterStripeWebhook(
          automation._id.toString(),
          cfg.stripeWebhookId,
          cfg.stripeKeyCredential,
          entry.nodeId,
        ).catch((e) => console.error("[Stripe] Cleanup failed:", e.message));
      }
    }

    await Execution.deleteMany({
      automationId: req.params.id,
      workspaceId: req.user.id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete." });
  }
}

/**
 * ===============================
 * DUPLICATE AUTOMATION
 * ===============================
 */
export async function duplicateAutomation(req, res) {
  try {
    const source = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!source) {
      return res
        .status(404)
        .json({ success: false, message: "Not found or access denied" });
    }
    const copy = source.toObject();
    delete copy._id;
    delete copy.__v;
    copy.name = `${copy.name} (copy)`;
    copy.status = "draft";
    copy.active = false;
    copy.createdAt = undefined;
    copy.updatedAt = undefined;
    const automation = await Automation.create(copy);
    res.json({ success: true, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to duplicate." });
  }
}

/**
 * ===============================
 * RENAME AUTOMATION
 * ===============================
 */
export async function renameAutomation(req, res) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    if (name.trim().length > 200) {
      return res.status(400).json({ success: false, message: "Name must be under 200 characters." });
    }
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.id },
      { name: name.trim() },
      { returnDocument: "after" },
    );
    if (!automation) {
      return res
        .status(404)
        .json({ success: false, message: "Not found or access denied" });
    }
    res.json({ success: true, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to rename." });
  }
}

/**
 * ===============================
 * SAVE THUMBNAIL
 * ===============================
 */
export async function saveThumbnail(req, res) {
  try {
    const { thumbnail } = req.body;
    if (!thumbnail || typeof thumbnail !== 'string') {
      return res.status(400).json({ success: false, message: 'thumbnail required' });
    }
    if (thumbnail.length > 500_000) {
      return res.status(413).json({ success: false, message: 'Thumbnail too large' });
    }
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.id },
      { thumbnail },
      { returnDocument: 'after', select: '_id thumbnail' },
    );
    if (!automation) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save thumbnail' });
  }
}

/**
 * ===============================
 * GET SINGLE AUTOMATION (WORKSPACE)
 * ===============================
 */
export async function getAutomation(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized." });
    const automation = await Automation.findOne({
      _id: req.params.id,
      $or: [
        { workspaceId: req.user.id },
        { "collaborators.userId": String(req.user.id) },
      ],
    });
    if (!automation) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load workflow." });
  }
}

/**
 * ===============================
 * GET ALL AUTOMATIONS (DASHBOARD)
 * ===============================
 */
export async function getAutomations(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Return automations the user owns OR has accepted collaboration on
    const filter = {
      $or: [
        { workspaceId: req.user.id },
        { "collaborators.userId": String(req.user.id) },
      ],
    };

    const [automations, total] = await Promise.all([
      Automation.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $addFields: {
          nodeCount: { $size: { $ifNull: ['$nodes', []] } },
          preview: {
            nodes: { $map: { input: { $ifNull: ['$nodes', []] }, as: 'n', in: { id: '$$n.id', type: '$$n.type', x: '$$n.position.x', y: '$$n.position.y' } } },
            edges: { $map: { input: { $ifNull: ['$edges', []] }, as: 'e', in: { s: '$$e.source', t: '$$e.target' } } },
          },
        }},
        { $project: { nodes: 0, edges: 0 } },
      ]),
      Automation.countDocuments(filter),
    ]);

    res.json({
      success: true,
      automations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to load workflows." });
  }
}
