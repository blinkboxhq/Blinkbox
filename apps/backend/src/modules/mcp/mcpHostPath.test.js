import { test } from "node:test";
import assert from "node:assert/strict";
import { rewriteMcpHostPath } from "./mcpHostPath.js";

test("root forms all reach the transport", () => {
  for (const path of ["/", "/mcp", "/mcp/"]) {
    assert.equal(rewriteMcpHostPath(path), "/api/mcp");
  }
});

test("key in the path reaches the transport with the key intact", () => {
  assert.equal(rewriteMcpHostPath("/mcp/bb_abc123"), "/api/mcp/bb_abc123");
  assert.equal(rewriteMcpHostPath("/mcp/bb_abc123/"), "/api/mcp/bb_abc123");
});

test("OAuth discovery and flow paths are left alone", () => {
  for (const path of [
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource",
    "/oauth/authorize",
    "/oauth/token",
    "/oauth/register",
  ]) {
    assert.equal(rewriteMcpHostPath(path), null);
  }
});

test("deeper paths under /mcp are not swallowed", () => {
  assert.equal(rewriteMcpHostPath("/mcp/bb_abc123/extra"), null);
});

test("favicon and unrelated paths pass through", () => {
  assert.equal(rewriteMcpHostPath("/favicon.ico"), null);
  assert.equal(rewriteMcpHostPath("/api/automations"), null);
});
