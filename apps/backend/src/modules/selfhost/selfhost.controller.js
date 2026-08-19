import crypto from "crypto";
import ApiKey from "../../models/apiKey.model.js";
import SelfHostInstance from "../../models/selfHostInstance.model.js";
import { hashApiKey } from "../mcp/apiKey.middleware.js";
import { checkCredits, deductCredits, getNodeCost } from "../../infra/credit.engine.js";
import { dnsEnabled, upsertARecord, deleteRecord } from "../../infra/dns.cloudflare.js";
import { provisionTenant, deprovisionTenant, provisioningReady } from "../../infra/managedStorage.provision.js";
import { SELF_HOST_DOMAIN, GRACE_HOURS, MANAGED_STORAGE_ENABLED } from "../../config/env.js";

const MAX_LICENSES = 5;
const MAX_NAME_VERSIONS = 50;

// Names that would collide with Blinkbox's own hostnames on the zone.
const RESERVED_NAMES = new Set([
  "www", "api", "app", "mcp", "admin", "mail", "smtp", "ns1", "ns2", "cdn",
  "docs", "blog", "status", "get", "dash", "dashboard", "staging", "dev",
  "test", "beta", "auth", "login", "billing", "support", "help", "blinkbox",
]);

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
  } catch (err) {
    console.error("[SelfHost] license mint failed:", err.message);
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
  } catch (err) {
    console.error("[SelfHost] license list failed:", err.message);
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
    // The instance dies with its license, so its subdomain must not linger
    // pointing at an IP the customer may hand back to their provider.
    const instances = await SelfHostInstance.find({ licenseId: String(req.params.id), userId: req.user.id });
    for (const inst of instances) {
      if (dnsEnabled()) await deleteRecord(inst.dnsRecordId).catch(() => {});
      await inst.deleteOne();
    }
    // Managed tenants lose their data-plane credentials with the license. The
    // data itself stays: a customer who comes back should not find it deleted.
    await deprovisionTenant(String(req.params.id)).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error("[SelfHost] license revoke failed:", err.message);
    res.status(500).json({ success: false, message: "Failed to revoke license." });
  }
}

export async function listInstances(req, res) {
  try {
    const instances = await SelfHostInstance.find({ userId: req.user.id })
      .select("name hostname ip version lastSeenAt createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, instances });
  } catch (err) {
    console.error("[SelfHost] instance list failed:", err.message);
    res.status(500).json({ success: false, message: "Failed to list instances." });
  }
}

// ── Instance registration (license-authenticated, called by the installer) ────

export async function registerInstance(req, res) {
  const requested = slugify(req.body?.name);
  if (!requested) {
    return res.status(400).json({
      success: false,
      message: "Name must be 3-30 characters, letters, numbers and dashes only.",
    });
  }
  if (RESERVED_NAMES.has(requested)) {
    return res.status(409).json({ success: false, message: `"${requested}" is reserved. Pick another name.` });
  }

  const ip = publicIPv4(req.body?.ip) || publicIPv4(sourceIP(req));
  if (!ip) {
    return res.status(400).json({
      success: false,
      message: "Could not determine a public IPv4 for this machine. Pass it explicitly.",
    });
  }
  const version = String(req.body?.version || "").slice(0, 40) || null;

  try {
    // Re-running the installer on the same box is an update, not a collision —
    // only somebody else's name forces a -v bump. A license that already owns
    // acme-v2 keeps it when the installer is re-run with "acme".
    let instance = await SelfHostInstance.findOne({ licenseId: String(req.licenseId) });
    const keepsName =
      instance && (instance.name === requested || instance.name.startsWith(`${requested}-v`));
    let name = keepsName ? instance.name : requested;

    if (!keepsName) {
      name = await availableName(requested);
      if (!name) {
        return res.status(409).json({
          success: false,
          message: `"${requested}" is taken and all versioned variants are used. Pick another name.`,
        });
      }
      if (instance) {
        // One license, one instance: the box was re-registered under a different
        // name, so its old subdomain must not keep pointing at it.
        if (dnsEnabled()) await deleteRecord(instance.dnsRecordId).catch(() => {});
        instance.dnsRecordId = null;
        instance.name = name;
      } else {
        instance = new SelfHostInstance({
          userId: req.licenseUserId,
          licenseId: String(req.licenseId),
          name,
          hostname: `${name}.${SELF_HOST_DOMAIN}`,
        });
      }
    }

    const hostname = `${name}.${SELF_HOST_DOMAIN}`;
    let dnsRecordId = instance.dnsRecordId;
    let dns = "skipped";
    if (dnsEnabled()) {
      try {
        dnsRecordId = await upsertARecord(hostname, ip, dnsRecordId);
        dns = "ok";
      } catch (err) {
        console.error("[SelfHost] DNS provisioning failed:", err.message);
        dns = "failed";
      }
    }

    Object.assign(instance, { hostname, ip, version, dnsRecordId, lastSeenAt: new Date() });
    await instance.save();

    res.status(201).json({
      success: true,
      name,
      hostname,
      url: `https://${hostname}`,
      ip,
      dns,
      renamed: name !== requested,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: "That name was just taken. Try another." });
    }
    res.status(500).json({ success: false, message: "Failed to register instance." });
  }
}

export async function heartbeat(req, res) {
  try {
    await SelfHostInstance.updateOne(
      { licenseId: String(req.licenseId) },
      { $set: { lastSeenAt: new Date(), ...(req.body?.version ? { version: String(req.body.version).slice(0, 40) } : {}) } },
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Heartbeat failed." });
  }
}

function slugify(raw) {
  const s = String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return s.length >= 3 && s.length <= 30 ? s : null;
}

// "acme" taken → acme-v2, acme-v3, … so a second box for the same team still
// gets a predictable, related hostname instead of an outright rejection.
async function availableName(base) {
  for (let v = 1; v <= MAX_NAME_VERSIONS; v++) {
    const candidate = v === 1 ? base : `${base}-v${v}`;
    if (candidate.length > 40) break;
    const taken = await SelfHostInstance.exists({ name: candidate });
    if (!taken) return candidate;
  }
  return null;
}

function sourceIP(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.ip || "";
}

// Rejects private, loopback, link-local and CGNAT space — a subdomain on our
// zone must never be pointed at something the wider internet cannot reach.
function publicIPv4(raw) {
  const ip = String(raw || "").trim().replace(/^::ffff:/, "");
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some((n) => n > 255)) return null;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return null;
  if (a === 169 && b === 254) return null;
  if (a === 172 && b >= 16 && b <= 31) return null;
  if (a === 192 && b === 168) return null;
  if (a === 100 && b >= 64 && b <= 127) return null;
  return ip;
}

// ── Credits API (license-authenticated, called by self-hosted instances) ─────

export async function checkLicenseCredits(req, res) {
  const nodeType = String(req.body?.nodeType || "").slice(0, 100);
  if (!nodeType) {
    return res.status(400).json({ success: false, message: "nodeType is required." });
  }
  try {
    const result = await checkCredits(req.licenseUserId, nodeType);
    // The grace policy rides along with every check, so an instance that has
    // ever reached us knows how long it may coast — and cannot widen the
    // window itself by editing its own .env.
    res.json({ success: true, ...result, remaining: finite(result.remaining), graceHours: GRACE_HOURS });
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
      graceHours: GRACE_HOURS,
      // The installer reads this to decide whether to offer "Blinkbox-managed"
      // as a storage choice at all — an option we cannot fulfil is worse than
      // one we never showed. The flag alone is not enough: without Atlas and
      // Redis credentials configured, /bootstrap would 503 and the customer's
      // box would fail its first boot having already chosen managed.
      managedStorage: MANAGED_STORAGE_ENABLED && provisioningReady(),
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

// ── Managed storage bootstrap ────────────────────────────────────────────────

// A healthy instance asks roughly twice a day; a crash-looping one could ask far
// more often, and Atlas rate-limits per project. Serving the last lease for a
// few minutes keeps one broken box from starving every other tenant's renewal.
const LEASE_MEMO_MS = 5 * 60_000;
const leases = new Map();

export async function bootstrapStorage(req, res) {
  if (!MANAGED_STORAGE_ENABLED || !provisioningReady()) {
    return res.status(503).json({
      success: false,
      message: "Managed storage is not available on this cloud. Reinstall with local storage.",
    });
  }

  const id = String(req.licenseId);
  const memo = leases.get(id);
  if (memo && memo.mintedAt > Date.now() - LEASE_MEMO_MS) {
    return res.json(memo.creds);
  }

  try {
    const creds = await provisionTenant(id);
    leases.set(id, { creds, mintedAt: Date.now() });
    res.json(creds);
  } catch (err) {
    console.error("[SelfHost] bootstrap failed:", err.message);
    res.status(502).json({ success: false, message: "Could not provision managed storage." });
  }
}
