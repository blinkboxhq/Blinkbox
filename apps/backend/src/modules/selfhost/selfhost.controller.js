import crypto from "crypto";
import ApiKey from "../../models/apiKey.model.js";
import { hashApiKey } from "../mcp/apiKey.middleware.js";
import { checkCredits, deductCredits, getNodeCost } from "../../infra/credit.engine.js";

const MAX_LICENSES = 5;

// ── License management (dashboard, JWT-authenticated) ────────────────────────

export async function createLicense(req, res) {
  try {
    const active = await ApiKey.countDocuments({
      userId: req.user.id,
      scope: "selfhost",
      revoked: false,
    });
    if (active >= MAX_LICENSES) {
      return res.status(429).json({
        success: false,
        message: `Limit of ${MAX_LICENSES} active self-hosted licenses reached. Revoke one first.`,
      });
    }

    const label = (req.body?.label || "Self-hosted instance").toString().slice(0, 100);
    const raw = "bb_selfhost_" + crypto.randomBytes(24).toString("hex");
    const doc = await ApiKey.create({
      userId: req.user.id,
      hashedKey: hashApiKey(raw),
      prefix: raw.slice(0, 20),
      label,
      scope: "selfhost",
    });

    // Raw key is shown exactly once — only the sha256 is persisted.
    res.status(201).json({
      success: true,
      id: doc._id,
      label: doc.label,
      licenseKey: raw,
      prefix: doc.prefix,
      createdAt: doc.createdAt,
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to create license." });
  }
}

export async function listLicenses(req, res) {
  try {
    const licenses = await ApiKey.find({ userId: req.user.id, scope: "selfhost", revoked: false })
      .select("label prefix lastUsedAt createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, licenses });
  } catch {
    res.status(500).json({ success: false, message: "Failed to list licenses." });
  }
}

export async function revokeLicense(req, res) {
  try {
    const result = await ApiKey.updateOne(
      { _id: req.params.id, userId: req.user.id, scope: "selfhost" },
      { $set: { revoked: true } },
    );
    if (!result.matchedCount) {
      return res.status(404).json({ success: false, message: "License not found." });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Failed to revoke license." });
  }
}

// ── Credits API (license-authenticated, called by self-hosted instances) ─────

export async function checkLicenseCredits(req, res) {
  const nodeType = String(req.body?.nodeType || "").slice(0, 100);
  if (!nodeType) {
    return res.status(400).json({ success: false, message: "nodeType is required." });
  }
  try {
    const result = await checkCredits(req.licenseUserId, nodeType);
    res.json({ success: true, ...result, remaining: finite(result.remaining) });
  } catch {
    res.status(500).json({ success: false, message: "Credit check failed." });
  }
}

export async function deductLicenseCredits(req, res) {
  const nodeType = String(req.body?.nodeType || "").slice(0, 100);
  const nodeId = String(req.body?.nodeId || "").slice(0, 100);
  const executionId = String(req.body?.executionId || "").slice(0, 100);
  if (!nodeType || !executionId) {
    return res.status(400).json({ success: false, message: "nodeType and executionId are required." });
  }
  try {
    const result = await deductCredits(req.licenseUserId, { executionId, nodeId, nodeType });
    res.json({ success: true, ...result, remaining: finite(result.remaining) });
  } catch {
    res.status(500).json({ success: false, message: "Credit deduction failed." });
  }
}

export async function licenseStatus(req, res) {
  try {
    const usage = await checkCredits(req.licenseUserId, "data_mapper");
    res.json({
      success: true,
      valid: true,
      plan: usage.plan,
      remaining: finite(usage.remaining),
      monthlyLimit: usage.monthlyLimit,
      creditsUsed: usage.creditsUsed,
      purchasedCredits: usage.purchasedCredits,
    });
  } catch {
    res.status(500).json({ success: false, message: "Status lookup failed." });
  }
}

export function nodeCost(req, res) {
  res.json({ success: true, nodeType: req.params.nodeType, cost: getNodeCost(req.params.nodeType) });
}

// Infinity is not valid JSON — free nodes report -1 and the client restores it.
function finite(n) {
  return Number.isFinite(n) ? n : -1;
}
