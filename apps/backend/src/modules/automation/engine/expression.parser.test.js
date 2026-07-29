import test from "node:test";
import assert from "node:assert/strict";
import { resolveConfig } from "./expression.parser.js";

const $json = {
  query: "founders",
  urls: ["https://a.com", "https://b.com"],
  meta: { count: 2, nested: { ok: true } },
  count: 2,
  flag: false,
  nothing: null,
};

test("an array expression survives the isolate boundary", () => {
  assert.deepEqual(resolveConfig("{{$json.urls}}", $json, {}, 0), [
    "https://a.com",
    "https://b.com",
  ]);
});

test("an object expression survives the isolate boundary", () => {
  assert.deepEqual(resolveConfig("{{$json.meta}}", $json, {}, 0), {
    count: 2,
    nested: { ok: true },
  });
});

test("an array reaches a node through nested config", () => {
  const resolved = resolveConfig(
    { operation: "extract", payload: { urls: "{{$json.urls}}" } },
    $json,
    {},
    0,
  );
  assert.deepEqual(resolved.payload.urls, ["https://a.com", "https://b.com"]);
});

test("$node references keep their arrays", () => {
  const ctx = { n13: [{ json: { rows: [["a", "b"]], newCount: 1 } }] };
  assert.deepEqual(resolveConfig("{{$node.n13.rows}}", $json, ctx, 0), [["a", "b"]]);
});

test("primitives keep their types", () => {
  assert.equal(resolveConfig("{{$json.query}}", $json, {}, 0), "founders");
  assert.equal(resolveConfig("{{$json.count}}", $json, {}, 0), 2);
  assert.equal(resolveConfig("{{$json.flag}}", $json, {}, 0), false);
  assert.equal(resolveConfig("{{$json.nothing}}", $json, {}, 0), null);
  assert.equal(resolveConfig("{{$json.missing}}", $json, {}, 0), undefined);
});

test("mixed templates still interpolate as strings", () => {
  assert.equal(
    resolveConfig("found {{$json.count}} for {{$json.query}}", $json, {}, 0),
    "found 2 for founders",
  );
});

test("a failing expression resolves to null instead of throwing", () => {
  assert.equal(resolveConfig("{{$json.missing.deeper}}", $json, {}, 0), null);
});

test("non-string config passes through untouched", () => {
  assert.equal(resolveConfig(42, $json, {}, 0), 42);
  assert.deepEqual(resolveConfig(["a", "{{$json.count}}"], $json, {}, 0), ["a", 2]);
});
