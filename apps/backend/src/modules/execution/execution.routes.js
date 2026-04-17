import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  startExecution,
  getExecutionById,
  listExecutions,
  resumeExecution,
  cancelExecution,
  retryExecution,
  getExecutionLogs,
} from "./execution.controller.js";

const router = Router();

router.post("/start/:automationId", verifyToken, startExecution);
router.get("/:executionId", verifyToken, getExecutionById);
router.get("/automation/:automationId", verifyToken, listExecutions);
router.post("/resume/:executionId", verifyToken, resumeExecution);
router.post("/cancel/:executionId", verifyToken, cancelExecution);
router.post("/retry/:executionId", verifyToken, retryExecution);
router.get("/:executionId/logs", verifyToken, getExecutionLogs);

export default router;
