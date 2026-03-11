import crypto from "crypto";
import Automation from "../../../models/automation.model.js";
import Execution from "../../../models/execution.model.js";
import { validateAutomation } from "./automation.validator.js";
import { executeAutomation } from "../automation.executor.js";

/**
 * ===============================
 * CREATE / UPDATE AUTOMATION
 * ===============================
 */
export async function saveAutomation(req, res) {
  try {
    let automation;

    // 🛡️ THE FIX: Inject the secure user ID into the data payload before saving
    // (Assuming your auth middleware attaches the user to req.user)
    if (req.user && req.user.id) {
      req.body.workspaceId = req.user.id;
    }

    // If an ID is passed in the params, update the existing one
    if (req.params.id) {
      automation = await Automation.findOneAndUpdate(
        { _id: req.params.id, workspaceId: req.user.id },
        req.body,
        { new: true },
      );
      if (!automation) throw new Error("Automation not found or access denied");
    }
    // Otherwise, create a brand new one!
    else {
      automation = await Automation.create(req.body);
    }

    res.json({ success: true, automation });
  } catch (err) {
    // 🚨 This will print the EXACT reason it failed in your backend terminal!
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

    validateAutomation(automation); // 🔒 Structural + logic validation

    automation.status = "active";
    await automation.save();

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
    console.error("Trigger error:", err.message);
    res.status(400).json({ success: false, message: "Failed to trigger automation" });
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
      return res.status(404).json({ success: false, message: "Not found or access denied" });
    }
    await Execution.deleteMany({ automationId: req.params.id, workspaceId: req.user.id });
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
      return res.status(404).json({ success: false, message: "Not found or access denied" });
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
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.id },
      { name: name.trim() },
      { new: true },
    );
    if (!automation) {
      return res.status(404).json({ success: false, message: "Not found or access denied" });
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
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized." });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { workspaceId: req.user.id };

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
    res.status(500).json({ success: false, message: "Failed to load workflows." });
  }
}
