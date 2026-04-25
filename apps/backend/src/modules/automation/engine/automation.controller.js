import crypto from "crypto";
import cronParser from "cron-parser";
const { parseExpression: parseCron } = cronParser;
import Automation from "../../../models/automation.model.js";
import Execution from "../../../models/execution.model.js";
import { validateAutomation } from "./automation.validator.js";
import { executeAutomation } from "../automation.executor.js";
import { syncCronJobs } from "../../../infra/cron.scheduler.js";
import { syncRssJobs } from "../../../infra/rss.poller.js";
import { syncImapJobs } from "../../../infra/imap.poller.js";
import { syncDbJobs } from "../../../infra/db.poller.js";
import { syncGmailJobs } from "../../../infra/gmail.poller.js";
import { syncAirtableJobs } from "../../../infra/airtable.poller.js";
import { syncNotionJobs } from "../../../infra/notion.poller.js";
import { syncHubSpotJobs } from "../../../infra/hubspot.poller.js";
import { syncYouTubeJobs } from "../../../infra/youtube.poller.js";
import { syncPriceAlertJobs } from "../../../infra/priceAlert.poller.js";
import { syncRedditJobs } from "../../../infra/reddit.poller.js";
import { syncGoogleCalendarJobs } from "../../../infra/googleCalendar.poller.js";
import { syncGitHubIssueJobs } from "../../../infra/githubIssue.poller.js";
import {
  registerGitHubWebhook,
  unregisterGitHubWebhook,
} from "../../../infra/github.webhook.js";
import {
  registerStripeWebhook,
  unregisterStripeWebhook,
} from "../../../infra/stripe.webhook.js";
import {
  registerTelegramWebhook,
  unregisterTelegramWebhook,
} from "../../../infra/telegram.webhook.js";
import { snapshotBeforeSave } from "../version.routes.js";

/**
 * ===============================
 * CREATE / UPDATE AUTOMATION
 * ===============================
 */
export async function saveAutomation(req, res) {
  try {
    let automation;

    // Never let a save overwrite activation state
    delete req.body.active;
    delete req.body.status;

    if (req.params.id) {
      // Updating an existing automation —
      // allow owner OR an editor-role collaborator to save.
      // Do NOT overwrite workspaceId (ownership stays with original creator).
      delete req.body.workspaceId;

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
        { _id: req.params.id },
        req.body,
        { returnDocument: "after" },
      );
    } else {
      // Creating a brand new automation — inject current user as owner
      req.body.workspaceId = req.user.id;
      automation = await Automation.create(req.body);
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
    const entryNode = automation.nodes.find(
      (n) => n.id === automation.entryNodeId,
    );
    if (!entryNode) {
      throw new Error(
        "Trigger node not found. Please save your workflow and try again.",
      );
    }

    validateAutomation(automation); // 🔒 Structural + logic validation

    const trigger = automation.trigger;
    const cfg = entryNode.data || {};

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

    // ── Auto-register external webhooks ──────────────────────────────────────
    // Re-read entry node config after potential webhook registration
    // (registerGitHubWebhook / registerStripeWebhook save the secret back into the doc)
    if (trigger === "github_trigger") {
      const token = cfg.tokenCredentialKey || cfg.githubToken;
      const repo = cfg.repo;
      const events = cfg.events || ["push"];
      if (!repo)
        throw new Error("GitHub trigger requires a repository (owner/repo).");
      if (!token) throw new Error("GitHub trigger requires a GitHub token.");
      if (!cfg.webhookRegistered) {
        await registerGitHubWebhook(
          automation._id.toString(),
          repo,
          events,
          token,
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
        await registerStripeWebhook(automation._id.toString(), events, apiKey);
        const refreshed = await Automation.findById(automation._id);
        if (refreshed) Object.assign(automation, refreshed.toObject());
      }
    }

    if (trigger === "telegram_trigger") {
      const botToken = cfg.botToken;
      if (!botToken)
        throw new Error("Telegram trigger requires a Bot Token. Open the trigger node and paste your bot token.");
      // Non-blocking — activation succeeds even if Telegram's API is temporarily unreachable
      registerTelegramWebhook(automation._id.toString(), botToken).catch((err) =>
        console.error(`[Telegram] Webhook registration failed for ${automation._id}:`, err.message)
      );
    }

    automation.active = true;
    automation.status = "active";
    await automation.save();

    // Re-sync pollers so the new automation is picked up immediately
    if (trigger === "cron_trigger") syncCronJobs().catch(console.error);
    if (trigger === "rss_trigger") syncRssJobs().catch(console.error);
    if (trigger === "imap_trigger") syncImapJobs().catch(console.error);
    if (trigger === "db_trigger") syncDbJobs().catch(console.error);
    if (trigger === "gmail_trigger") syncGmailJobs().catch(console.error);
    if (trigger === "airtable_trigger") syncAirtableJobs().catch(console.error);
    if (trigger === "notion_trigger") syncNotionJobs().catch(console.error);
    if (trigger === "hubspot_trigger") syncHubSpotJobs().catch(console.error);
    if (trigger === "youtube_trigger") syncYouTubeJobs().catch(console.error);
    if (trigger === "price_alert_trigger")
      syncPriceAlertJobs().catch(console.error);
    if (trigger === "reddit_trigger") syncRedditJobs().catch(console.error);
    if (trigger === "google_calendar_trigger")
      syncGoogleCalendarJobs().catch(console.error);
    if (trigger === "github_issue_trigger")
      syncGitHubIssueJobs().catch(console.error);

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
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.id },
      { active: false, status: "draft" },
      { new: true },
    );
    if (!automation)
      return res
        .status(404)
        .json({ success: false, message: "Automation not found" });
    res.json({ success: true, automation });
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

    // Clean up external webhook registrations on delete
    const entryNode = automation.nodes.find(
      (n) => n.id === automation.entryNodeId,
    );
    const cfg = entryNode?.data?.config || {};
    if (
      automation.trigger === "github_trigger" &&
      cfg.githubWebhookId &&
      cfg.repo
    ) {
      unregisterGitHubWebhook(
        automation._id.toString(),
        cfg.repo,
        cfg.githubWebhookId,
        cfg.tokenCredentialKey || cfg.githubToken,
      ).catch((e) => console.error("[GitHub] Cleanup failed:", e.message));
    }
    if (automation.trigger === "stripe_trigger" && cfg.stripeWebhookId) {
      unregisterStripeWebhook(
        automation._id.toString(),
        cfg.stripeWebhookId,
        cfg.stripeKeyCredential,
      ).catch((e) => console.error("[Stripe] Cleanup failed:", e.message));
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
      return res
        .status(400)
        .json({ success: false, message: "Name is required." });
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
      Automation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
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
