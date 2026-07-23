import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { listMcpTools } from "./mcpClient.js";

const router = Router();

// POST /api/mcp-client/probe — the Connect button on the MCP Client node.
// Handshakes with the server the user typed and returns its tool list, so the
// allow-list is picked from what actually exists instead of typed from memory.
router.post("/probe", verifyToken, async (req, res) => {
  const { serverUrl, authType, authToken, authHeader, headers, timeoutMs } = req.body || {};
  if (!String(serverUrl || "").trim()) {
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
    });
    res.json({ ok: true, server, tools });
  } catch (err) {
    res.status(502).json({ message: err.message || "Could not reach that MCP server." });
  }
});

export default router;
