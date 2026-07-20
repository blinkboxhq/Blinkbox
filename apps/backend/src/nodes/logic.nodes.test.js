import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Aggregate and the rate limiter talk to Redis. An in-memory stand-in keeps
// these as real handler tests instead of mock-shaped ones.
const store = new Map();
mock.module("../infra/redis.client.js", {
  namedExports: {
    redis: {
      rpush: async (k, v) => {
        const list = store.get(k) ?? [];
        list.push(v);
        store.set(k, list);
        return list.length;
      },
      llen: async (k) => (store.get(k) ?? []).length,
      lrange: async (k) => [...(store.get(k) ?? [])],
      del: async (k) => store.delete(k),
      expire: async () => 1,
      incr: async (k) => {
        const n = (store.get(k) ?? 0) + 1;
        store.set(k, n);
        return n;
      },
    },
  },
});

const load = async (file) => (await import(`./${file}.node.js`)).default;

// The executor resolves {{ $json.x }} through the isolated-vm jail before the
// node runs, so a handler only ever sees literals. Tests mirror that.
test("condition passes input through and flags the result", async () => {
  const condition = await load("condition");
  const input = { name: "ada", score: 10 };

  const pass = await condition.run(
    { conditions: [{ operator: "equals", left: "ada", right: "ada" }] },
    input,
  );
  assert.equal(pass.__conditionResult, true);
  assert.equal(pass.name, "ada", "upstream fields survive");
  assert.equal(pass.score, 10);

  const fail = await condition.run(
    { conditions: [{ operator: "equals", left: "ada", right: "grace" }] },
    input,
  );
  assert.equal(fail.__conditionResult, false);
  assert.equal(fail.name, "ada", "false path still carries the data");

  const empty = await condition.run({}, input);
  assert.equal(empty.__conditionResult, true, "no conditions configured = pass");
});

test("loop fans out one item at a time", async () => {
  const loop = await load("loop");
  const out = await loop.run({}, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.equal(out.__loopFanOut, true);
  assert.equal(out.items.length, 3);

  const empty = await loop.run({}, []);
  assert.deepEqual(empty, { __loopFanOut: true, items: [] });

  await assert.rejects(() => loop.run({}, { notAnArray: true }), /Expected an array/);
});

test("merge keeps each branch addressable and exposes the combined result", async () => {
  const merge = await load("merge");
  const out = await merge.run(
    { mode: "combine", branches: [{ label: "Stripe" }, { label: "CRM" }] },
    [{ amount: 20 }, { email: "a@b.co" }],
  );
  assert.deepEqual(out.stripe, { amount: 20 });
  assert.deepEqual(out.crm, { email: "a@b.co" });
  assert.deepEqual(out.merged, { amount: 20, email: "a@b.co" });
  assert.equal(out.__mergedFrom, 2);
});

test("delay asks the executor to sleep and keeps the input", async () => {
  const delay = await load("delay");
  const out = await delay.run({ amount: 5, unit: "minutes" }, { orderId: "A1" });
  assert.equal(out.__delay, true);
  assert.ok(Date.parse(out.resumeAfter) > Date.now(), "resumeAfter is in the future");
  assert.equal(out.orderId, "A1", "a delay must not drop upstream data");
});

test("filter_array returns the kept items with both counts", async () => {
  const filterArray = await load("filterArray");
  const out = await filterArray.run(
    { arrayPath: "rows", field: "status", operator: "equals", value: "open" },
    { rows: [{ status: "open" }, { status: "closed" }, { status: "open" }] },
  );
  assert.equal(out.items.length, 2);
  assert.equal(out.filteredCount, 2);
  assert.equal(out.totalCount, 3);
});

test("sort_array orders by field and reports the count", async () => {
  const sortArray = await load("sortArray");
  const out = await sortArray.run(
    { arrayPath: "rows", field: "n", direction: "asc" },
    { rows: [{ n: 3 }, { n: 1 }, { n: 2 }] },
  );
  assert.deepEqual(out.items.map((r) => r.n), [1, 2, 3]);
  assert.equal(out.count, 3);
});

test("deduplicate reports what it kept and what it dropped", async () => {
  const deduplicate = await load("deduplicate");
  const out = await deduplicate.run(
    { arrayPath: "rows", field: "email" },
    { rows: [{ email: "a@b.co" }, { email: "a@b.co" }, { email: "c@d.co" }] },
  );
  assert.equal(out.items.length, 2);
  assert.equal(out.count, 2);
  assert.equal(out.removedCount, 1);
});

test("aggregate holds until the batch is full, then emits every item", async () => {
  const aggregate = await load("aggregate");
  const ctx = { executionId: "exec1", nodeId: "agg1" };
  const cfg = { expectedCount: 3 };

  const first = await aggregate.run(cfg, { i: 1 }, ctx);
  assert.deepEqual(first, { __hold: true, collected: 1, expected: 3 });

  await aggregate.run(cfg, { i: 2 }, ctx);
  const last = await aggregate.run(cfg, { i: 3 }, ctx);

  assert.deepEqual(last.items, [{ i: 1 }, { i: 2 }, { i: 3 }]);
  assert.equal(last.count, 3);
  assert.equal(last.sessionId, "exec1:agg1");
  assert.ok(Date.parse(last.completedAt), "completedAt is a real timestamp");
});

test("retry annotates the downstream execution context", async () => {
  const retry = await load("retry");
  const out = await retry.run({ maxRetries: 5, delayMs: 250, backoff: "exponential" }, { id: 7 });
  assert.deepEqual(out.__retryConfig, { maxRetries: 5, delayMs: 250, backoff: "exponential" });
  assert.equal(out.id, 7, "input passes through");
});

test("stop_error always throws with the configured code and message", async () => {
  const stopError = await load("stopError");
  await assert.rejects(
    () => stopError.run({ message: "no stock left", code: "OUT_OF_STOCK" }),
    (err) => err.code === "OUT_OF_STOCK" && /no stock left/.test(err.message),
  );
});

test("rate_limiter counts per node and drops once over the limit", async () => {
  const rateLimiter = await load("rateLimiter");
  const ctx = { workspaceId: "ws1", nodeId: "rl1" };
  const cfg = { limit: 2, window: "minute", strategy: "drop" };

  const first = await rateLimiter.run(cfg, { n: 1 }, ctx);
  assert.equal(first.__rateLimited, false);
  assert.equal(first.count, 1);
  assert.equal(first.n, 1);

  await rateLimiter.run(cfg, { n: 2 }, ctx);
  const third = await rateLimiter.run(cfg, { n: 3 }, ctx);
  assert.equal(third.__stopBranch, true, "over-limit drops the branch");
  assert.equal(third.dropped, true);

  await assert.rejects(
    () => rateLimiter.run({ ...cfg, strategy: "error" }, {}, ctx),
    /Rate limit exceeded/,
  );
});

test("success_failed passes through on success and signals the failed branch", async () => {
  const successFailed = await load("successFailed");

  const ok = await successFailed.run({ outcome: "success" }, { id: 3 });
  assert.equal(ok.id, 3);

  await assert.rejects(
    () => successFailed.run({ outcome: "failed", message: "payment declined" }),
    (err) => /payment declined/.test(err.message) && err.branchFailure === true,
  );
});

test("approval parks the run instead of falling through", async () => {
  const approval = await load("approval");
  const out = await approval.run(
    { label: "Ship it?", notifyTo: "a@b.co" },
    { orderId: "A1" },
    { nodeId: "ap1" },
  );
  assert.equal(out.__delay, true, "an approval gate must park the branch");
  assert.ok(Date.parse(out.resumeAfter) > Date.now(), "the timeout is in the future");
  assert.equal(out.status, "waiting");
  assert.equal(out.label, "Ship it?");
  assert.equal(out.orderId, "A1", "input survives the gate");
});

