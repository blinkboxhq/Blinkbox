import { Router } from "express";
import { verifyMcpAuth } from "./apiKey.middleware.js";
import { handleRpc } from "./mcp.server.js";

const router = Router();

const SERVER_INFO = {
  name: "blinkbox",
  version: "1.0.0",
  transport: "streamable-http",
  description: "Connect this URL as a custom MCP connector to control your Blinkbox automations from chat.",
};

async function postHandler(req, res) {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res
      .status(400)
      .json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: expected a JSON-RPC body." } });
  }
  try {
    const result = await handleRpc(body, req.user.id);
    if (result === null) return res.status(202).end();
    return res.status(200).json(result);
  } catch (err) {
    return res
      .status(200)
      .json({ jsonrpc: "2.0", id: body?.id ?? null, error: { code: -32603, message: err.message } });
  }
}

function getHandler(req, res) {
  // This server is stateless request/response — it never opens a server→client stream.
  if ((req.headers.accept || "").includes("text/event-stream")) {
    return res
      .status(405)
      .json({ error: "This MCP server uses request/response. POST JSON-RPC to this URL." });
  }
  res.json(SERVER_INFO);
}

// Streamable HTTP single endpoint. The API key can ride in the Authorization
// header (POST /api/mcp) or directly in the URL path (POST /api/mcp/<key>).
router.post("/", verifyMcpAuth, postHandler);
router.post("/:token", verifyMcpAuth, postHandler);
router.get("/", getHandler);
router.get("/:token", verifyMcpAuth, getHandler);

export default router;
