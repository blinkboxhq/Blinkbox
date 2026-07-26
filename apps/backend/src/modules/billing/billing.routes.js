import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  getUsage,
  getHistory,
  getCatalog,
  createCheckoutSession,
  createCreditCheckout,
  createPortalSession,
  handleWebhook,
  getNodeCostEndpoint,
} from "./billing.controller.js";

const router = Router();

// Raw body is captured globally via express.json verify callback (req.rawBody)
router.post("/webhook", handleWebhook);

router.get("/usage",       verifyToken, getUsage);
router.get("/history",     verifyToken, getHistory);
router.get("/catalog",     verifyToken, getCatalog);
router.post("/checkout",   verifyToken, createCheckoutSession);
router.post("/credits",    verifyToken, createCreditCheckout);
router.post("/portal",     verifyToken, createPortalSession);
router.get("/cost/:nodeType", verifyToken, getNodeCostEndpoint);

export default router;
