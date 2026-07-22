import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  listActions,
  defaultOperation,
  isKnownIntegration,
} from "../../nodes/integrationManifest.js";
import { listResourceKinds, fetchResource } from "../../nodes/integrationResources.js";

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
    res.json({ type, defaultOperation: defaultOp, actions, resources: listResourceKinds(type) });
  } catch (err) {
    console.error("[IntegrationActions] Route error:", err.message);
    res.status(500).json({ message: "Failed to load integration actions." });
  }
});

// GET /api/integrations/:type/resources/:kind?credentialId= — live IDs (Slack
// channels, …) the agent must be handed; an LLM cannot guess them.
router.get("/:type/resources/:kind", verifyToken, async (req, res) => {
  try {
    const { type, kind } = req.params;
    const { credentialId } = req.query;
    if (!/^[a-z0-9_]+$/.test(type) || !isKnownIntegration(type)) {
      return res.status(404).json({ message: "Unknown integration." });
    }
    if (!/^[a-f0-9]{24}$/i.test(String(credentialId || ""))) {
      return res.status(400).json({ message: "A credential is required to list this." });
    }
    const { options, error } = await fetchResource(type, kind, credentialId, req.user.id);
    if (error) return res.status(400).json({ message: error, options: [] });
    res.json({ type, kind, options });
  } catch (err) {
    console.error("[IntegrationResources] Route error:", err.message);
    res.status(500).json({ message: "Failed to list from this integration." });
  }
});

export default router;
