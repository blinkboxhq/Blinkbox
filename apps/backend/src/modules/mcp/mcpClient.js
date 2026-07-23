/**
 * OUTBOUND MCP CLIENT
 *
 * The mirror of mcp.routes.js: that file makes Blinkbox an MCP server, this one
 * makes Blinkbox an MCP client so the tool_mcp_client node (and its Connect
 * button) can talk to somebody else's server over the real wire protocol.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

const CLIENT_INFO = { name: "blinkbox", version: "1.0.0" };
const DEFAULT_TIMEOUT = 30000;

const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);

function normalizeUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) throw new Error("No MCP server URL set");
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// "Key: value" per line — users never see or type raw JSON.
export function mcpHeaders(config = {}) {
  const out = {};
  for (const line of String(config.headers || "").split("\n")) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    if (k) out[k] = line.slice(i + 1).trim();
  }
  const token = String(config.authToken || "").trim();
  const mode = config.authType || (token ? "bearer" : "none");
  if (token && mode === "bearer") out.Authorization = `Bearer ${token}`;
  if (token && mode === "header") out[String(config.authHeader || "X-API-Key").trim()] = token;
  return out;
}

function withDeadline(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// Streamable HTTP is the current transport; SSE is the older one plenty of
// deployed servers still speak, so a failed handshake gets one retry there
// before we call the server unreachable.
async function connect(url, headers, timeout) {
  const target = new URL(url);
  const client = new Client(CLIENT_INFO, { capabilities: {} });
  try {
    await withDeadline(
      client.connect(new StreamableHTTPClientTransport(target, { requestInit: { headers } })),
      timeout,
      "MCP handshake",
    );
    return client;
  } catch (streamErr) {
    const fallback = new Client(CLIENT_INFO, { capabilities: {} });
    try {
      await withDeadline(
        fallback.connect(
          new SSEClientTransport(target, {
            requestInit: { headers },
            eventSourceInit: {
              fetch: (u, init) => fetch(u, { ...init, headers: { ...init?.headers, ...headers } }),
            },
          }),
        ),
        timeout,
        "MCP handshake",
      );
      return fallback;
    } catch {
      await fallback.close().catch(() => {});
      throw streamErr;
    }
  }
}

async function withMcpClient(config, fn) {
  const url = normalizeUrl(config.serverUrl);
  await assertSafeUrlResolved(url);
  const timeout = num(config.timeoutMs, DEFAULT_TIMEOUT);
  const client = await connect(url, mcpHeaders(config), timeout);
  try {
    return await fn(client, timeout);
  } finally {
    await client.close().catch(() => {});
  }
}

export async function listMcpTools(config) {
  return withMcpClient(config, async (client, timeout) => {
    const res = await client.listTools(undefined, { timeout });
    return {
      server: client.getServerVersion() || null,
      tools: (res?.tools || []).map((t) => ({
        name: t.name,
        description: t.description || "",
      })),
    };
  });
}

export async function callMcpTool(config, toolName, args) {
  return withMcpClient(config, async (client, timeout) => {
    const res = await client.callTool(
      { name: toolName, arguments: args || {} },
      undefined,
      { timeout },
    );
    const text = (res?.content || [])
      .filter((c) => c?.type === "text")
      .map((c) => c.text)
      .join("\n");
    return {
      tool: toolName,
      isError: Boolean(res?.isError),
      text,
      content: res?.content || [],
      structuredContent: res?.structuredContent,
    };
  });
}
