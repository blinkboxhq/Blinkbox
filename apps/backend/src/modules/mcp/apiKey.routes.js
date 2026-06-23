import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { createApiKey, listApiKeys, revokeApiKey } from "./apiKey.controller.js";

const router = Router();

router.post("/", verifyToken, createApiKey);
router.get("/", verifyToken, listApiKeys);
router.delete("/:id", verifyToken, revokeApiKey);

export default router;
