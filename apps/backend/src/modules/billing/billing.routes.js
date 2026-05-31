import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  getUsage,
  getHistory,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  getNodeCostEndpoint,
} from "./billing.controller.js";

const router = Router();

// Raw body is captured globally via express.json verify callback (req.rawBody)
router.post("/webhook", handleWebhook);

router.get("/usage",       verifyToken, getUsage);
router.get("/history",     verifyToken, getHistory);
router.post("/checkout",   verifyToken, createCheckoutSession);
router.post("/portal",     verifyToken, createPortalSession);
router.get("/cost/:nodeType", verifyToken, getNodeCostEndpoint);

export default router;
