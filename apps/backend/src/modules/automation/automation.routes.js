import express from "express";
import {
  saveAutomation,
  activateAutomation,
  deactivateAutomation,
  triggerAutomation,
  getAutomation,
  getAutomations,
  deleteAutomation,
  duplicateAutomation,
  renameAutomation,
  saveThumbnail,
} from "./engine/automation.controller.js";
import { parseWorkflowBody } from "./engine/automation.validator.js";
import { verifyToken } from "../auth/auth.middleware.js";
import versionRouter from "./version.routes.js";
import { listCollaborators, addCollaborator, removeCollaborator } from "./collaborator.controller.js";
import { testNode } from "./engine/testNode.controller.js";
import { redis } from "../../infra/redis.client.js";
import { listModels as listOpenAIModels } from "../../nodes/integrations/openai.node.js";
import { listModels as listAnthropicModels } from "../../nodes/integrations/anthropic.node.js";
import { listModels as listGeminiModels } from "../../nodes/integrations/gemini.node.js";
import { listModels as listPerplexityModels } from "../../nodes/integrations/perplexity.node.js";
import { listModels as listXAIModels } from "../../nodes/integrations/xai.node.js";

const router = express.Router();

const MODEL_PROVIDERS = { openai: listOpenAIModels, anthropic: listAnthropicModels, gemini: listGeminiModels, perplexity: listPerplexityModels, xai: listXAIModels };

async function modelListRateLimit(req, res, next) {
  try {
    const key = `bb:rl:models:${req.user.id}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    if (count > 20) return res.status(429).json({ error: "Too many model refreshes. Try again in a minute." });
  } catch { /* Redis down — fail open */ }
  next();
}

async function listProviderModels(req, res) {
  const provider = String(req.params.provider || "").toLowerCase();
  const fetcher = MODEL_PROVIDERS[provider];
  if (!fetcher) return res.status(404).json({ error: `No live model list for provider "${provider}".` });
  const { credentialId } = req.query;
  if (!credentialId) return res.status(400).json({ error: "credentialId is required." });
  try {
    const models = await fetcher(credentialId, req.user.id);
    res.json({ provider, models });
  } catch (e) {
    res.status(502).json({ error: `Could not fetch models — ${e.message}` });
  }
}

async function testNodeRateLimit(req, res, next) {
  try {
    const key = `bb:rl:testnode:${req.user.id}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    if (count > 30) return res.status(429).json({ error: "Too many test runs. Try again in a minute." });
  } catch { /* Redis down — fail open */ }
  next();
}

router.post("/test-node", verifyToken, testNodeRateLimit, testNode);
router.get("/models/:provider", verifyToken, modelListRateLimit, listProviderModels);
router.get("/", verifyToken, getAutomations);
router.get("/:id", verifyToken, getAutomation);
router.post("/", verifyToken, parseWorkflowBody, saveAutomation);
router.put("/:id", verifyToken, parseWorkflowBody, saveAutomation);
router.delete("/:id", verifyToken, deleteAutomation);
router.post("/:id/duplicate", verifyToken, duplicateAutomation);
router.patch("/:id/rename", verifyToken, renameAutomation);
router.patch("/:id/thumbnail", verifyToken, saveThumbnail);
router.post("/:id/activate", verifyToken, activateAutomation);
router.post("/:id/deactivate", verifyToken, deactivateAutomation);
router.post("/:id/execute", verifyToken, triggerAutomation);
router.use("/:id/versions", versionRouter);

// Collaborator management (owner only)
router.get("/:id/collaborators", verifyToken, listCollaborators);
router.post("/:id/collaborators", verifyToken, addCollaborator);
router.delete("/:id/collaborators/:userId", verifyToken, removeCollaborator);

export default router;
