import { Router } from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "../auth/auth.middleware.js";
import { JWT_SECRET } from "../../config/env.js";
import { listMcpTools } from "./mcpClient.js";
import { beginMcpAuthorization, completeMcpAuthorization } from "./mcpOauth.js";
import { renderPopupResult } from "../../utils/oauthPopup.js";

const router = Router();

// A rejected handshake reads as a transport error, but for an OAuth-protected
// server it is really "you have not signed in yet" — worth saying plainly.
function looksUnauthorized(err) {
  const s = `${err?.message || ""} ${err?.code || ""}`;
  return /401|unauthorized|invalid_token|www-authenticate/i.test(s);
}

// POST /api/mcp-client/probe — the Connect button on the MCP Client node.
// Handshakes with the server the user typed and returns its tool list, so the
// allow-list is picked from what actually exists instead of typed from memory.
router.post("/probe", verifyToken, async (req, res) => {
  const { serverUrl, authType, authToken, authHeader, headers, timeoutMs, credentialId } =
    req.body || {};
  if (!String(serverUrl || "").trim() && !credentialId) {
    return res.status(400).json({ message: "Enter a server URL first." });
  }
  try {
    const { server, tools } = await listMcpTools({
      serverUrl,
      authType,
      authToken,
      authHeader,
      headers,
      timeoutMs,
      credentialId,
      workspaceId: req.user.id,
    });
    res.json({ ok: true, server, tools });
  } catch (err) {
    res.status(502).json({
      message: err.message || "Could not reach that MCP server.",
      needsAuth: looksUnauthorized(err),
    });
  }
});

// GET /api/mcp-client/oauth/authorize — opened in a popup, so the JWT rides in
// the query string; a popup cannot set an Authorization header.
router.get("/oauth/authorize", async (req, res) => {
  const { token, serverUrl, clientId, clientSecret } = req.query;
  if (!token) return renderPopupResult(res, { error: "Missing auth token." }, "blinkbox:mcp-oauth");

  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return renderPopupResult(res, { error: "Session expired. Reload and try again." }, "blinkbox:mcp-oauth");
  }

  try {
    const url = await beginMcpAuthorization({
      userId: user.id,
      serverUrl,
      clientId,
      clientSecret,
    });
    res.redirect(url);
  } catch (err) {
    console.error("[MCP OAuth] authorize failed:", err.message);
    renderPopupResult(res, { error: err.message || "Could not start sign-in." }, "blinkbox:mcp-oauth");
  }
});

// GET /api/mcp-client/oauth/callback — the redirect target registered with the
// MCP server. Posts the saved credential back to the node that opened us.
router.get("/oauth/callback", async (req, res) => {
  const { code, state, error, error_description: description } = req.query;

  if (error) {
    return renderPopupResult(
      res,
      { error: `Authorization denied: ${description || error}` },
      "blinkbox:mcp-oauth",
    );
  }
  if (!code || !state) {
    return renderPopupResult(res, { error: "Missing code or state." }, "blinkbox:mcp-oauth");
  }

  try {
    const credential = await completeMcpAuthorization({ code, state });
    renderPopupResult(res, { success: true, credential }, "blinkbox:mcp-oauth");
  } catch (err) {
    console.error("[MCP OAuth] callback failed:", err.message);
    renderPopupResult(res, { error: err.message || "Sign-in failed." }, "blinkbox:mcp-oauth");
  }
});

export default router;
