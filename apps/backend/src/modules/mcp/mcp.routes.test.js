import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("./apiKey.middleware.js", { namedExports: { verifyMcpAuth: (_req, _res, next) => next() } });
mock.module("./mcp.tools.js", { namedExports: { listToolSpecs: () => [], runTool: async () => "" } });

const { toolErrorText } = await import("./mcp.routes.js");

test("MCP tool errors never show the raw storage-quota error", () => {
  const text = toolErrorText(Object.assign(new Error("you are over your space quota, using 512 MB of 512 MB"), { code: 8000 }));
  assert.match(text, /out of storage space/);
  assert.doesNotMatch(text, /quota|512 MB/);
});

test("MCP tool errors hide other database internals but keep normal messages", () => {
  assert.doesNotMatch(toolErrorText(new Error("connect ECONNREFUSED blnkbox.abcde.mongodb.net:27017")), /mongodb\.net/);
  assert.equal(toolErrorText(new Error("Automation not found")), "Error: Automation not found");
});
