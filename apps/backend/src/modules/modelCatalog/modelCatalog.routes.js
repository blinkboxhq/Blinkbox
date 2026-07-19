import { Router } from "express";
import mongoose from "mongoose";
import { verifyToken } from "../auth/auth.middleware.js";
import Credential from "../../models/credential.model.js";
import { decrypt } from "../../utils/crypto.js";
import { fetchProviderModels, isKnownProvider } from "./modelCatalog.service.js";

const router = Router();

router.get("/:provider", verifyToken, async (req, res) => {
  try {
    const { provider } = req.params;
    if (!isKnownProvider(provider)) {
      return res.status(404).json({ message: "Unknown provider." });
    }

    let apiKey = null;
    const { credentialId } = req.query;
    if (credentialId && mongoose.isValidObjectId(credentialId)) {
      const cred = await Credential.findOne({ _id: credentialId, workspaceId: req.user.id });
      if (cred) {
        try {
          apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
        } catch {
          apiKey = null;
        }
      }
    }

    const result = await fetchProviderModels(provider, apiKey);
    res.json(result);
  } catch (err) {
    console.error("[ModelCatalog] Route error:", err.message);
    res.status(500).json({ message: "Failed to fetch models." });
  }
});

export default router;
