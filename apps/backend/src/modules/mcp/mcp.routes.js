import { Router } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { verifyMcpAuth } from "./apiKey.middleware.js";
import { listToolSpecs, runTool } from "./mcp.tools.js";

const router = Router();

const SERVER_INFO = { name: "blinkbox", title: "Blinkbox Automation", version: "1.0.0" };
const INSTRUCTIONS =
  "Blinkbox builds and runs automations (like Zapier/Make/n8n) from chat. " +
  "Use list_automations to see what exists, run_automation to run one now, " +
  "create_automation to build a new one from a description, and " +
  "activate_automation / deactivate_automation to turn them on and off.";

// Build a fresh MCP server bound to one user. The official SDK owns the wire
// protocol — Accept negotiation, SSE framing, session/protocol-version headers,
// the initialize lifecycle — so we only register the two tool handlers and let
// our existing tool dispatch (mcp.tools.js) do the work, unchanged.
function buildServer(userId) {
  const server = new Server(
    { name: SERVER_INFO.name, version: SERVER_INFO.version },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listToolSpecs(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const text = await runTool(name, args, userId);
      return { content: [{ type: "text", text: String(text) }], isError: false };
    } catch (err) {
      // Tool failures surface in-band so the model can react, not as protocol errors.
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  });

  return server;
}

// Stateless Streamable-HTTP: one transport per request, no session store. Strict
// connectors (ChatGPT/Claude) get correct SSE framing; lenient ones get JSON —
// the transport decides from the request's Accept header.
async function handle(req, res) {
  const server = buildServer(req.user.id);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      res
        .status(500)
        .json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: err.message } });
    }
  }
}

// Single MCP endpoint. The API key rides in the Authorization header
// (POST /api/mcp) or directly in the URL path (POST /api/mcp/<key>). The SDK
// handles GET (server→client stream) and DELETE (session teardown) too.
router.post("/", verifyMcpAuth, handle);
router.post("/:token", verifyMcpAuth, handle);
router.get("/", verifyMcpAuth, handle);
router.get("/:token", verifyMcpAuth, handle);
router.delete("/", verifyMcpAuth, handle);
router.delete("/:token", verifyMcpAuth, handle);

export default router;
