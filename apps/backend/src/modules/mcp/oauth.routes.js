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
import { hashApiKey } from "./apiKey.middleware.js";
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

// Temporary: trace OAuth/discovery hits into the same ring the /api/mcp endpoint
// uses, so the full login → token → reconnect sequence is visible at
// GET /api/mcp/_recent. Scoped to connector paths only — this router is mounted
// at "/", so without the filter the dashboard's own traffic floods the ring.
// Remove once the Claude connection is fixed.
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
    status: null,
  };
  res.on("finish", () => {
    entry.status = res.statusCode;
  });
  record(entry);
  next();
});

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
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp", "offline_access"],
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
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
    client_name: body.client_name || "MCP Client",
  });
});

// ── Consent page ──────────────────────────────────────────────────────────────
// Self-contained dark-mode login + Allow screen. The OAuth params ride through
// as hidden fields so the POST can rebuild the redirect. `error` shows a failed
// login inline without losing the flow.
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
  ["redirect_uri", "state", "code_challenge", "code_challenge_method", "scope"].forEach((k) => {
    if (params[k] != null && params[k] !== "") gStart.set(k, String(params[k]));
  });
  const googleLogo = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>`;
  const googleBlock = googleClientId
    ? `<div class="div"><span>or</span></div>
    <a class="gbtn" href="/oauth/google/start?${esc(gStart.toString())}">${googleLogo}<span>Continue with Google</span></a>`
    : `<div class="div"><span>Scoped &amp; revocable</span></div>`;
  const googleScript = "";
  const mailIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
  const lockIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const arrowIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect to Blinkbox</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; color: #fff; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; -webkit-font-smoothing: antialiased; }
  .wrap { width: 100%; max-width: 380px; }
  .brand { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 40px; animation: fadeUp 0.7s ease-out; }
  .logo { position: relative; width: 64px; height: 64px; margin-bottom: 32px; }
  .logo .ring { position: absolute; inset: 0; border-radius: 9999px; background: rgba(255,255,255,0.1); animation: pulse-ring 3s ease-out infinite; }
  .logo img { position: relative; width: 64px; height: 64px; object-fit: contain; animation: float 6s ease-in-out infinite; }
  .brand h1 { font-size: 30px; font-weight: 900; letter-spacing: 0.05em; margin-bottom: 8px; }
  .brand .tag { font-size: 11px; letter-spacing: 0.3em; color: #525252; text-transform: uppercase; }
  .head { font-size: 22px; font-weight: 700; margin-bottom: 4px; animation: slideSwitch 0.3s ease-out; }
  .sub { font-size: 14px; color: #525252; margin-bottom: 24px; line-height: 1.5; }
  .sub b { color: #d4d4d4; font-weight: 600; }
  label { display: block; font-size: 11px; font-weight: 500; color: #737373; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .field { position: relative; margin-bottom: 14px; }
  .field svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #404040; transition: color 0.2s; pointer-events: none; }
  .field:focus-within svg { color: #fff; }
  .field input { width: 100%; background: #0a0a0a; border: 1px solid #171717; border-radius: 8px; padding: 10px 12px 10px 36px; font-size: 14px; color: #fff; outline: none; transition: border-color 0.2s; }
  .field input::placeholder { color: #404040; }
  .field input:focus { border-color: #525252; }
  button { width: 100%; border: none; border-radius: 8px; padding: 11px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.1s; display: flex; align-items: center; justify-content: center; gap: 8px; }
  button svg { width: 16px; height: 16px; }
  .allow { background: #fff; color: #000; margin-top: 8px; }
  .allow:hover { background: #f5f5f5; }
  .allow:active { transform: scale(0.98); }
  .err { background: #0a0a0a; border: 1px solid #171717; color: #f87171; font-size: 14px; padding: 10px 12px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 10px; animation: fadeUp 0.2s ease-out; }
  .err svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
  .div { position: relative; margin: 20px 0; text-align: center; }
  .div::before { content: ""; position: absolute; inset: 50% 0 auto; border-top: 1px solid #171717; }
  .div span { position: relative; background: #000; padding: 0 12px; font-size: 11px; font-weight: 500; color: #525252; text-transform: uppercase; letter-spacing: 0.05em; }
  .gbtn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; background: #131314; border: 1px solid #2e2e2e; border-radius: 8px; padding: 11px; font-size: 14px; font-weight: 600; color: #e3e3e3; text-decoration: none; transition: background 0.2s, border-color 0.2s; }
  .gbtn:hover { background: #1c1c1d; border-color: #404040; }
  .gbtn svg { flex-shrink: 0; }
  .foot { font-size: 11px; color: #2e2e2e; text-align: center; margin-top: 28px; line-height: 1.6; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideSwitch { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.15; } 100% { transform: scale(2.5); opacity: 0; } }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <div class="logo"><div class="ring"></div><img src="/oauth/logo.svg" alt="Blinkbox" /></div>
      <h1>Blinkbox</h1>
      <div class="tag">Automation Engine</div>
    </div>
    <h2 class="head">Connect to Claude</h2>
    <p class="sub">Sign in to let <b>Claude</b> access your workspace — list, run, and build automations on your behalf.</p>
    ${errBanner}
    <form method="POST" action="/oauth/authorize">
      ${hidden}
      <label for="email">Email</label>
      <div class="field">${mailIcon}<input id="email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required autofocus /></div>
      <label for="password">Password</label>
      <div class="field">${lockIcon}<input id="password" name="password" type="password" autocomplete="current-password" placeholder="Your password" required /></div>
      <button class="allow" type="submit" name="decision" value="allow">Sign In &amp; Allow ${arrowIcon}</button>
    </form>
    ${googleBlock}
    <p class="foot">Connecting grants Claude a scoped key to your workspace.<br/>You can revoke it anytime in Blinkbox → API Keys.</p>
  </div>
  ${googleScript}
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
  res.send(consentPage({ params: req.query, error: null, googleClientId: GOOGLE_CLIENT_ID }));
});

// ── Authorize (POST) — authenticate, mint key, issue code ─────────────────────
router.post("/oauth/authorize", async (req, res) => {
  const body = req.body || {};
  const { redirect_uri, state, code_challenge, code_challenge_method, scope, email, password } = body;

  if (!redirect_uri) {
    return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri required" });
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

  return issueCodeAndRedirect(res, user, { redirect_uri, state, code_challenge, code_challenge_method, scope }, reRender);
});

// Shared tail for both password and Google sign-in: mint a per-connection key,
// sign a 5-min PKCE-bound auth code, 302 back to the client's redirect_uri.
async function issueCodeAndRedirect(res, user, params, onError) {
  const { redirect_uri, state, code_challenge, code_challenge_method, scope } = params;
  const today = new Date().toISOString().slice(0, 10);
  let rawKey;
  try {
    rawKey = await mintKeyForUser(user._id, `Claude connector — ${today}`);
  } catch (e) {
    console.error("[mcp issueCode] mint key failed:", e?.message || e);
    return onError(`Could not create a connection key. (debug: ${e?.message || "unknown"})`);
  }

  const code = jwt.sign(
    {
      k: rawKey,
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
router.get("/oauth/google/start", (req, res) => {
  const { redirect_uri, state, code_challenge, code_challenge_method, scope } = req.query;
  if (!redirect_uri) {
    return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri required" });
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
  const params = { redirect_uri: st.ru, state: st.st, code_challenge: st.cc, code_challenge_method: st.ccm, scope: st.sc };
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

  return issueCodeAndRedirect(res, user, params, reRender);
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
  const body = req.body || {};
  const grantType = body.grant_type;

  // Refresh grant: re-issue the same key if it's still live.
  if (grantType === "refresh_token") {
    const rt = body.refresh_token;
    if (!rt) {
      return res.status(400).json({ error: "invalid_request", error_description: "refresh_token required" });
    }
    let rc;
    try {
      rc = jwt.verify(String(rt), JWT_SECRET);
    } catch {
      return res.status(400).json({ error: "invalid_grant", error_description: "refresh_token expired or invalid" });
    }
    if (rc.t !== "mcp_refresh") {
      return res.status(400).json({ error: "invalid_grant" });
    }
    try {
      if (!(await keyIsLive(rc.k))) {
        return res.status(400).json({ error: "invalid_grant", error_description: "API key revoked." });
      }
    } catch {
      return res.status(400).json({ error: "invalid_grant", error_description: "API key check failed." });
    }
    return res.json(tokenResponse(rc.k, body.scope));
  }

  if (grantType !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  const code = body.code;
  const codeVerifier = body.code_verifier;
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
    if (!(await keyIsLive(claims.k))) {
      return res.status(400).json({ error: "invalid_grant", error_description: "API key revoked." });
    }
  } catch {
    return res.status(400).json({ error: "invalid_grant", error_description: "API key check failed." });
  }

  return res.json(tokenResponse(claims.k, claims.sc));
});

export default router;
