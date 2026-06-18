import { listToolSpecs, runTool } from "./mcp.tools.js";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "blinkbox", title: "Blinkbox Automation", version: "1.0.0" };
const INSTRUCTIONS =
  "Blinkbox builds and runs automations (like Zapier/Make/n8n) from chat. " +
  "Use list_automations to see what exists, run_automation to run one now, " +
  "create_automation to build a new one from a description, and " +
  "activate_automation / deactivate_automation to turn them on and off.";

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function isNotification(msg) {
  return !msg || msg.id === undefined || msg.id === null;
}

async function dispatch(msg, userId) {
  const { id, method, params } = msg || {};
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case "tools/list":
      return rpcResult(id, { tools: listToolSpecs() });
    case "tools/call": {
      try {
        const text = await runTool(params?.name, params?.arguments, userId);
        return rpcResult(id, { content: [{ type: "text", text: String(text) }], isError: false });
      } catch (err) {
        // Tool failures are reported in-band (isError) so the model can react, not as protocol errors.
        return rpcResult(id, {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        });
      }
    }
    case "ping":
      return rpcResult(id, {});
    default:
      if (isNotification(msg)) return null; // unknown notification → ignore silently
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

/**
 * Handle one JSON-RPC payload (single message or batch) for a Streamable-HTTP MCP
 * request. Returns the response object/array to send, or null when there is nothing
 * to reply with (notifications only) — the route turns that into HTTP 202.
 */
export async function handleRpc(body, userId) {
  if (Array.isArray(body)) {
    const responses = [];
    for (const msg of body) {
      const r = await dispatch(msg, userId);
      if (r && !isNotification(msg)) responses.push(r);
    }
    return responses.length ? responses : null;
  }
  const r = await dispatch(body, userId);
  return isNotification(body) ? null : r;
}
