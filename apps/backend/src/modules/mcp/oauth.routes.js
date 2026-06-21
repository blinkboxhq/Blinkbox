import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/env.js";
import ApiKey from "../../models/apiKey.model.js";
import User from "../../models/user.model.js";
import { hashApiKey } from "./apiKey.middleware.js";

/**
 * Interactive OAuth for chat connectors (Claude.ai web, ChatGPT, etc).
 *
 * The connector URL is now CLEAN — https://api.blinkbox.net/api/mcp, no key in
 * the path. We speak standard authorization_code + PKCE the same way Higgsfield
 * does, because that is the branch every MCP client is built and tested against:
 *
 *   1. Client 401s on /api/mcp, reads /.well-known/oauth-protected-resource
 *      → learns this host is its own auth server (stable `resource`, no key).
 *   2. Client POSTs /oauth/register → throwaway client_id.
 *   3. Client opens /oauth/authorize in a popup. We render a real Blinkbox
 *      login + "Allow Claude to access your workspace" consent screen.
 *   4. User signs in and clicks Allow → we mint a fresh, labeled bb_live_ key
 *      bound to that user, sign a 5-min auth code carrying it + the PKCE
 *      challenge, and 302 back to the client's redirect_uri.
 *   5. Client POSTs /oauth/token with the code + PKCE verifier → we return the
 *      bb_live_ key as the access_token. verifyMcpAuth already accepts it.
 *
 * Each connection gets its OWN key (labeled "Claude (web) — <date>"), so a user
 * can revoke one connector without breaking the others, and no permanent key is
 * ever pasted into a URL.
 */

const router = Router();

// Public host the client actually called (api.blinkbox.net), not an internal
// Railway hostname — the issuer/endpoints must match what the client dialed.
function baseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

// The single, stable resource every connector authenticates against.
function mcpResource(req) {
  return `${baseUrl(req)}/api/mcp`;
}

function sha256base64url(input) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

// Mint a fresh MCP key bound to a user — same shape as the dashboard key route,
// but labeled so the user can see which connector it belongs to.
async function mintKeyForUser(userId, label) {
  const raw = "bb_live_" + crypto.randomBytes(24).toString("hex");
  await ApiKey.create({
    userId: String(userId),
    hashedKey: hashApiKey(raw),
    prefix: raw.slice(0, 16),
    label: label.slice(0, 100),
  });
  return raw;
}

// ── RFC 9728: Protected Resource Metadata ─────────────────────────────────────
// Stable resource (no key suffix) + auth_hints that nudge Claude into the
// authorization_code_pkce branch, mirroring Higgsfield's connector.
function protectedResourceMetadata(req, res) {
  const base = baseUrl(req);
  res.json({
    resource: mcpResource(req),
    authorization_servers: [base],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"],
    blinkbox_auth_hints: {
      selection: "client_capability_based",
      options: [
        {
          flow: "authorization_code_pkce",
          authorization_server: base,
          potential_clients: ["anthropic", "claude", "claude-ai", "claude-code", "openai", "chatgpt"],
          use_when:
            "Client can complete an OAuth authorization-code redirect using one of its registered redirect mechanisms.",
          requires: ["authorization_endpoint", "token_endpoint", "redirect_uri_receiver", "pkce"],
        },
      ],
    },
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
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  });
}
router.get("/.well-known/oauth-authorization-server", authServerMetadata);
router.get(/^\/\.well-known\/oauth-authorization-server\/.*/, authServerMetadata);
router.get("/.well-known/openid-configuration", authServerMetadata);

// ── Dynamic Client Registration (RFC 7591) ────────────────────────────────────
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

// ── Consent page ──────────────────────────────────────────────────────────────
// Self-contained dark-mode login + Allow screen. The OAuth params ride through
// as hidden fields so the POST can rebuild the redirect. `error` shows a failed
// login inline without losing the flow.
function consentPage({ params, error }) {
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );
  const hidden = ["redirect_uri", "state", "code_challenge", "code_challenge_method", "client_id", "scope", "resource"]
    .map((k) => `<input type="hidden" name="${k}" value="${esc(params[k])}" />`)
    .join("");
  const errBanner = error
    ? `<div class="err">${esc(error)}</div>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect to Blinkbox</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { width: 100%; max-width: 380px; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 28px; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .dot { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #8b5cf6, #ec4899); }
  .brand h1 { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
  .sub { font-size: 12px; color: #a1a1aa; margin: 14px 0 20px; line-height: 1.5; }
  .sub b { color: #e4e4e7; font-weight: 600; }
  label { display: block; font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  input[type=email], input[type=password] { width: 100%; background: #0f0f11; border: 1px solid #3f3f46; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #fafafa; margin-bottom: 14px; outline: none; }
  input:focus { border-color: #8b5cf6; }
  button { width: 100%; border: none; border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .allow { background: #8b5cf6; color: white; }
  .allow:hover { background: #7c3aed; }
  .err { background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.25); color: #fb7185; font-size: 12px; padding: 9px 12px; border-radius: 9px; margin-bottom: 16px; }
  .foot { font-size: 10px; color: #52525b; text-align: center; margin-top: 16px; line-height: 1.5; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand"><div class="dot"></div><h1>Blinkbox</h1></div>
    <p class="sub">Sign in to let <b>Claude</b> access your Blinkbox workspace — list, run, and build automations on your behalf.</p>
    ${errBanner}
    <form method="POST" action="/oauth/authorize">
      ${hidden}
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="email" required autofocus />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button class="allow" type="submit" name="decision" value="allow">Sign in &amp; Allow</button>
    </form>
    <p class="foot">Connecting grants Claude a scoped key to your workspace.<br/>You can revoke it anytime in Blinkbox → API Keys.</p>
  </div>
</body>
</html>`;
}

// ── Authorize (GET) — render the login + consent screen ───────────────────────
router.get("/oauth/authorize", (req, res) => {
  const { redirect_uri } = req.query;
  if (!redirect_uri) {
    return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri required" });
  }
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(consentPage({ params: req.query, error: null }));
});

// ── Authorize (POST) — authenticate, mint key, issue code ─────────────────────
router.post("/oauth/authorize", async (req, res) => {
  const body = req.body || {};
  const { redirect_uri, state, code_challenge, code_challenge_method, email, password } = body;

  if (!redirect_uri) {
    return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri required" });
  }

  const reRender = (error) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(401).send(consentPage({ params: body, error }));
  };

  if (!email || !password) {
    return reRender("Enter your email and password.");
  }

  // Authenticate against the same User store as the web app.
  let user;
  try {
    user = await User.findOne({ email: String(email).toLowerCase().trim() });
  } catch {
    return reRender("Something went wrong. Please try again.");
  }
  if (!user) {
    return reRender("Invalid email or password.");
  }
  if (!user.password) {
    return reRender("This account uses Google sign-in. Create a password in Blinkbox settings to connect Claude.");
  }
  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) {
    return reRender("Invalid email or password.");
  }
  if (!user.emailVerified) {
    return reRender("Please verify your email at blinkbox.net before connecting.");
  }

  // Mint a fresh, labeled key bound to this user for this connection.
  const today = new Date().toISOString().slice(0, 10);
  let rawKey;
  try {
    rawKey = await mintKeyForUser(user._id, `Claude connector — ${today}`);
  } catch {
    return reRender("Could not create a connection key. Please try again.");
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

  let u;
  try {
    u = new URL(String(redirect_uri));
  } catch {
    return res.status(400).json({ error: "invalid_request", error_description: "invalid redirect_uri" });
  }
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

  // Confirm the minted key is still live (not revoked between authorize and now).
  try {
    const record = await ApiKey.findOne({ hashedKey: hashApiKey(claims.k), revoked: false });
    if (!record) return res.status(400).json({ error: "invalid_grant", error_description: "API key revoked." });
  } catch {
    return res.status(400).json({ error: "invalid_grant", error_description: "API key check failed." });
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
