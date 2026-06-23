import express from "express";
import { getProfile, updateProfile, changePassword } from "./profile.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getProfile);
router.put("/", verifyToken, updateProfile);
router.post("/change-password", verifyToken, changePassword);

export default router;
