// Path rewriting for the dedicated MCP host (mcp.blinkbox.net), kept pure and
// free of config/env.js so it stays testable without a seeded environment.
//
// The transport lives at the root of the host, so "/" and "/mcp" map onto the
// already-tested /api/mcp machinery. "/mcp/<key>" maps too: connectors like
// ChatGPT's offer only OAuth or no-auth with no field for an Authorization
// header, so carrying the key in the path is the only way they can connect.
const MCP_ROOT_RE = /^\/(mcp\/?)?$/;
const MCP_KEYED_RE = /^\/mcp\/([^/?#]+)\/?$/;

export function rewriteMcpHostPath(pathOnly) {
  if (MCP_ROOT_RE.test(pathOnly)) return "/api/mcp";
  const keyed = MCP_KEYED_RE.exec(pathOnly);
  if (keyed) return `/api/mcp/${keyed[1]}`;
  return null;
}
