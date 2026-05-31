import { Router } from "express";
import express from "express";
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

// Webhook must receive raw body — register before any JSON middleware
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

router.get("/usage",       verifyToken, getUsage);
router.get("/history",     verifyToken, getHistory);
router.post("/checkout",   verifyToken, createCheckoutSession);
router.post("/portal",     verifyToken, createPortalSession);
router.get("/cost/:nodeType", verifyToken, getNodeCostEndpoint);

export default router;
