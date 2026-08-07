import { Router } from "express";
import { verifyToken, requireAdmin } from "../auth/auth.middleware.js";
import {
  getUsage,
  getHistory,
  getCatalog,
  createCheckoutSession,
  createCreditCheckout,
  createPortalSession,
  updateAutoRecharge,
  handleWebhook,
  getNodeCostEndpoint,
} from "./billing.controller.js";
import {
  createGiftCards,
  listGiftCards,
  voidGiftCard,
  peekGiftCardEndpoint,
  redeemGiftCardEndpoint,
} from "./giftcard.controller.js";

const router = Router();

// Raw body is captured globally via express.json verify callback (req.rawBody)
router.post("/webhook", handleWebhook);

router.get("/usage",       verifyToken, getUsage);
router.get("/history",     verifyToken, getHistory);
router.get("/catalog",     verifyToken, getCatalog);
router.post("/checkout",   verifyToken, createCheckoutSession);
router.post("/credits",    verifyToken, createCreditCheckout);
router.post("/portal",     verifyToken, createPortalSession);
router.put("/auto-recharge", verifyToken, updateAutoRecharge);
router.get("/cost/:nodeType", verifyToken, getNodeCostEndpoint);

router.post("/gift-cards/redeem", verifyToken, redeemGiftCardEndpoint);
router.get("/gift-cards/peek",    verifyToken, peekGiftCardEndpoint);
router.post("/gift-cards",        verifyToken, requireAdmin, createGiftCards);
router.get("/gift-cards",         verifyToken, requireAdmin, listGiftCards);
router.delete("/gift-cards/:id",  verifyToken, requireAdmin, voidGiftCard);

export default router;
