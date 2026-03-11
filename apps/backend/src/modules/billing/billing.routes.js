import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  getUsage,
  getHistory,
  upgradePlan,
  getNodeCostEndpoint,
} from "./billing.controller.js";

const router = Router();

router.get("/usage", verifyToken, getUsage);
router.get("/history", verifyToken, getHistory);
router.post("/upgrade", verifyToken, upgradePlan);
router.get("/cost/:nodeType", verifyToken, getNodeCostEndpoint);

export default router;
