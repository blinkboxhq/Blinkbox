import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  startExecution,
  getExecutionById,
  listExecutions,
  resumeExecution,
  cancelExecution,
} from "./execution.controller.js";

const router = Router();

router.post("/start/:automationId", verifyToken, startExecution);
router.get("/:executionId", verifyToken, getExecutionById);
router.get("/automation/:automationId", verifyToken, listExecutions);
router.post("/resume/:executionId", verifyToken, resumeExecution);
router.post("/cancel/:executionId", verifyToken, cancelExecution);

export default router;
