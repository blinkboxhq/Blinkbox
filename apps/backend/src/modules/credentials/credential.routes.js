import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import {
  listCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
} from "./credential.controller.js";

const router = Router();

router.get("/", verifyToken, listCredentials);
router.post("/", verifyToken, createCredential);
router.patch("/:id", verifyToken, updateCredential);
router.delete("/:id", verifyToken, deleteCredential);

export default router;
