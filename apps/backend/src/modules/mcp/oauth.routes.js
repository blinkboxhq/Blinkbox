import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/env.js";
import ApiKey from "../../models/apiKey.model.js";
import { hashApiKey } from "./apiKey.middleware.js";

/**
 * Auto-approve OAuth shim for chat connectors (Claude.ai).
 *
 * Claude's browser connector only speaks OAuth 2.0 — it cannot use a raw
 * bearer/URL key. So we expose the minimum OAuth surface it probes (RFC 9728
 * protected-resource metadata, RFC 8414 auth-server metadata, dynamic client
 * registration, authorize, token) and make every step succeed automatically
 * using the bb_live_ key already baked into the connector URL.
 *
 * Flow (no UI, no consent screen):
 *   1. Claude reads /.well-known/* → learns this host is its own auth server.
 *   2. Claude POSTs /oauth/register → gets a throwaway client_id.
 *   3. Claude GETs /oauth/authorize?resource=<mcp-url-with-key>&...
 *      → we pull the key out of `resource`, validate it, mint a 5-min signed
 *        auth code bound to that key + the PKCE challenge, and 302 straight
 *        back to Claude's redirect_uri. No login page.
 *   4. Claude POSTs /oauth/token with the code + PKCE verifier
 *      → we return the bb_live_ key itself as the access_token.
 *   5. Claude calls the MCP endpoint with `Authorization: Bearer bb_live_...`,
 *      which verifyMcpAuth already accepts — so no MCP-side changes needed.
 *
 * ChatGPT/Grok (server-side, key in URL) never touch any of this.
 */

const router = Router();

// Public host Claude actually connected to (api.blinkbox.net), not an internal
// Railway hostname — the issuer/endpoints must match what the client called.
function baseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

// Pull the bb_ key out of an MCP connector URL or resource string.
// Accepts the full URL (.../api/mcp/bb_live_xxx) or a bare key.
function extractKeyFromResource(resource) {
  if (!resource) return null;
  const str = String(resource);
  const m = str.match(/bb_[A-Za-z0-9_]+/);
  return m ? m[0] : null;
}

async function keyIsValid(rawKey) {
  if (!rawKey || !rawKey.startsWith("bb_")) return false;
  const record = await ApiKey.findOne({ hashedKey: hashApiKey(rawKey), revoked: false });
  return Boolean(record);
}

function sha256base64url(input) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

// ── RFC 9728: Protected Resource Metadata ─────────────────────────────────────
// Claude probes this (root and path-suffixed forms) to discover the auth server.
function protectedResourceMetadata(req, res) {
  const base = baseUrl(req);
  res.json({
    resource: base,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
  });
}
router.get("/.well-known/oauth-protected-resource", protectedResourceMetadata);
router.get(/^\/\.well-known\/oauth-protected-resource\/.*/, protectedResourceMetadata);

// ── RFC 8414: Authorization Server Metadata ───────────────────────────────────
function authServerMetadata(req, res) {
  const base = baseUrl(req);
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  });
}
router.get("/.well-known/oauth-authorization-server", authServerMetadata);
router.get(/^\/\.well-known\/oauth-authorization-server\/.*/, authServerMetadata);
// Some clients also probe the OpenID config path.
router.get("/.well-known/openid-configuration", authServerMetadata);

// ── Dynamic Client Registration (RFC 7591) ────────────────────────────────────
// Accept any registration. Public client (PKCE), so no secret is issued.
// This endpoint failing was the "Couldn't register with blinkbox's sign-in
// service" error.
router.post("/oauth/register", (req, res) => {
  const body = req.body || {};
  res.status(201).json({
    client_id: `mcp-${crypto.randomBytes(8).toString("hex")}`,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
    redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
    client_name: body.client_name || "MCP Client",
  });
});

// ── Authorize ─────────────────────────────────────────────────────────────────
// No consent UI: validate the key from `resource`, mint an auth code, redirect
// straight back to the client.
router.get("/oauth/authorize", async (req, res) => {
  const {
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
    resource,
  } = req.query;

  if (!redirect_uri) {
    return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri required" });
  }

  // The key rides in `resource` (the MCP connector URL). Fall back to scanning
  // any query value in case a client puts it elsewhere.
  const rawKey =
    extractKeyFromResource(resource) ||
    extractKeyFromResource(Object.values(req.query).join(" "));

  const redirectErr = (code, desc) => {
    const u = new URL(String(redirect_uri));
    u.searchParams.set("error", code);
    if (desc) u.searchParams.set("error_description", desc);
    if (state) u.searchParams.set("state", String(state));
    return res.redirect(302, u.toString());
  };

  if (!rawKey) {
    return redirectErr(
      "invalid_request",
      "No Blinkbox API key found in the connector URL. The URL must look like https://<host>/api/mcp/bb_live_xxx",
    );
  }
  if (!(await keyIsValid(rawKey))) {
    return redirectErr("access_denied", "Invalid or revoked Blinkbox API key.");
  }

  // 5-minute auth code binding the key to the PKCE challenge.
  const code = jwt.sign(
    {
      k: rawKey,
      cc: code_challenge || null,
      ccm: (code_challenge_method || "plain").toLowerCase(),
      t: "mcp_oauth_code",
    },
    JWT_SECRET,
    { expiresIn: "5m" },
  );

  const u = new URL(String(redirect_uri));
  u.searchParams.set("code", code);
  if (state) u.searchParams.set("state", String(state));
  return res.redirect(302, u.toString());
});

// ── Token ─────────────────────────────────────────────────────────────────────
// Exchange the auth code (+ PKCE verifier) for the API key as the access token.
router.post("/oauth/token", async (req, res) => {
  const body = req.body || {};
  const grantType = body.grant_type;
  const code = body.code;
  const codeVerifier = body.code_verifier;

  if (grantType !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  if (!code) {
    return res.status(400).json({ error: "invalid_request", error_description: "code required" });
  }

  let claims;
  try {
    claims = jwt.verify(String(code), JWT_SECRET);
  } catch {
    return res.status(400).json({ error: "invalid_grant", error_description: "code expired or invalid" });
  }
  if (claims.t !== "mcp_oauth_code") {
    return res.status(400).json({ error: "invalid_grant" });
  }

  // PKCE verification (only if a challenge was issued at authorize time).
  if (claims.cc) {
    if (!codeVerifier) {
      return res.status(400).json({ error: "invalid_request", error_description: "code_verifier required" });
    }
    const computed = claims.ccm === "s256" ? sha256base64url(String(codeVerifier)) : String(codeVerifier);
    if (computed !== claims.cc) {
      return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
    }
  }

  // Re-check the key is still live at exchange time.
  if (!(await keyIsValid(claims.k))) {
    return res.status(400).json({ error: "invalid_grant", error_description: "API key revoked." });
  }

  // The access token IS the bb_live_ key — verifyMcpAuth already accepts it as a
  // Bearer token, so no MCP-side change is needed.
  return res.json({
    access_token: claims.k,
    token_type: "Bearer",
    scope: "mcp",
  });
});

export default router;
