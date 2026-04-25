import express from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { brianChat } from "./brian.controller.js";

const router = express.Router();

router.post("/chat", verifyToken, brianChat);

export default router;
