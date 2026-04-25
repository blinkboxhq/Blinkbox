import express from "express";
import {
  saveAutomation,
  activateAutomation,
  deactivateAutomation,
  triggerAutomation,
  getAutomations,
  deleteAutomation,
  duplicateAutomation,
  renameAutomation,
} from "./engine/automation.controller.js";
import { parseWorkflowBody } from "./engine/automation.validator.js";
import { verifyToken } from "../auth/auth.middleware.js";
import versionRouter from "./version.routes.js";
import { listCollaborators, addCollaborator, removeCollaborator } from "./collaborator.controller.js";

const router = express.Router();

router.get("/", verifyToken, getAutomations);
router.post("/", verifyToken, parseWorkflowBody, saveAutomation);
router.put("/:id", verifyToken, parseWorkflowBody, saveAutomation);
router.delete("/:id", verifyToken, deleteAutomation);
router.post("/:id/duplicate", verifyToken, duplicateAutomation);
router.patch("/:id/rename", verifyToken, renameAutomation);
router.post("/:id/activate", verifyToken, activateAutomation);
router.post("/:id/deactivate", verifyToken, deactivateAutomation);
router.post("/:id/execute", verifyToken, triggerAutomation);
router.use("/:id/versions", versionRouter);

// Collaborator management (owner only)
router.get("/:id/collaborators", verifyToken, listCollaborators);
router.post("/:id/collaborators", verifyToken, addCollaborator);
router.delete("/:id/collaborators/:userId", verifyToken, removeCollaborator);

export default router;
