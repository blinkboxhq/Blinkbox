import express from "express";
import { getProfile, updateProfile } from "./profile.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getProfile);
router.put("/", verifyToken, updateProfile);

export default router;
