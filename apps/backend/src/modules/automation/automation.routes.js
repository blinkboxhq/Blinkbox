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
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getAutomations);
router.post("/", verifyToken, saveAutomation);
router.put("/:id", verifyToken, saveAutomation);
router.delete("/:id", verifyToken, deleteAutomation);
router.post("/:id/duplicate", verifyToken, duplicateAutomation);
router.patch("/:id/rename", verifyToken, renameAutomation);
router.post("/:id/activate", verifyToken, activateAutomation);
router.post("/:id/execute", verifyToken, triggerAutomation);

export default router;
