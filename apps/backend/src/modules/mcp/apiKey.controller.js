import crypto from "crypto";
import ApiKey from "../../models/apiKey.model.js";
import { hashApiKey } from "./apiKey.middleware.js";

export async function createApiKey(req, res) {
  try {
    const label = (req.body?.label || "Chatbot connector").toString().slice(0, 100);
    const raw = "bb_live_" + crypto.randomBytes(24).toString("hex");
    const doc = await ApiKey.create({
      userId: req.user.id,
      hashedKey: hashApiKey(raw),
      prefix: raw.slice(0, 16),
      label,
    });
    // The raw key is returned exactly once and never persisted in plaintext.
    res.status(201).json({
      success: true,
      id: doc._id,
      label: doc.label,
      key: raw,
      prefix: doc.prefix,
      createdAt: doc.createdAt,
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to create API key." });
  }
}

export async function listApiKeys(req, res) {
  try {
    const keys = await ApiKey.find({ userId: req.user.id, revoked: false })
      .select("label prefix lastUsedAt createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, keys });
  } catch {
    res.status(500).json({ success: false, message: "Failed to list API keys." });
  }
}

export async function revokeApiKey(req, res) {
  try {
    const result = await ApiKey.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { $set: { revoked: true } },
    );
    if (!result.matchedCount) {
      return res.status(404).json({ success: false, message: "Key not found." });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Failed to revoke API key." });
  }
}
