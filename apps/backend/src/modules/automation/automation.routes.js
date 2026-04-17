import express from "express";
import {
  saveAutomation,
  activateAutomation,
  triggerAutomation,
  getAutomations,
  deleteAutomation,
  duplicateAutomation,
  renameAutomation,
} from "./engine/automation.controller.js";
import { parseWorkflowBody } from "./engine/automation.validator.js";
import { verifyToken } from "../auth/auth.middleware.js";
import versionRouter from "./version.routes.js";

const router = express.Router();

router.get("/", verifyToken, getAutomations);
router.post("/", verifyToken, parseWorkflowBody, saveAutomation);
router.put("/:id", verifyToken, parseWorkflowBody, saveAutomation);
router.delete("/:id", verifyToken, deleteAutomation);
router.post("/:id/duplicate", verifyToken, duplicateAutomation);
router.patch("/:id/rename", verifyToken, renameAutomation);
router.post("/:id/activate", verifyToken, activateAutomation);
router.post("/:id/execute", verifyToken, triggerAutomation);
router.use("/:id/versions", versionRouter);

export default router;
