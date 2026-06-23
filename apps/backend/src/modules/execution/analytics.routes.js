import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import Automation from "../../models/automation.model.js";
import {
  workspaceOverview,
  automationHistory,
  nodeStats,
  dailyRunCounts,
} from "./analytics.service.js";

const router = Router();

router.get("/overview", verifyToken, async (req, res) => {
  try {
    const workspaceId = req.user.id;
    const days = Math.min(Number(req.query.days) || 7, 90);
    const data = await workspaceOverview(workspaceId, days);
    res.json(data);
  } catch (err) {
    console.error("[Analytics] overview error:", err.message);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

router.get("/daily", verifyToken, async (req, res) => {
  try {
    const workspaceId = req.user.id;
    const days = Math.min(Number(req.query.days) || 7, 90);
    const data = await dailyRunCounts(workspaceId, days);
    res.json(data);
  } catch (err) {
    console.error("[Analytics] daily error:", err.message);
    res.status(500).json({ error: "Failed to load daily stats" });
  }
});

router.get("/automation/:id/history", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const owns = await Automation.exists({ _id: id, workspaceId: req.user.id });
    if (!owns) return res.status(404).json({ error: "Not found" });
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const data = await automationHistory(id, limit);
    res.json(data);
  } catch (err) {
    console.error("[Analytics] history error:", err.message);
    res.status(500).json({ error: "Failed to load history" });
  }
});

router.get("/automation/:id/node-stats", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const owns = await Automation.exists({ _id: id, workspaceId: req.user.id });
    if (!owns) return res.status(404).json({ error: "Not found" });
    const data = await nodeStats(id);
    res.json(data);
  } catch (err) {
    console.error("[Analytics] node-stats error:", err.message);
    res.status(500).json({ error: "Failed to load node stats" });
  }
});

export default router;
