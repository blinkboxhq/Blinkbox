import express from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { redis } from "../../infra/redis.client.js";
import {
  sendInvite,
  listMyInvites,
  listSentInvites,
  acceptInvite,
  rejectInvite,
  cancelInvite,
} from "./invite.controller.js";

const router = express.Router();

async function inviteRateLimit(req, res, next) {
  try {
    const key = `bb:rl:invite:${req.user.id}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600);
    if (count > 20) return res.status(429).json({ message: "Too many invites sent. Try again in an hour." });
  } catch { /* Redis down — fail open */ }
  next();
}

// Recipient: see my pending invites
router.get("/", verifyToken, listMyInvites);

// Sender: send an invite
router.post("/", verifyToken, inviteRateLimit, sendInvite);

// Sender: see invites sent for one automation
router.get("/sent/:automationId", verifyToken, listSentInvites);

// Recipient: accept / reject
router.post("/:id/accept", verifyToken, acceptInvite);
router.post("/:id/reject", verifyToken, rejectInvite);

// Sender: cancel / withdraw
router.delete("/:id", verifyToken, cancelInvite);

export default router;
