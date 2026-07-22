import { test } from "node:test";
import assert from "node:assert/strict";

// code.node.js pulls the isolate pool, which is standalone, but the node
// registry path touches config/env.js elsewhere — seed before any import.
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.ENCRYPTION_KEY ||= "0123456789abcdef0123456789abcdef";

const code = (await import("./code.node.js")).default;

test("legacy contract: reads $input, writes $output", async () => {
  const out = await code.run({ code: "$output = { doubled: $input.n * 2 };" }, { n: 21 });
  assert.deepEqual(out, { doubled: 42 });
});

test("n8n contract: reads input and returns a value", async () => {
  const out = await code.run({ code: "return { via: input.n };" }, { n: 7 });
  assert.deepEqual(out, { via: 7 });
});

test("empty code passes the input through unchanged", async () => {
  const out = await code.run({ code: "" }, { keep: true });
  assert.deepEqual(out, { keep: true });
});

test("sandbox exposes no filesystem, network, or host globals", async () => {
  const out = await code.run(
    { code: "return { fetch: typeof fetch, require: typeof require, process: typeof process };" },
    {}
  );
  assert.deepEqual(out, { fetch: "undefined", require: "undefined", process: "undefined" });
});

test("runaway code is killed by the timeout", async () => {
  await assert.rejects(
    () => code.run({ code: "while (true) {}" }, {}),
    /timed out/
  );
});

test("timeout is clamped to the safe ceiling", async () => {
  const { MAX_EXECUTION_TIMEOUT_MS } = await import("../infra/isolate.pool.js");
  await assert.rejects(
    () => code.run({ code: "while (true) {}", timeout: 999 }, {}),
    (err) => {
      const ms = Number(err.message.match(/after (\d+)ms/)?.[1]);
      assert.equal(ms, MAX_EXECUTION_TIMEOUT_MS, "timeout should clamp to the ceiling");
      return true;
    }
  );
});
