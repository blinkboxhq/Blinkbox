import express from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { brianChat, brianChatStream } from "./brian.controller.js";
import { redis } from "../../infra/redis.client.js";

const router = express.Router();

async function brianRateLimit(req, res, next) {
  try {
    const key   = `bb:rl:brian:${req.user.id}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600);
    if (count > 60) return res.status(429).json({ message: "Rate limit reached. Try again in an hour." });
  } catch { /* Redis down — fail open */ }
  next();
}

router.post("/chat",        verifyToken, brianRateLimit, brianChat);
router.post("/chat/stream", verifyToken, brianRateLimit, brianChatStream);

export default router;
