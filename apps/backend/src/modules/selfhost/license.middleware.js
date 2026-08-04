import ApiKey from "../../models/apiKey.model.js";
import { hashApiKey } from "../mcp/apiKey.middleware.js";

/**
 * Authenticates a self-hosted Blinkbox instance by its license key.
 *
 * A self-hosted container never holds a database credential — the only secret
 * it carries is this bearer token, and the only thing it can reach with it is
 * the credits API below. The workspace charged is always the key's owner, read
 * from the key record here; a request body can never name its own workspace.
 */
export async function verifyLicense(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token.startsWith("bb_")) {
    return res.status(401).json({ success: false, message: "Missing or malformed license key." });
  }

  try {
    const record = await ApiKey.findOne({
      hashedKey: hashApiKey(token),
      scope: "selfhost",
      revoked: false,
    });

    if (!record) {
      return res.status(401).json({ success: false, message: "Invalid or revoked license key." });
    }

    req.licenseUserId = record.userId;
    req.licenseId = record._id;
    ApiKey.updateOne({ _id: record._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
    next();
  } catch {
    res.status(500).json({ success: false, message: "License verification failed." });
  }
}
