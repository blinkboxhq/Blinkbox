import crypto from "crypto";
import Automation from "../../../models/automation.model.js";
import Execution from "../../../models/execution.model.js";
import { validateAutomation } from "./automation.validator.js";
import { executeAutomation } from "./automation.executor.js";

/**
 * ===============================
 * CREATE / UPDATE AUTOMATION
 * ===============================
 */
export async function saveAutomation(req, res) {
  try {
    const automation = await Automation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, upsert: true },
    );

    res.json({ success: true, automation });
  } catch (err) {
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
    const automation = await Automation.findById(req.params.id);
    if (!automation) throw new Error("Automation not found");

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
    const automation = await Automation.findById(req.params.id);
    if (!automation) throw new Error("Automation not found");

    if (automation.status !== "active") {
      throw new Error("Automation is not active");
    }

    const trigger = automation.trigger;

    // 1️⃣ Resolve idempotency key
    const idempotencyKey =
      req.headers["x-idempotency-key"] ||
      req.body?.idempotencyKey ||
      crypto
        .createHash("sha256")
        .update(JSON.stringify(req.body || {}))
        .digest("hex");

    // 2️⃣ Atomic find-or-create execution
    let execution = await Execution.findOne({
      automationId: automation._id,
      trigger,
      idempotencyKey,
    });

    if (execution) {
      // 🔁 Safe re-trigger (return existing execution)
      return res.json({
        success: true,
        reused: true,
        execution,
      });
    }

    execution = await Execution.create({
      automationId: automation._id,
      name: automation.name,
      trigger,
      idempotencyKey,
      status: "pending",
      context: req.body || {},
      cursors: [{ nodeId: automation.entryNodeId }],
    });

    // 3️⃣ Execute (engine handles resume / waits)
    const result = await executeAutomation(
      automation,
      execution.context,
      execution._id,
    );

    res.json({
      success: true,
      reused: false,
      execution: result,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}
