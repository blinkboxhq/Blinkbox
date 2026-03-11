import Credential from "../../models/credential.model.js";
import { encrypt } from "../../utils/crypto.js";

export async function listCredentials(req, res) {
  try {
    const credentials = await Credential.find(
      { workspaceId: req.user.id },
      { encryptedData: 0, iv: 0, authTag: 0 },
    ).sort({ createdAt: -1 });

    res.json({ credentials });
  } catch (err) {
    console.error("[Credentials] List error:", err.message);
    res.status(500).json({ message: "Failed to list credentials." });
  }
}

export async function createCredential(req, res) {
  try {
    const { name, type, secret } = req.body;

    if (!name || !type || !secret) {
      return res.status(400).json({ message: "Name, type, and secret are required." });
    }

    if (!["bearer", "api_key", "basic"].includes(type)) {
      return res.status(400).json({ message: "Type must be bearer, api_key, or basic." });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: "Name must be under 100 characters." });
    }

    const { encryptedData, iv, authTag } = encrypt(secret);

    const credential = await Credential.create({
      workspaceId: req.user.id,
      name: name.trim(),
      type,
      encryptedData,
      iv,
      authTag,
    });

    res.status(201).json({
      credential: {
        _id: credential._id,
        name: credential.name,
        type: credential.type,
        createdAt: credential.createdAt,
      },
    });
  } catch (err) {
    console.error("[Credentials] Create error:", err.message);
    res.status(500).json({ message: "Failed to create credential." });
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

    res.json({ success: true });
  } catch (err) {
    console.error("[Credentials] Delete error:", err.message);
    res.status(500).json({ message: "Failed to delete credential." });
  }
}
