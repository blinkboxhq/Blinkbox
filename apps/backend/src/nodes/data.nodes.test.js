import { test, mock } from "node:test";
import assert from "node:assert/strict";

// variable_set_get is Redis-backed. An in-memory stand-in keeps these as real
// handler tests instead of mock-shaped ones.
const store = new Map();
mock.module("../infra/redis.client.js", {
  namedExports: {
    redis: {
      set: async (k, v) => { store.set(k, v); return "OK"; },
      get: async (k) => (store.has(k) ? store.get(k) : null),
      del: async (k) => (store.delete(k) ? 1 : 0),
      mget: async (keys) => keys.map((k) => store.get(k) ?? null),
      scan: async (_c, _m, pattern) => {
        const prefix = pattern.replace(/\*$/, "");
        return ["0", [...store.keys()].filter((k) => k.startsWith(prefix))];
      },
    },
  },
});

const { default: variableSetGet } = await import("./core/variableSetGet.node.js");
const { default: textFormat } = await import("./core/textFormat.node.js");
const { default: regexMatch } = await import("./core/regexMatch.node.js");
const { default: mathExpression } = await import("./core/mathExpression.node.js");
const { default: dataMapper } = await import("./dataMapper.node.js");
const { default: csvParser } = await import("./csvParser.node.js");

const ctx = { executionId: "exec1", automationId: "wf1", workspaceId: "ws1" };

// ── variable_set_get ─────────────────────────────────────────────────────────

test("variable_set_get round-trips a value through Redis", async () => {
  await variableSetGet.run({ operation: "set", key: "count", value: 42 }, {}, ctx);
  const got = await variableSetGet.run({ operation: "get", key: "count" }, {}, ctx);
  assert.equal(got.value, 42);
  assert.equal(got.found, true);
});

test("variable_set_get returns the default when a key is missing", async () => {
  const got = await variableSetGet.run({ operation: "get", key: "nope", defaultVal: "0" }, {}, ctx);
  assert.equal(got.found, false);
  assert.equal(got.value, 0);
});

test("variable_set_get isolates scopes", async () => {
  await variableSetGet.run({ operation: "set", scope: "workflow", key: "shared", value: "wf" }, {}, ctx);
  const exec = await variableSetGet.run({ operation: "get", scope: "execution", key: "shared" }, {}, ctx);
  assert.equal(exec.found, false);
  const wf = await variableSetGet.run({ operation: "get", scope: "workflow", key: "shared" }, {}, ctx);
  assert.equal(wf.value, "wf");
});

test("variable_set_get deletes and lists", async () => {
  await variableSetGet.run({ operation: "set", scope: "global", key: "a", value: 1 }, {}, ctx);
  await variableSetGet.run({ operation: "set", scope: "global", key: "b", value: 2 }, {}, ctx);
  const listed = await variableSetGet.run({ operation: "list", scope: "global" }, {}, ctx);
  assert.deepEqual(listed.variables, { a: 1, b: 2 });

  const del = await variableSetGet.run({ operation: "delete", scope: "global", key: "a" }, {}, ctx);
  assert.equal(del.deleted, true);
  const after = await variableSetGet.run({ operation: "list", scope: "global" }, {}, ctx);
  assert.deepEqual(after.keys, ["b"]);
});

test("variable_set_get refuses workflow scope with no workflow id", async () => {
  await assert.rejects(
    () => variableSetGet.run({ operation: "get", scope: "workflow", key: "x" }, {}, { executionId: "e" }),
    /workflow scope/,
  );
});

// ── text_format ──────────────────────────────────────────────────────────────

test("text_format honours every operation the panel offers", async () => {
  const cases = [
    ["uppercase", "ab", "AB"],
    ["lowercase", "AB", "ab"],
    ["titlecase", "hello world", "Hello World"],
    ["capitalize", "hELLO", "Hello"],
    ["camelcase", "hello_world", "helloWorld"],
    ["snakecase", "hello world", "hello_world"],
    ["trim", "  x  ", "x"],
    ["trim_start", "  x  ", "x  "],
    ["trim_end", "  x  ", "  x"],
    ["slug", "Hello World!", "hello-world"],
    ["reverse", "abc", "cba"],
    ["remove_html", "<b>hi</b>", "hi"],
    ["wordcount", "one two three", 3],
  ];
  for (const [operation, field, expected] of cases) {
    const out = await textFormat.run({ operation, field }, {});
    assert.equal(out.result, expected, operation);
  }
});

test("text_format truncate and pad read their own config fields", async () => {
  const t = await textFormat.run({ operation: "truncate", field: "abcdefgh", length: 3, suffix: "…" }, {});
  assert.equal(t.result, "abc…");
  const p = await textFormat.run({ operation: "pad_start", field: "7", padLength: 3, padChar: "0" }, {});
  assert.equal(p.result, "007");
});

test("text_format writes to the configured output field", async () => {
  const out = await textFormat.run({ operation: "uppercase", field: "x", outputField: "shout" }, {});
  assert.equal(out.shout, "X");
});

test("text_format rejects an unknown operation", async () => {
  await assert.rejects(() => textFormat.run({ operation: "bogus", field: "x" }, {}), /unknown operation/);
});

// ── regex_match ──────────────────────────────────────────────────────────────

test("regex_match test / match / extract all use the panel's fields", async () => {
  const base = { field: "a1 b22 c333", pattern: "([a-z])(\\d+)" };
  assert.equal((await regexMatch.run({ ...base, operation: "test" }, {})).result, true);
  assert.deepEqual((await regexMatch.run({ ...base, operation: "match" }, {})).result, ["a1", "b22", "c333"]);
  const g = await regexMatch.run({ ...base, operation: "extract", group: 2 }, {});
  assert.equal(g.result, "1");
  assert.deepEqual(g.all, ["1", "22", "333"]);
});

test("regex_match honours outputField and reports a miss", async () => {
  const out = await regexMatch.run({ field: "abc", pattern: "\\d+", operation: "test", outputField: "hit" }, {});
  assert.equal(out.hit, false);
  assert.equal(out.count, 0);
});

test("regex_match throws on an invalid pattern", async () => {
  await assert.rejects(() => regexMatch.run({ field: "x", pattern: "([" }, {}), /invalid pattern/);
});

// ── math_expression ──────────────────────────────────────────────────────────

test("math_expression evaluates precedence, parens and functions", async () => {
  assert.equal((await mathExpression.run({ expression: "2 + 3 * 4" }, {})).result, 14);
  assert.equal((await mathExpression.run({ expression: "(2 + 3) * 4" }, {})).result, 20);
  assert.equal((await mathExpression.run({ expression: "2 ^ 10" }, {})).result, 1024);
  assert.equal((await mathExpression.run({ expression: "-3 + 1" }, {})).result, -2);
  assert.equal((await mathExpression.run({ expression: "max(1, 9, 4)" }, {})).result, 9);
  assert.equal((await mathExpression.run({ expression: "round(3.14159, 2)" }, {})).result, 3.14);
});

test("math_expression applies precision and outputField", async () => {
  const out = await mathExpression.run({ expression: "10 / 3", precision: 3, outputField: "value" }, {});
  assert.equal(out.value, 3.333);
});

test("math_expression refuses to reach outside the expression language", async () => {
  for (const expr of [
    "constructor",
    "this.process",
    "globalThis",
    "process.exit(1)",
    "[].constructor",
  ]) {
    await assert.rejects(() => mathExpression.run({ expression: expr }, {}), /math_expression:/, expr);
  }
});

test("math_expression rejects division by zero", async () => {
  await assert.rejects(() => mathExpression.run({ expression: "1 / 0" }, {}), /division by zero/);
});

// ── data_mapper ──────────────────────────────────────────────────────────────

test("data_mapper dispatches on operation, not just mode", async () => {
  const out = await dataMapper.run(
    { operation: "set", fields: [{ key: "name", value: "Ada" }] },
    { id: 1 },
  );
  assert.deepEqual(out, { id: 1, name: "Ada" });
});

test("data_mapper renames, removes and picks", async () => {
  const renamed = await dataMapper.run(
    { operation: "rename", mappings: [{ from: "old", to: "fresh" }] },
    { old: 5, keep: 1 },
  );
  assert.deepEqual(renamed, { fresh: 5, keep: 1 });

  const removed = await dataMapper.run({ operation: "remove", keys: ["secret"] }, { secret: 1, ok: 2 });
  assert.deepEqual(removed, { ok: 2 });

  const picked = await dataMapper.run({ operation: "pick", keys: ["ok"] }, { secret: 1, ok: 2 });
  assert.deepEqual(picked, { ok: 2 });
});

test("data_mapper filters an array at a path", async () => {
  const out = await dataMapper.run(
    { operation: "filter", arrayPath: "items", field: "status", operator: "equals", value: "open" },
    { items: [{ status: "open" }, { status: "closed" }] },
  );
  assert.deepEqual(out.items, [{ status: "open" }]);
});

test("data_mapper blocks prototype pollution on set", async () => {
  const out = await dataMapper.run(
    { operation: "set", fields: [{ key: "__proto__", value: { polluted: true } }] },
    {},
  );
  assert.equal({}.polluted, undefined);
  assert.equal(out.polluted, undefined);
});

// ── csv_parser ───────────────────────────────────────────────────────────────

test("csv_parser dispatches on operation in both directions", async () => {
  const json = await csvParser.run({ operation: "toJson", csv: "a,b\n1,2" }, {});
  assert.deepEqual(json.rows, [{ a: "1", b: "2" }]);

  const csv = await csvParser.run({ operation: "toCsv", data: [{ a: 1, b: 2 }] }, {});
  assert.equal(csv.csv, "a,b\n1,2");
});
