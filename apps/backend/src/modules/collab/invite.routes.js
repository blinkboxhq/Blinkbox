import express from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  sendInvite,
  listMyInvites,
  listSentInvites,
  acceptInvite,
  rejectInvite,
  cancelInvite,
} from "./invite.controller.js";

const router = express.Router();

// Recipient: see my pending invites
router.get("/", verifyToken, listMyInvites);

// Sender: send an invite
router.post("/", verifyToken, sendInvite);

// Sender: see invites sent for one automation
router.get("/sent/:automationId", verifyToken, listSentInvites);

// Recipient: accept / reject
router.post("/:id/accept", verifyToken, acceptInvite);
router.post("/:id/reject", verifyToken, rejectInvite);

// Sender: cancel / withdraw
router.delete("/:id", verifyToken, cancelInvite);

export default router;
