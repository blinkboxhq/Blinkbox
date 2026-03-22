/**
 * OAUTH CONTROLLER
 *
 * Two endpoints:
 *   GET  /api/oauth/:provider/authorize  — redirects user to provider's consent screen
 *   GET  /api/oauth/:provider/callback   — exchanges code for tokens, saves to vault
 *
 * The frontend opens the authorize URL in a popup. On callback, we save the
 * credential and render a tiny HTML page that posts a message to the opener
 * window, which picks up the new credential ID.
 */

import axios from "axios";
import crypto from "crypto";
import { getProvider } from "./oauth.providers.js";
import Credential from "../../models/credential.model.js";
import { encrypt } from "../../utils/crypto.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET, BACKEND_URL } from "../../config/env.js";

// In-memory state store for CSRF protection (short-lived, <5 min)
const pendingStates = new Map();

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingStates) {
    if (now - val.createdAt > 5 * 60 * 1000) pendingStates.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * GET /api/oauth/:provider/authorize
 * Requires ?token=JWT in query (since this opens in a new tab, no cookie/header)
 */
export async function oauthAuthorize(req, res) {
  try {
    const { provider: providerName } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(401).json({ message: "Missing auth token." });
    }

    // Verify JWT manually (can't use middleware — this is a redirect, not an API call)
    let user;
    try {
      user = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const provider = getProvider(providerName);
    if (!provider) {
      return res.status(400).json({ message: `Unknown OAuth provider: ${providerName}` });
    }

    const clientId = process.env[provider.clientEnvKey];
    if (!clientId) {
      return res.status(500).json({ message: `${providerName} OAuth not configured. Set ${provider.clientEnvKey} in .env` });
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString("hex");
    pendingStates.set(state, {
      userId: user.id,
      provider: providerName,
      createdAt: Date.now(),
    });

    const callbackUrl = `${BACKEND_URL}/api/oauth/${providerName}/callback`;
    const scopes = provider.scopes.join(provider.scopeDelimiter || ",");

    // Build authorize URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      state,
    });

    // Slack uses `scope` for bot scopes (comma-separated)
    if (providerName === "slack") {
      params.set("scope", scopes);
    } else {
      params.set("scope", provider.scopes.join(" "));
    }

    // Airtable requires PKCE
    if (provider.usePKCE) {
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
      // Store verifier for token exchange
      pendingStates.get(state).codeVerifier = codeVerifier;
    }

    const authorizeUrl = `${provider.authorizeUrl}?${params.toString()}`;
    res.redirect(authorizeUrl);
  } catch (err) {
    console.error("[OAuth] Authorize error:", err.message);
    res.status(500).json({ message: "OAuth authorization failed." });
  }
}

/**
 * GET /api/oauth/:provider/callback
 * Provider redirects here with ?code=...&state=...
 */
export async function oauthCallback(req, res) {
  try {
    const { provider: providerName } = req.params;
    const { code, state, error } = req.query;

    if (error) {
      return renderPopupResult(res, { error: `Authorization denied: ${error}` });
    }

    if (!code || !state) {
      return renderPopupResult(res, { error: "Missing code or state parameter." });
    }

    // Validate CSRF state
    const pending = pendingStates.get(state);
    if (!pending || pending.provider !== providerName) {
      return renderPopupResult(res, { error: "Invalid or expired state. Please try again." });
    }
    pendingStates.delete(state);

    const provider = getProvider(providerName);
    if (!provider) {
      return renderPopupResult(res, { error: `Unknown provider: ${providerName}` });
    }

    const clientId = process.env[provider.clientEnvKey];
    const clientSecret = process.env[provider.secretEnvKey];

    if (!clientId || !clientSecret) {
      return renderPopupResult(res, { error: `${providerName} OAuth not fully configured on server.` });
    }

    const callbackUrl = `${BACKEND_URL}/api/oauth/${providerName}/callback`;

    // Exchange code for tokens
    const tokenParams = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    };

    if (provider.usePKCE && pending.codeVerifier) {
      tokenParams.code_verifier = pending.codeVerifier;
    }

    let tokenData;
    try {
      // Airtable wants Basic auth header instead of body params
      const headers = { "Content-Type": "application/x-www-form-urlencoded" };
      if (providerName === "airtable") {
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        headers["Authorization"] = `Basic ${basic}`;
        delete tokenParams.client_id;
        delete tokenParams.client_secret;
      }

      const tokenRes = await axios.post(
        provider.tokenUrl,
        new URLSearchParams(tokenParams).toString(),
        { headers, timeout: 15000 },
      );
      tokenData = tokenRes.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      console.error(`[OAuth] Token exchange failed for ${providerName}:`, msg);
      return renderPopupResult(res, { error: `Token exchange failed: ${msg}` });
    }

    // Parse tokens from provider-specific response
    const mapped = provider.mapTokens(tokenData);

    if (!mapped.accessToken) {
      return renderPopupResult(res, { error: "No access token received from provider." });
    }

    // Encrypt access token
    const { encryptedData, iv, authTag } = encrypt(mapped.accessToken);

    // Encrypt refresh token if present
    let refreshFields = {};
    if (mapped.refreshToken) {
      const rt = encrypt(mapped.refreshToken);
      refreshFields = {
        refreshToken: rt.encryptedData,
        refreshIv: rt.iv,
        refreshAuthTag: rt.authTag,
      };
    }

    // Build credential name
    const providerLabel = providerName.charAt(0).toUpperCase() + providerName.slice(1);
    const suffix = mapped.metadata?.teamName || mapped.metadata?.botUserId || "";
    const credName = suffix ? `${providerLabel} — ${suffix}` : `${providerLabel} OAuth`;

    // Save to vault
    const credential = await Credential.create({
      workspaceId: pending.userId,
      name: credName,
      type: "oauth",
      encryptedData,
      iv,
      authTag,
      provider: providerName,
      ...refreshFields,
      tokenExpiresAt: mapped.expiresIn
        ? new Date(Date.now() + mapped.expiresIn * 1000)
        : null,
      oauthMetadata: mapped.metadata || {},
    });

    renderPopupResult(res, {
      success: true,
      credential: {
        _id: credential._id,
        name: credential.name,
        type: credential.type,
        provider: credential.provider,
      },
    });
  } catch (err) {
    console.error("[OAuth] Callback error:", err.message);
    renderPopupResult(res, { error: "OAuth callback failed unexpectedly." });
  }
}

/**
 * Renders a small HTML page that sends the result to the opener window via postMessage.
 */
function renderPopupResult(res, data) {
  const payload = JSON.stringify(data);
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head><title>BlinkBox — OAuth</title></head>
<body style="background:#09090b;color:#a1a1aa;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center">
    <p style="font-size:14px">${data.error ? "Authorization failed" : "Connected! You can close this window."}</p>
    ${data.error ? `<p style="color:#f87171;font-size:12px;margin-top:8px">${data.error}</p>` : ""}
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "blinkbox:oauth", payload: ${payload} }, "*");
      setTimeout(() => window.close(), 1500);
    }
  </script>
</body>
</html>`);
}
