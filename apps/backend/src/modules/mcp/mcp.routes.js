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
  // Streamable-HTTP clients (ChatGPT/Claude connectors) validate the endpoint by
  // opening a GET with `Accept: text/event-stream` and expecting an SSE stream.
  // We carry no server→client messages, so we hold an idle keep-alive stream:
  // this satisfies the handshake while all JSON-RPC still rides over POST.
  if ((req.headers.accept || "").includes("text/event-stream")) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");
    const keepAlive = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => clearInterval(keepAlive));
    return;
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
