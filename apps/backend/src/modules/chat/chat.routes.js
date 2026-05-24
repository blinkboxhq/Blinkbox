import express from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { chatMessage, clearSession } from "./chat.controller.js";

const router = express.Router();

// Larger payload limit for file uploads (base64-encoded)
const bigJson = express.json({ limit: "25mb" });

router.post("/message", verifyToken, bigJson, chatMessage);
router.post("/clear", verifyToken, clearSession);

export default router;
