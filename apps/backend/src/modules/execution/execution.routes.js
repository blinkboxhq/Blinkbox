import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  startExecution,
  getExecutionById,
  listExecutions,
  listRecentExecutions,
  resumeExecution,
  cancelExecution,
  retryExecution,
  getExecutionLogs,
  getAnalytics,
} from "./execution.controller.js";

const router = Router();

router.get("/analytics", verifyToken, getAnalytics);
router.get("/recent", verifyToken, listRecentExecutions);
router.post("/start/:automationId", verifyToken, startExecution);
router.get("/:executionId", verifyToken, getExecutionById);
router.get("/automation/:automationId", verifyToken, listExecutions);
router.post("/resume/:executionId", verifyToken, resumeExecution);
router.post("/cancel/:executionId", verifyToken, cancelExecution);
router.post("/retry/:executionId", verifyToken, retryExecution);
router.get("/:executionId/logs", verifyToken, getExecutionLogs);

export default router;
