import express from "express";
import { getProfile, updateProfile, changePassword } from "./profile.controller.js";
import { startTwoFactor, enableTwoFactor, disableTwoFactor } from "./twofactor.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getProfile);
router.put("/", verifyToken, updateProfile);
router.post("/change-password", verifyToken, changePassword);

router.post("/2fa/start", verifyToken, startTwoFactor);
router.post("/2fa/enable", verifyToken, enableTwoFactor);
router.post("/2fa/disable", verifyToken, disableTwoFactor);

export default router;
