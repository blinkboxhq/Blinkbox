import { Router } from "express";
import {
  startExecution,
  getExecutionById,
  listExecutions,
  resumeExecution,
  cancelExecution,
} from "./execution.controller.js";

const router = Router();

router.post("/start/:automationId", startExecution);
router.get("/:executionId", getExecutionById);
router.get("/automation/:automationId", listExecutions);
router.post("/resume/:executionId", resumeExecution);
router.post("/cancel/:executionId", cancelExecution);

export default router; // ✅ THIS LINE MUST EXIST
