import express from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { chatMessage, clearSession } from "./chat.controller.js";
import { chatRun } from "./chatRun.controller.js";

const router = express.Router();

const bigJson = express.json({ limit: "25mb" });

router.post("/message", verifyToken, bigJson, chatMessage);
router.post("/clear", verifyToken, clearSession);
router.post("/run/:automationId", verifyToken, bigJson, chatRun);

export default router;
