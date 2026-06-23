import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import Automation from "../../models/automation.model.js";
import AutomationVersion from "../../models/automationVersion.model.js";

const router = Router({ mergeParams: true });

// GET /api/automation/:id/versions
router.get("/", verifyToken, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!automation) return res.status(404).json({ success: false, error: "Not found" });

    const versions = await AutomationVersion.find({ automationId: req.params.id })
      .sort({ version: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, versions });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to load versions" });
  }
});

// POST /api/automation/:id/versions/:versionId/restore
router.post("/:versionId/restore", verifyToken, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });
    if (!automation) return res.status(404).json({ success: false, error: "Not found" });

    const version = await AutomationVersion.findOne({
      _id: req.params.versionId,
      automationId: req.params.id,
    });
    if (!version) return res.status(404).json({ success: false, error: "Version not found" });

    // Snapshot the current state before restoring
    await _snapshotAutomation(automation, req.user.id, "Before restore");

    automation.nodes = version.nodes;
    automation.edges = version.edges;
    automation.entryNodeId = version.entryNodeId;
    await automation.save();

    res.json({ success: true, automation });
  } catch (err) {
    res.status(500).json({ success: false, error: "Restore failed" });
  }
});

export async function snapshotBeforeSave(automation, workspaceId) {
  try {
    const lastVersion = await AutomationVersion.findOne(
      { automationId: automation._id },
      { version: 1 },
      { sort: { version: -1 } },
    );
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Cap at 50 versions — prune oldest if needed
    const count = await AutomationVersion.countDocuments({ automationId: automation._id });
    if (count >= 50) {
      const oldest = await AutomationVersion.find({ automationId: automation._id })
        .sort({ version: 1 })
        .limit(count - 49)
        .select("_id")
        .lean();
      await AutomationVersion.deleteMany({ _id: { $in: oldest.map((v) => v._id) } });
    }

    await AutomationVersion.create({
      automationId: automation._id,
      workspaceId,
      version: nextVersion,
      name: automation.name,
      nodes: automation.nodes,
      edges: automation.edges,
      entryNodeId: automation.entryNodeId,
    });
  } catch {
    // Never block a save due to versioning failure
  }
}

async function _snapshotAutomation(automation, workspaceId, description = "") {
  await snapshotBeforeSave(automation, workspaceId);
}

export default router;
