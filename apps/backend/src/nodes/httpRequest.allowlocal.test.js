import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

// ALLOW_LOCAL_REQUESTS is baked into config/env.js at import time, so it must
// be set before the node module graph loads. This file runs in its own process.
process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.ALLOW_LOCAL_REQUESTS = "true";

const axiosCalls = [];
let httpRequest;

before(async () => {
  mock.module("axios", {
    defaultExport: async (opts) => {
      axiosCalls.push(opts);
      return {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        data: Buffer.from(JSON.stringify({ ok: true })),
      };
    },
  });
  ({ default: httpRequest } = await import("./httpRequest.node.js"));
});

test("ALLOW_LOCAL_REQUESTS=true permits 127.0.0.1", async () => {
  const res = await httpRequest.run({ url: "http://127.0.0.1:1234/health" }, {}, {});
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { ok: true });
  assert.equal(axiosCalls.at(-1).url, "http://127.0.0.1:1234/health");
});

test("ALLOW_LOCAL_REQUESTS=true permits localhost", async () => {
  const res = await httpRequest.run({ url: "http://localhost:8080/api" }, {}, {});
  assert.equal(res.status, 200);
});

test("loopback only: private LAN addresses stay blocked even with the flag on", async () => {
  const callsBefore = axiosCalls.length;
  for (const url of [
    "http://10.0.0.1/admin",
    "http://192.168.1.1/router",
    "http://169.254.169.254/latest/meta-data/",
    "http://172.16.0.1/",
  ]) {
    await assert.rejects(
      () => httpRequest.run({ url }, {}, {}),
      /SSRF blocked/,
      `expected ${url} to be blocked despite ALLOW_LOCAL_REQUESTS`,
    );
  }
  assert.equal(axiosCalls.length, callsBefore, "no request may reach axios");
});

test("non-http protocols rejected even for loopback", async () => {
  await assert.rejects(
    () => httpRequest.run({ url: "ftp://127.0.0.1/x" }, {}, {}),
    /only http\/https/,
  );
});
