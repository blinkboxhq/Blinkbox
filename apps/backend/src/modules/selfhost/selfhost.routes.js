import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { verifyLicense } from "./license.middleware.js";
import {
  createLicense,
  listLicenses,
  revokeLicense,
  checkLicenseCredits,
  deductLicenseCredits,
  licenseStatus,
  nodeCost,
  listInstances,
  registerInstance,
  heartbeat,
} from "./selfhost.controller.js";

const router = Router();

// Dashboard — mint and manage licenses for your own account.
router.post("/licenses", verifyToken, createLicense);
router.get("/licenses", verifyToken, listLicenses);
router.delete("/licenses/:id", verifyToken, revokeLicense);
router.get("/instances", verifyToken, listInstances);

// Self-hosted instances — metering against the license owner's workspace.
router.post("/register", verifyLicense, registerInstance);
router.post("/heartbeat", verifyLicense, heartbeat);
router.get("/status", verifyLicense, licenseStatus);
router.get("/cost/:nodeType", verifyLicense, nodeCost);
router.post("/credits/check", verifyLicense, checkLicenseCredits);
router.post("/credits/deduct", verifyLicense, deductLicenseCredits);

export default router;
