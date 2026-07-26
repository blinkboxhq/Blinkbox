import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library";
import { JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../../config/env.js";
import ApiKey from "../../models/apiKey.model.js";
import User from "../../models/user.model.js";
import McpOAuthClient from "../../models/mcpOAuthClient.model.js";
import { hashApiKey, isMcpHost } from "./apiKey.middleware.js";
import { record } from "./mcp.routes.js";

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

// Trace OAuth/discovery hits into the same in-process ring the /api/mcp endpoint
// uses, so the full login → token → reconnect sequence is captured. No route
// exposes the ring; only non-secret flags (has_pkce/has_verifier/…) are stored,
// never the token/code/verifier. Scoped to connector paths only — this router is
// mounted at "/", so without the filter the dashboard's own traffic floods it.
const TRACE_RE = /^\/(oauth\/|\.well-known\/)/;
router.use((req, res, next) => {
  if (!TRACE_RE.test(req.path)) return next();
  const b = req.body || {};
  const q = req.query || {};
  const entry = {
    at: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl.split("?")[0],
    client: "oauth",
    rpc: req.path.replace(/^\//, ""),
    scope: b.scope || q.scope || null,
    grant_types: b.grant_types || b.grant_type || null,
    response_type: b.response_type || q.response_type || null,
    resource: b.resource || q.resource || null,
    redirect_uri: b.redirect_uri || q.redirect_uri || null,
    client_id: b.client_id || q.client_id || null,
    has_pkce: !!(b.code_challenge || q.code_challenge),
    has_verifier: !!(b.code_verifier || q.code_verifier),
    has_refresh: !!(b.refresh_token || q.refresh_token),
    dbg: null,
    status: null,
  };
  req._traceEntry = entry;
  res.on("finish", () => {
    entry.status = res.statusCode;
  });
  record(entry);
  next();
});

// Let a handler annotate WHY it returned the status it did, written into the
// same ring entry as the exact failure branch.
function dbg(req, reason) {
  if (req._traceEntry) req._traceEntry.dbg = reason;
}

// Logo served from disk once, cached in memory — the consent page mirrors the web
// app's login screen, which renders this same asset. apps/backend/public/logo.svg
// is four dirs up from this module (mcp → modules → src → backend).
const __dir = path.dirname(fileURLToPath(import.meta.url));
let _logoSvg = null;
function logoSvg() {
  if (_logoSvg === null) {
    try {
      _logoSvg = fs.readFileSync(path.resolve(__dir, "../../../public/logo.svg"), "utf8");
    } catch {
      _logoSvg = "";
    }
  }
  return _logoSvg;
}

router.get("/oauth/logo.svg", (_req, res) => {
  const svg = logoSvg();
  if (!svg) return res.status(404).end();
  res.set("Content-Type", "image/svg+xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=86400, immutable");
  res.send(svg);
});

// Public host the client actually called (api.blinkbox.net), not an internal
// Railway hostname — the issuer/endpoints must match what the client dialed.
function baseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

// The single, stable resource every connector authenticates against. On the
// dedicated MCP host this is the BARE ORIGIN (https://mcp.blinkbox.net), exactly
// like higgsfield's https://mcp.higgsfield.ai — the shape Claude's relay
// connects to cleanly. On the shared api host it stays path-suffixed so older
// connectors still resolve.
function mcpResource(req) {
  return isMcpHost(req) ? baseUrl(req) : `${baseUrl(req)}/api/mcp`;
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
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp", "offline_access"],
    authorization_response_iss_parameter_supported: true,
  });
}
router.get("/.well-known/oauth-authorization-server", authServerMetadata);
router.get(/^\/\.well-known\/oauth-authorization-server\/.*/, authServerMetadata);
router.get("/.well-known/openid-configuration", authServerMetadata);

// ── Dynamic Client Registration (RFC 7591) ────────────────────────────────────
// Registrations are now persisted so /oauth/authorize and /oauth/token can
// confirm a redirect_uri was actually declared here instead of trusting
// whatever value shows up later in the flow (see validateClient below).
router.post("/oauth/register", async (req, res) => {
  const body = req.body || {};
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
  if (!redirectUris.length) {
    return res.status(400).json({ error: "invalid_client_metadata", error_description: "redirect_uris is required" });
  }
  for (const uri of redirectUris) {
    let parsed;
    try {
      parsed = new URL(uri);
    } catch {
      return res.status(400).json({ error: "invalid_redirect_uri", error_description: `Invalid redirect_uri: ${uri}` });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).json({ error: "invalid_redirect_uri", error_description: `redirect_uri must be http or https: ${uri}` });
    }
  }

  const clientId = `mcp-${crypto.randomBytes(8).toString("hex")}`;
  try {
    await McpOAuthClient.create({
      clientId,
      redirectUris,
      clientName: body.client_name || "MCP Client",
    });
  } catch (e) {
    console.error("[mcp register] persist failed:", e?.message || e);
    return res.status(500).json({ error: "server_error", error_description: "Could not register client." });
  }

  res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    redirect_uris: redirectUris,
    client_name: body.client_name || "MCP Client",
  });
});

// RFC 6749 §3.1.2.3: the redirect_uri presented at /authorize (and again at
// /token, §4.1.3) must match one declared by this client_id at registration.
// Without this check, anyone can register their own client_id + redirect_uri,
// walk a legitimate user through the real Blinkbox login/consent screen, and
// have that victim's freshly minted API key delivered straight to their own
// server — a phishing-based account takeover, not a theoretical gap.
async function validateClient(clientId, redirectUri) {
  if (!clientId || !redirectUri) {
    return { ok: false, reason: "client_id and redirect_uri are required" };
  }
  let client;
  try {
    client = await McpOAuthClient.findOne({ clientId: String(clientId) });
  } catch {
    return { ok: false, reason: "Could not verify client." };
  }
  if (!client) {
    return { ok: false, reason: "Unknown client_id. Reconnect to re-register the connector." };
  }
  if (!client.redirectUris.includes(String(redirectUri))) {
    return { ok: false, reason: "redirect_uri does not match the one registered for this client." };
  }
  return { ok: true, client };
}

// ── Consent page ──────────────────────────────────────────────────────────────
// Self-contained login + Allow screen, a pixel copy of the web app's login page
// (apps/frontend/src/pages/auth) — no bundler runs here, so its tokens and
// component rules are inlined below. The OAuth params ride through as hidden
// fields so the POST can rebuild the redirect. `error` shows a failed login
// inline without losing the flow.
function consentPage({ params, error, googleClientId }) {
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );
  const hidden = ["redirect_uri", "state", "code_challenge", "code_challenge_method", "client_id", "scope", "resource"]
    .map((k) => `<input type="hidden" name="${k}" value="${esc(params[k])}" />`)
    .join("");
  const alertIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
  const errBanner = error
    ? `<div class="err">${alertIcon}<span>${esc(error)}</span></div>`
    : "";
  // Redirect-based Google flow (no iframes): a plain link to /oauth/google/start
  // carries the MCP OAuth params as query, then bounces to accounts.google.com.
  // GIS's button/transform iframes are blocked inside Claude's OAuth popup, so an
  // anchor + full-page navigation is the only thing that survives there.
  const gStart = new URLSearchParams();
  ["redirect_uri", "client_id", "state", "code_challenge", "code_challenge_method", "scope"].forEach((k) => {
    if (params[k] != null && params[k] !== "") gStart.set(k, String(params[k]));
  });
  // Same 48-viewBox mark the web app's login page uses, so the two buttons are
  // pixel-identical.
  const googleLogo = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
  const googleBlock = googleClientId
    ? `<div class="div"><span>or</span></div>
      <a class="gbtn" href="/oauth/google/start?${esc(gStart.toString())}">${googleLogo}<span>Sign in with Google</span></a>`
    : `<div class="div"><span>Scoped &amp; revocable</span></div>`;
  const mailIcon = `<svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
  const lockIcon = `<svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const arrowIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
  const eyeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect to Blinkbox</title>
<style>
  /* Tokens and component rules lifted verbatim from the web app's index.css so
     this page renders as the same material as apps/frontend .../pages/auth. */
  :root {
    --bb-surface-0: #0f0f0f;
    --bb-surface-1: #1b1b1b;
    --bb-surface-2: #262626;
    --bb-border-subtle: #2b2b2b;
    --bb-border: #3b3b3b;
    --bb-border-strong: #545454;
    --bb-text-hi: #fafafa;
    --bb-text-mid: #b6b6b6;
    --bb-text-lo: #8c8c8c;
    --bb-text-dim: #6d6d6d;
    --bb-radius: 14px;
    --bb-radius-sm: 10px;
    --bb-shadow-card: 0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -16px rgba(0,0,0,0.7);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    position: relative; overflow: hidden;
    background: var(--bb-surface-0); color: var(--bb-text-mid);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 48px 24px; -webkit-font-smoothing: antialiased;
  }

  /* Ambient dot grid + cursor spotlight (AmbientBackground.jsx / .bb-ambient) */
  .bb-ambient {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    --mx: 50vw; --my: 50vh;
    background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 16px 16px; background-position: -8px -8px;
  }
  .bb-ambient::after {
    content: ""; position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px);
    background-size: 16px 16px; background-position: -8px -8px;
    -webkit-mask-image: radial-gradient(220px 220px at var(--mx) var(--my), #000 0%, rgba(0,0,0,0.35) 45%, transparent 70%);
    mask-image: radial-gradient(220px 220px at var(--mx) var(--my), #000 0%, rgba(0,0,0,0.35) 45%, transparent 70%);
  }
  .glow {
    position: absolute; top: -192px; left: 50%; transform: translateX(-50%);
    width: 720px; height: 420px; pointer-events: none;
    background: radial-gradient(ellipse at center, rgba(111,151,232,0.09), transparent 70%);
  }

  .brand {
    position: relative; z-index: 10; margin-bottom: 32px;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    animation: fadeUp 0.5s ease-out both;
  }
  .brand img { width: 40px; height: 40px; object-fit: contain; filter: drop-shadow(0 0 14px rgba(111,151,232,0.35)); }
  .brand span { font-size: 15px; font-weight: 600; letter-spacing: -0.025em; color: var(--bb-text-hi); }

  /* .bb-card */
  .card {
    position: relative; z-index: 10; width: 100%; max-width: 400px; padding: 28px;
    background: var(--bb-surface-1); border: 1px solid var(--bb-border-subtle);
    border-radius: var(--bb-radius); box-shadow: var(--bb-shadow-card);
    animation: fadeUp 0.55s ease-out 0.06s both;
  }
  .card::before {
    content: ""; position: absolute; left: 40px; right: 40px; top: 0; height: 1px; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(111,151,232,0.5), transparent);
  }

  .head { font-size: 20px; font-weight: 700; letter-spacing: -0.025em; color: var(--bb-text-hi); }
  .sub { margin: 4px 0 24px; font-size: 13px; color: var(--bb-text-lo); }
  .sub b { color: var(--bb-text-mid); font-weight: 600; }
  .intro { animation: slideSwitch 0.3s ease-out; }

  .err {
    margin-bottom: 20px; display: flex; align-items: flex-start; gap: 10px;
    border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.06);
    border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #f87171;
    animation: fadeUp 0.2s ease-out;
  }
  .err svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }

  .fields { display: flex; flex-direction: column; gap: 14px; }
  label { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--bb-text-lo); }
  .group { position: relative; }
  .group svg.lead { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--bb-text-dim); transition: color 0.2s; pointer-events: none; }
  .group:focus-within svg.lead { color: var(--bb-text-hi); }
  /* .bb-input */
  .group input {
    width: 100%; background: var(--bb-surface-1); border: 1px solid var(--bb-border-subtle);
    border-radius: var(--bb-radius-sm); color: var(--bb-text-hi);
    padding: 10px 12px 10px 36px; font-size: 13px; font-family: inherit;
    outline: none; transition: border-color 0.15s ease;
  }
  .group input::placeholder { color: var(--bb-text-dim); }
  .group input:focus { border-color: var(--bb-border-strong); }
  #password { padding-right: 40px; }
  .pwtoggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    display: flex; background: none; border: none; padding: 0; cursor: pointer;
    color: var(--bb-text-dim); transition: color 0.15s ease;
  }
  .pwtoggle:hover { color: var(--bb-text-mid); }
  .pwtoggle svg { width: 16px; height: 16px; }
  .pwtoggle .off { display: none; }
  .pwtoggle.on .on { display: none; }
  .pwtoggle.on .off { display: flex; }

  /* .bb-btn .bb-btn-primary */
  .allow {
    margin-top: 20px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 10px; border: none; border-radius: var(--bb-radius-sm);
    background: #fafafa; color: #09090b; font-size: 13px; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: all 0.15s ease;
  }
  .allow:hover { background: #fff; }
  .allow:active { transform: scale(0.97); }
  .allow svg { width: 16px; height: 16px; }

  .div { position: relative; margin: 20px 0; text-align: center; }
  .div::before { content: ""; position: absolute; top: 50%; left: 0; right: 0; border-top: 1px solid var(--bb-border-subtle); }
  .div span { position: relative; background: var(--bb-surface-1); padding: 0 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--bb-text-dim); }

  .gbtn {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    height: 44px; width: 100%; border: 1px solid var(--bb-border-subtle);
    border-radius: var(--bb-radius-sm); background: var(--bb-surface-0);
    font-size: 13px; font-weight: 500; color: var(--bb-text-mid);
    text-decoration: none; transition: all 0.2s ease;
  }
  .gbtn:hover { border-color: var(--bb-border); color: var(--bb-text-hi); }
  .gbtn svg { width: 18px; height: 18px; flex-shrink: 0; }

  .foot { position: relative; z-index: 10; margin-top: 24px; text-align: center; font-size: 11px; color: var(--bb-text-dim); line-height: 1.6; animation: fadeIn 0.6s ease-out 0.25s both; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideSwitch { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
</head>
<body>
  <div class="bb-ambient" aria-hidden="true"></div>
  <div class="glow" aria-hidden="true"></div>

  <div class="brand">
    <img src="/oauth/logo.svg" alt="Blinkbox" />
    <span>blinkbox</span>
  </div>

  <div class="card">
    <div class="intro">
      <h1 class="head">Connect to Claude</h1>
      <p class="sub">Sign in to let <b>Claude</b> access your workspace — list, run, and build automations on your behalf.</p>
    </div>
    ${errBanner}
    <form method="POST" action="/oauth/authorize">
      ${hidden}
      <div class="fields">
        <div>
          <label for="email">Email</label>
          <div class="group">${mailIcon}<input id="email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required autofocus /></div>
        </div>
        <div>
          <label for="password">Password</label>
          <div class="group">
            ${lockIcon}<input id="password" name="password" type="password" autocomplete="current-password" placeholder="Min. 8 characters" required />
            <button class="pwtoggle" id="pwtoggle" type="button" tabindex="-1" aria-label="Show password"><span class="on">${eyeIcon}</span><span class="off">${eyeOffIcon}</span></button>
          </div>
        </div>
      </div>
      <button class="allow" type="submit" name="decision" value="allow">Sign In &amp; Allow ${arrowIcon}</button>
    </form>
    ${googleBlock}
  </div>

  <p class="foot">Connecting grants Claude a scoped key to your workspace.<br/>You can revoke it anytime in Blinkbox → API Keys.</p>
<script>
(function () {
  var amb = document.querySelector(".bb-ambient"), raf = 0;
  if (amb) window.addEventListener("pointermove", function (e) {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      amb.style.setProperty("--mx", e.clientX + "px");
      amb.style.setProperty("--my", e.clientY + "px");
    });
  }, { passive: true });
  var t = document.getElementById("pwtoggle"), p = document.getElementById("password");
  if (t && p) t.addEventListener("click", function () {
    var reveal = p.type === "password";
    p.type = reveal ? "text" : "password";
    t.classList.toggle("on", reveal);
    t.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
  });
})();
</script>
</body>
</html>`;
}

// ── Authorize (GET) — render the login + consent screen ───────────────────────
router.get("/oauth/authorize", async (req, res) => {
  const { redirect_uri, client_id } = req.query;
  if (!redirect_uri || !client_id) {
    return res.status(400).json({ error: "invalid_request", error_description: "client_id and redirect_uri required" });
  }
  const check = await validateClient(client_id, redirect_uri);
  if (!check.ok) {
    dbg(req, `authorize(get): ${check.reason}`);
    return res.status(400).json({ error: "invalid_request", error_description: check.reason });
  }
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(consentPage({ params: req.query, error: null, googleClientId: GOOGLE_CLIENT_ID }));
});

// ── Authorize (POST) — authenticate, mint key, issue code ─────────────────────
router.post("/oauth/authorize", async (req, res) => {
  const body = req.body || {};
  const { redirect_uri, client_id, state, code_challenge, code_challenge_method, scope, email, password } = body;

  if (!redirect_uri || !client_id) {
    return res.status(400).json({ error: "invalid_request", error_description: "client_id and redirect_uri required" });
  }
  const check = await validateClient(client_id, redirect_uri);
  if (!check.ok) {
    dbg(req, `authorize(post): ${check.reason}`);
    return res.status(400).json({ error: "invalid_request", error_description: check.reason });
  }

  const reRender = (error) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(401).send(consentPage({ params: body, error, googleClientId: GOOGLE_CLIENT_ID }));
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

  return issueCodeAndRedirect(req, res, user, { redirect_uri, client_id, state, code_challenge, code_challenge_method, scope }, reRender);
});

// Shared tail for both password and Google sign-in: mint a per-connection key,
// sign a 5-min PKCE-bound auth code, 302 back to the client's redirect_uri.
// `iss` (RFC 9207) is appended so the connector's recorded-issuer check passes;
// without it, strict clients (Claude/ChatGPT) discard the freshly issued token
// and loop the whole OAuth flow with a new client_id instead of calling /api/mcp.
async function issueCodeAndRedirect(req, res, user, params, onError) {
  const { redirect_uri, client_id, state, code_challenge, code_challenge_method, scope } = params;
  const today = new Date().toISOString().slice(0, 10);
  let rawKey;
  try {
    rawKey = await mintKeyForUser(user._id, `Claude connector — ${today}`);
  } catch (e) {
    console.error("[mcp issueCode] mint key failed:", e?.message || e);
    return onError(`Could not create a connection key. (debug: ${e?.message || "unknown"})`);
  }

  // client_id/redirect_uri ride along in the code so /oauth/token can confirm
  // (RFC 6749 §4.1.3) the token exchange is happening for the same client that
  // was validated at /oauth/authorize, not just whoever holds the code.
  const code = jwt.sign(
    {
      k: rawKey,
      cid: client_id || null,
      ru: redirect_uri || null,
      cc: code_challenge || null,
      ccm: (code_challenge_method || "plain").toLowerCase(),
      sc: scope || null,
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
  u.searchParams.set("iss", baseUrl(req));
  console.error("[mcp issueCode] redirecting back to client", { host: u.host, path: u.pathname, hasState: !!state });
  return res.redirect(302, u.toString());
}

// The redirect URI Google bounces back to — must be registered in the Google
// Cloud Console for this client. Derived from the public host so prod and any
// preview env each resolve to their own callback.
function googleRedirectUri(req) {
  return `${baseUrl(req)}/oauth/google/callback`;
}

// ── Google sign-in: start (GET) — full-page redirect to Google ────────────────
// No iframes: GIS's button/transform iframes are blocked in Claude's popup, so
// we send the browser straight to accounts.google.com. The MCP OAuth params ride
// through Google's own `state`, signed so the callback can trust them.
router.get("/oauth/google/start", async (req, res) => {
  const { redirect_uri, client_id, state, code_challenge, code_challenge_method, scope } = req.query;
  if (!redirect_uri || !client_id) {
    return res.status(400).json({ error: "invalid_request", error_description: "client_id and redirect_uri required" });
  }
  const check = await validateClient(client_id, redirect_uri);
  if (!check.ok) {
    dbg(req, `google/start: ${check.reason}`);
    return res.status(400).json({ error: "invalid_request", error_description: check.reason });
  }
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(503).send(
      consentPage({
        params: req.query,
        error: "Google sign-in isn't configured. Use your email and password.",
        googleClientId: null,
      }),
    );
  }

  const gState = jwt.sign(
    {
      ru: String(redirect_uri),
      ci: String(client_id),
      st: state ? String(state) : null,
      cc: code_challenge ? String(code_challenge) : null,
      ccm: code_challenge_method ? String(code_challenge_method) : null,
      sc: scope ? String(scope) : null,
      t: "mcp_google_state",
    },
    JWT_SECRET,
    { expiresIn: "10m" },
  );

  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, googleRedirectUri(req));
  const url = client.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state: gState,
  });
  return res.redirect(302, url);
});

// ── Google sign-in: callback (GET) — exchange code, mint key, issue MCP code ──
router.get("/oauth/google/callback", async (req, res) => {
  const { code, state: gState, error: gError } = req.query;
  console.error("[mcp google callback] HIT", { hasCode: !!code, hasState: !!gState, gError: gError || null });

  // Decode the signed state to recover the original MCP OAuth params first, so a
  // failure can re-render the consent page instead of dead-ending.
  let st;
  try {
    st = jwt.verify(String(gState || ""), JWT_SECRET);
    if (st.t !== "mcp_google_state") throw new Error("bad state");
  } catch (e) {
    console.error("[mcp google callback] state verify failed:", e?.message || e);
    return res.status(400).json({ error: "invalid_request", error_description: "Google sign-in expired. Start again." });
  }
  const params = { redirect_uri: st.ru, client_id: st.ci, state: st.st, code_challenge: st.cc, code_challenge_method: st.ccm, scope: st.sc };
  const reRender = (error) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(401).send(consentPage({ params, error, googleClientId: GOOGLE_CLIENT_ID }));
  };

  if (gError) return reRender("Google sign-in was cancelled. Try again or use your email and password.");
  if (!code) return reRender("Google sign-in failed. Please try again.");
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return reRender("Google sign-in isn't configured. Use your email and password.");
  }

  // Exchange the code server-side (uses the client secret — never leaves here)
  // and verify the returned id_token.
  let payload;
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, googleRedirectUri(req));
    const { tokens } = await client.getToken(String(code));
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (e) {
    console.error("[mcp google callback] verify failed:", e?.response?.data || e?.message || e);
    const detail = e?.response?.data?.error_description || e?.response?.data?.error || e?.message || "unknown";
    return reRender(`Could not verify your Google identity. (debug: ${detail})`);
  }

  const email = payload?.email;
  const googleId = payload?.sub;
  if (!email || !googleId) {
    return reRender("Google did not return an email. Please try again.");
  }

  // Match the web app: an existing password account with this email that hasn't
  // linked Google must sign in with their password first.
  let user;
  try {
    user = await User.findOne({ email: String(email).toLowerCase().trim() });
  } catch {
    return reRender("Something went wrong. Please try again.");
  }
  if (user && !user.googleId) {
    return reRender("This email already has a password account. Sign in with your password instead.");
  }
  if (user && user.googleId !== googleId) {
    return reRender("Google account mismatch. Please try again.");
  }
  if (!user) {
    try {
      user = await User.create({
        name: payload.name || payload.given_name || email.split("@")[0],
        email,
        authProvider: "google",
        googleId,
        picture: payload.picture || "",
        role: "user",
        emailVerified: true,
      });
    } catch (e) {
      console.error("[mcp google callback] user create failed:", e?.message || e);
      return reRender(`Could not create your account. (debug: ${e?.message || "unknown"})`);
    }
  }

  return issueCodeAndRedirect(req, res, user, params, reRender);
});

// Scopes we actually grant. Claude registers and authorizes with
// "mcp offline_access" — it needs offline_access acknowledged in the granted
// scope to consider the connector grant complete, otherwise it aborts before
// opening the MCP session even after a 200 token exchange. We always satisfy
// offline_access (a refresh_token is issued below), so we echo back exactly the
// requested scopes that we support rather than a hardcoded "mcp".
const SUPPORTED_SCOPES = new Set(["mcp", "offline_access"]);
function grantScope(requested) {
  const granted = String(requested || "")
    .split(/\s+/)
    .filter((s) => SUPPORTED_SCOPES.has(s));
  if (!granted.includes("mcp")) granted.unshift("mcp");
  if (!granted.includes("offline_access")) granted.push("offline_access");
  return granted.join(" ");
}

// Build the standard token response. The access token IS the bb_live_ key —
// verifyMcpAuth already accepts it as a Bearer token. We also issue a
// refresh_token: strict connectors (Claude's web relay) treat a connector grant
// without one as incomplete and abort before opening the MCP session, even after
// a 200 token exchange. The refresh token is a signed pointer back to the key;
// exchanging it re-validates the key and returns it again. The key is long-lived
// and revocable in the dashboard, so we advertise a one-year access window.
function tokenResponse(rawKey, scope) {
  const refreshToken = jwt.sign(
    { k: rawKey, t: "mcp_refresh" },
    JWT_SECRET,
    { expiresIn: "365d" },
  );
  return {
    access_token: rawKey,
    token_type: "Bearer",
    expires_in: 31536000,
    refresh_token: refreshToken,
    scope: grantScope(scope),
  };
}

async function keyIsLive(rawKey) {
  const record = await ApiKey.findOne({ hashedKey: hashApiKey(rawKey), revoked: false });
  return !!record;
}

// ── Token ─────────────────────────────────────────────────────────────────────
// Exchange the auth code (+ PKCE verifier) for the API key, or refresh.
router.post("/oauth/token", async (req, res) => {
  // RFC 6749 §5.1: token responses MUST NOT be cached. Strict connectors
  // (claude.ai's relay) treat a token delivered without no-store as untrusted
  // and decline to attach it to subsequent MCP requests.
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  const body = req.body || {};
  const grantType = body.grant_type;

  // Refresh grant: re-issue the same key if it's still live.
  if (grantType === "refresh_token") {
    const rt = body.refresh_token;
    if (!rt) {
      dbg(req, "refresh: no refresh_token in body");
      return res.status(400).json({ error: "invalid_request", error_description: "refresh_token required" });
    }
    let rc;
    try {
      rc = jwt.verify(String(rt), JWT_SECRET);
    } catch (e) {
      dbg(req, `refresh: jwt.verify threw: ${e?.name}:${e?.message}`);
      return res.status(400).json({ error: "invalid_grant", error_description: "refresh_token expired or invalid" });
    }
    if (rc.t !== "mcp_refresh") {
      dbg(req, `refresh: wrong token type t=${rc.t}`);
      return res.status(400).json({ error: "invalid_grant" });
    }
    try {
      if (!(await keyIsLive(rc.k))) {
        dbg(req, "refresh: keyIsLive=false (revoked/missing)");
        return res.status(400).json({ error: "invalid_grant", error_description: "API key revoked." });
      }
    } catch (e) {
      dbg(req, `refresh: keyIsLive threw: ${e?.message}`);
      return res.status(400).json({ error: "invalid_grant", error_description: "API key check failed." });
    }
    dbg(req, "refresh: OK");
    return res.json(tokenResponse(rc.k, body.scope));
  }

  if (grantType !== "authorization_code") {
    dbg(req, `unsupported grant_type=${grantType}`);
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  const code = body.code;
  const codeVerifier = body.code_verifier;
  if (!code) {
    dbg(req, "code: no code in body");
    return res.status(400).json({ error: "invalid_request", error_description: "code required" });
  }

  let claims;
  try {
    claims = jwt.verify(String(code), JWT_SECRET);
  } catch (e) {
    dbg(req, `code: jwt.verify threw: ${e?.name}:${e?.message}`);
    return res.status(400).json({ error: "invalid_grant", error_description: "code expired or invalid" });
  }
  if (claims.t !== "mcp_oauth_code") {
    dbg(req, `code: wrong token type t=${claims.t}`);
    return res.status(400).json({ error: "invalid_grant" });
  }

  // PKCE verification (only if a challenge was issued at authorize time).
  if (claims.cc) {
    if (!codeVerifier) {
      dbg(req, "code: PKCE challenge present but no code_verifier sent");
      return res.status(400).json({ error: "invalid_request", error_description: "code_verifier required" });
    }
    const computed = claims.ccm === "s256" ? sha256base64url(String(codeVerifier)) : String(codeVerifier);
    if (computed !== claims.cc) {
      dbg(req, `code: PKCE mismatch ccm=${claims.ccm}`);
      return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
    }
  }

  // RFC 6749 §4.1.3: if redirect_uri/client_id were supplied to /authorize, the
  // token exchange must present the same ones — a second check beyond the
  // registration-time validation already done, in case a code ever leaks.
  if (body.redirect_uri && claims.ru && String(body.redirect_uri) !== claims.ru) {
    dbg(req, "code: redirect_uri mismatch at token exchange");
    return res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
  }
  if (body.client_id && claims.cid && String(body.client_id) !== claims.cid) {
    dbg(req, "code: client_id mismatch at token exchange");
    return res.status(400).json({ error: "invalid_grant", error_description: "client_id mismatch" });
  }

  // Confirm the minted key is still live (not revoked between authorize and now).
  try {
    if (!(await keyIsLive(claims.k))) {
      dbg(req, "code: keyIsLive=false");
      return res.status(400).json({ error: "invalid_grant", error_description: "API key revoked." });
    }
  } catch (e) {
    dbg(req, `code: keyIsLive threw: ${e?.message}`);
    return res.status(400).json({ error: "invalid_grant", error_description: "API key check failed." });
  }

  dbg(req, "code: OK");
  return res.json(tokenResponse(claims.k, claims.sc));
});

export default router;
