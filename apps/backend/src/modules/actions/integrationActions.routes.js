import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  listActions,
  defaultOperation,
  isKnownIntegration,
} from "../../nodes/integrationManifest.js";

const router = Router();

// GET /api/integrations/:type/actions — every operation an app exposes,
// used by the agent-tool action checklist on the node config panel.
router.get("/:type/actions", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    if (!/^[a-z0-9_]+$/.test(type) || !isKnownIntegration(type)) {
      return res.status(404).json({ message: "Unknown integration." });
    }
    const [actions, defaultOp] = await Promise.all([listActions(type), defaultOperation(type)]);
    res.json({ type, defaultOperation: defaultOp, actions });
  } catch (err) {
    console.error("[IntegrationActions] Route error:", err.message);
    res.status(500).json({ message: "Failed to load integration actions." });
  }
});

export default router;
