import crypto from "crypto";
import jwt from "jsonwebtoken";
import { JWT_SECRET, MCP_HOST } from "../../config/env.js";
import ApiKey from "../../models/apiKey.model.js";

// True when the request arrived on the dedicated MCP host. There the server is
// served at the root and the OAuth resource is the bare origin — the exact shape
// mcp.higgsfield.ai uses, which Claude's relay connects to without issue.
export function isMcpHost(req) {
  const host = (req.headers["x-forwarded-host"] || req.get("host") || "").split(":")[0].toLowerCase();
  return host === String(MCP_HOST).toLowerCase();
}

export function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();
  if (req.params && req.params.token) return String(req.params.token).trim();
  if (req.query && req.query.key) return String(req.query.key).trim();
  return null;
}

// Public host the client actually called (api.blinkbox.net), not a Railway-internal
// hostname — the resource_metadata URL must match what the connector dialed.
function publicBase(req) {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

// Tell an OAuth-only browser connector (Claude.ai) where to discover the auth
// server. The key lives in the MCP path, so the resource_metadata URL embeds that
// same path — /.well-known/oauth-protected-resource/api/mcp/<key> — which is the
// only way the key survives root-level OAuth discovery into /oauth/authorize.
// RFC 9728 §5.1 / RFC 6750 §3: 401 + WWW-Authenticate with resource_metadata.
function challenge401(req, res, error, description) {
  const base = publicBase(req);
  // On the dedicated MCP host the resource is the bare origin, so its metadata
  // lives at the ROOT well-known (like higgsfield) — no path suffix. On the
  // shared api host we keep the path-suffixed form so existing connectors that
  // dialed /api/mcp still discover the right document.
  const mcpPath = isMcpHost(req) ? "" : req.originalUrl.split("?")[0];
  const metadataUrl = `${base}/.well-known/oauth-protected-resource${mcpPath}`;
  res.set(
    "WWW-Authenticate",
    `Bearer resource_metadata="${metadataUrl}", error="${error}", error_description="${description}"`,
  );
  return res.status(401).json({ error: description });
}

/**
 * Authenticates an MCP request via a Blinkbox API key (preferred) or a JWT.
 * The token may arrive in the Authorization header, the URL path (/api/mcp/:token),
 * or a ?key= query param — chat connectors vary in how they attach credentials.
 * On success sets req.user = { id, role } so downstream calls behave exactly like
 * an ordinary authenticated session.
 */
export async function verifyMcpAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return challenge401(req, res, "invalid_token", "Missing API key. Provide it as a Bearer token.");
  }

  if (token.startsWith("bb_")) {
    try {
      // scope pins this to connector keys — a self-hosted license key grants
      // only the credits API, never a user's full MCP surface.
      const record = await ApiKey.findOne({
        hashedKey: hashApiKey(token),
        scope: "mcp",
        revoked: false,
      });
      if (!record) return challenge401(req, res, "invalid_token", "Invalid or revoked API key.");
      req.user = { id: record.userId, role: "user" };
      req.apiKeyId = record._id;
      ApiKey.updateOne({ _id: record._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid API key." });
    }
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
