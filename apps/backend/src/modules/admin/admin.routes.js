import { Router } from "express";
import { toggleKillSwitch, getBunkerStats } from "./admin.controller.js";
import { verifyToken, requireAdmin } from "../auth/auth.middleware.js";

const router = Router();

router.get("/stats", verifyToken, requireAdmin, getBunkerStats);
router.post("/kill-switch", verifyToken, requireAdmin, toggleKillSwitch);

export default router;
