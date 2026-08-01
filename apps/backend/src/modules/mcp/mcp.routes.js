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

// In-memory ring of the last 60 /api/mcp requests, kept only for the running
// process. Not exposed over any route — the API key rides in the URL path
// (/api/mcp/<key>) or ?key=<key>, so anything stored here is redacted first.
const RECENT = [];
export function record(entry) {
  RECENT.push(entry);
  if (RECENT.length > 60) RECENT.shift();
}

// The MCP key can appear as the last path segment or as ?key=. Strip both so a
// secret never lands in the ring buffer.
function redactUrl(rawUrl) {
  return String(rawUrl || "")
    .replace(/(\/api\/mcp\/)[^/?#]+/i, "$1<redacted>")
    .replace(/([?&]key=)[^&#]+/i, "$1<redacted>");
}

// Record every /api/mcp hit BEFORE auth runs, so failed-auth requests (401) are
// captured too — those never reach handle(). Auth header presence is logged, not
// the key itself. Temporary diagnostic.
function recordHit(req, res, next) {
  const ua = String(req.headers["user-agent"] || "");
  const client = /node|claude|anthropic/i.test(ua) ? "claude?" : /openai|chatgpt|python/i.test(ua) ? "chatgpt?" : ua.slice(0, 40);
  const auth = req.headers["authorization"];
  const entry = {
    at: new Date().toISOString(),
    method: req.method,
    path: redactUrl(req.originalUrl),
    accept: req.headers["accept"] || null,
    sid: req.headers["mcp-session-id"] || null,
    proto: req.headers["mcp-protocol-version"] || null,
    client,
    auth: auth ? `${String(auth).slice(0, 10)}…(${String(auth).length})` : req.params?.token ? "url-token" : req.query?.key ? "query-key" : "none",
    rpc: req.method === "POST" ? req.body?.method || null : null,
    status: null,
  };
  res.on("finish", () => {
    entry.status = res.statusCode;
  });
  record(entry);
  next();
}

// The StreamableHTTPServerTransport returns 406 Not Acceptable unless the POST's
// Accept header advertises BOTH application/json and text/event-stream. Claude's
// web relay (claude.ai/v1/toolbox/shttp/...) opens the session with an Accept of
// */*, so the SDK 406s every initialize and the connector finishes OAuth but
// never opens the MCP session.
//
// Since SDK 1.29 the Node transport is a thin wrapper that hands the request to
// Hono's getRequestListener, which builds the Web `Request` (and the `Headers`
// the 406 check reads) from `req.rawHeaders` — NOT from `req.headers`. So
// rewriting `req.headers.accept` alone is invisible to the negotiation and the
// 406 stands. We must rewrite the raw header pair too. Verified against
// @modelcontextprotocol/sdk@1.29.0: patching only headers → 406, patching
// rawHeaders → 200. We only ever broaden Accept to media types we already
// support, so no client loses anything.
const MCP_ACCEPT = "application/json, text/event-stream";
function normalizeAccept(req) {
  const accept = String(req.headers["accept"] || "").toLowerCase();
  if (accept.includes("application/json") && accept.includes("text/event-stream")) {
    return;
  }
  req.headers["accept"] = MCP_ACCEPT;
  if (Array.isArray(req.rawHeaders)) {
    const next = [];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      if (String(req.rawHeaders[i]).toLowerCase() !== "accept") {
        next.push(req.rawHeaders[i], req.rawHeaders[i + 1]);
      }
    }
    next.push("Accept", MCP_ACCEPT);
    req.rawHeaders = next;
  }
}

// Stateless Streamable-HTTP: one transport per request, no session store. Strict
// connectors (ChatGPT/Claude) get correct SSE framing; lenient ones get JSON —
// the transport decides from the request's Accept header.
async function handle(req, res) {
  normalizeAccept(req);
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
// (POST /api/mcp) or directly in the URL path (POST /api/mcp/<key>).
//
// GET must be handled by the transport, NOT 405'd. Claude's web client proxies
// every connector through its own Streamable-HTTP relay (claude.ai/v1/toolbox/
// shttp/...) and opens a standalone GET text/event-stream to receive server
// messages. That stream sitting open with no events is correct, not a hang —
// answering the GET with 405 makes Claude's relay treat the server as dead and
// show "Couldn't connect." So GET goes to the SDK transport like POST/DELETE.
router.post("/", recordHit, verifyMcpAuth, handle);
router.post("/:token", recordHit, verifyMcpAuth, handle);
router.get("/", recordHit, verifyMcpAuth, handle);
router.get("/:token", recordHit, verifyMcpAuth, handle);
router.delete("/", recordHit, verifyMcpAuth, handle);
router.delete("/:token", recordHit, verifyMcpAuth, handle);

export default router;
