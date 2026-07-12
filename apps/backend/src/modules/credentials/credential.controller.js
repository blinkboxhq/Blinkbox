import Credential from "../../models/credential.model.js";
import { encrypt } from "../../utils/crypto.js";
import { emitToUser } from "../../infra/socket.server.js";

export async function listCredentials(req, res) {
  try {
    const credentials = await Credential.find(
      { workspaceId: req.user.id },
      { encryptedData: 0, iv: 0, authTag: 0, refreshToken: 0, refreshIv: 0, refreshAuthTag: 0 },
    ).sort({ createdAt: -1 });

    res.json({ credentials });
  } catch (err) {
    console.error("[Credentials] List error:", err.message);
    res.status(500).json({ message: "Failed to list credentials." });
  }
}

export async function createCredential(req, res) {
  try {
    const { name, secret, type = "api_key" } = req.body;

    if (!name || !secret) {
      return res.status(400).json({ message: "Name and secret are required." });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: "Name must be under 100 characters." });
    }

    const { encryptedData, iv, authTag } = encrypt(secret.trim());

    const credential = await Credential.create({
      workspaceId: req.user.id,
      name: name.trim(),
      type,
      encryptedData,
      iv,
      authTag,
    });

    const credPayload = {
      _id: credential._id,
      name: credential.name,
      type: credential.type,
      createdAt: credential.createdAt,
    };

    emitToUser(String(req.user.id), "credential:created", { credential: credPayload });

    res.status(201).json({ credential: credPayload });
  } catch (err) {
    console.error("[Credentials] Create error:", err.message);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Failed to create credential." });
  }
}

export async function updateCredential(req, res) {
  try {
    const { secret } = req.body;

    if (!secret || !secret.trim()) {
      return res.status(400).json({ message: "Secret is required." });
    }

    const { encryptedData, iv, authTag } = encrypt(secret.trim());

    const result = await Credential.updateOne(
      { _id: req.params.id, workspaceId: req.user.id },
      { $set: { encryptedData, iv, authTag } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Credential not found." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[Credentials] Update error:", err.message);
    res.status(500).json({ message: "Failed to update credential." });
  }
}

export async function deleteCredential(req, res) {
  try {
    const result = await Credential.deleteOne({
      _id: req.params.id,
      workspaceId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Credential not found." });
    }

    emitToUser(String(req.user.id), "credential:deleted", { id: req.params.id });

    res.json({ success: true });
  } catch (err) {
    console.error("[Credentials] Delete error:", err.message);
    res.status(500).json({ message: "Failed to delete credential." });
  }
}
