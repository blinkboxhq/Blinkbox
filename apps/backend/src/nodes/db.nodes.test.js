import { test } from "node:test";
import assert from "node:assert/strict";

// Every database router takes its client as the second argument, so these are
// real handler tests against fake clients — no live database, no module mocks.
const pg = await import("./_packaged/postgres/router.js");
const { handleError: pgHandleError } = await import("./_packaged/postgres/GenericFunctions.js");
const mongo = await import("./_packaged/mongodb/router.js");
const { parseJson } = await import("./_packaged/mongodb/GenericFunctions.js");
const redisRouter = await import("./_packaged/redis/router.js");
const supabase = await import("./_packaged/supabase/router.js");
const firebase = await import("./_packaged/firebase/router.js");
const pinecone = await import("./_packaged/pinecone/router.js");

// ── postgres ─────────────────────────────────────────────────────────────────

function fakePgClient(rows = [], extra = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (extra.throwOn && sql.includes(extra.throwOn)) throw new Error("boom");
      return { rows, rowCount: rows.length, command: "SELECT", fields: [], ...extra.result };
    },
  };
}

test("postgres query returns rows and respects rowLimit", async () => {
  const client = fakePgClient([{ id: 1 }, { id: 2 }, { id: 3 }]);
  const out = await pg.run({ operation: "query", sql: "SELECT * FROM t", rowLimit: 2 }, client);
  assert.equal(out.rows.length, 2);
  assert.equal(out.total, 3);
  assert.equal(client.calls[0].sql, "SELECT * FROM t");
});

test("postgres insert parameterizes values instead of interpolating them", async () => {
  const client = fakePgClient([{ id: 7 }]);
  await pg.run({ operation: "insert", table: "users", values: { name: "Ada", age: 36 } }, client);
  const { sql, params } = client.calls[0];
  assert.equal(sql, 'INSERT INTO "users" ("name", "age") VALUES ($1, $2) RETURNING *');
  assert.deepEqual(params, ["Ada", 36]);
});

test("postgres rejects identifiers that could carry SQL", async () => {
  const client = fakePgClient();
  await assert.rejects(
    () => pg.run({ operation: "insert", table: "users; DROP TABLE users", values: { a: 1 } }, client),
    /Invalid identifier/,
  );
  await assert.rejects(
    () => pg.run({ operation: "insert", table: "t", values: { 'a" , "b': 1 } }, client),
    /Invalid identifier/,
  );
});

test("postgres update shifts where-clause placeholders past the SET values", async () => {
  const client = fakePgClient([{ id: 1 }]);
  await pg.run(
    { operation: "update", table: "users", values: { name: "Ada", email: "a@b.c" }, where: "id = $1", params: [9] },
    client,
  );
  const { sql, params } = client.calls[0];
  assert.equal(sql, 'UPDATE "users" SET "name" = $1, "email" = $2 WHERE id = $3 RETURNING *');
  assert.deepEqual(params, ["Ada", "a@b.c", 9]);
});

test("postgres upsert does nothing when every column is a conflict column", async () => {
  const client = fakePgClient([{ id: 1 }]);
  await pg.run({ operation: "upsert", table: "t", values: { a: 1 }, conflictColumns: "a" }, client);
  assert.match(client.calls[0].sql, /ON CONFLICT \("a"\) DO NOTHING/);

  const client2 = fakePgClient([{ id: 1 }]);
  await pg.run({ operation: "upsert", table: "t", values: { a: 1, b: 2 }, conflictColumns: ["a"] }, client2);
  assert.match(client2.calls[0].sql, /DO UPDATE SET "b" = EXCLUDED\."b"/);
});

test("postgres batch rolls back when a statement fails", async () => {
  const client = fakePgClient([], { throwOn: "BAD" });
  await assert.rejects(
    () => pg.run({ operation: "batch", statements: ["SELECT 1", "BAD SQL"] }, client),
    /PostgreSQL/,
  );
  const issued = client.calls.map((c) => c.sql);
  assert.ok(issued.includes("BEGIN"));
  assert.ok(issued.includes("ROLLBACK"));
  assert.ok(!issued.includes("COMMIT"));
});

test("postgres batch commits when every statement succeeds", async () => {
  const client = fakePgClient();
  const out = await pg.run({ operation: "batch", statements: ["SELECT 1", "SELECT 2"] }, client);
  assert.equal(out.statementCount, 2);
  assert.ok(client.calls.map((c) => c.sql).includes("COMMIT"));
});

test("postgres skips rather than throws when required config is absent", async () => {
  const client = fakePgClient();
  for (const config of [
    { operation: "query" },
    { operation: "insert", values: { a: 1 } },
    { operation: "update", table: "t", values: { a: 1 } },
    { operation: "deleteRows", table: "t" },
  ]) {
    const out = await pg.run(config, client);
    assert.equal(out.skipped, true, config.operation);
    assert.equal(out.success, false);
  }
});

test("postgres falls through to query on an unmapped operation", async () => {
  const client = fakePgClient([{ id: 1 }]);
  const out = await pg.run({ operation: "notARealOperation", sql: "SELECT 1" }, client);
  assert.deepEqual(out.rows, [{ id: 1 }]);
});

test("postgres maps driver error codes to readable messages", () => {
  assert.throws(() => pgHandleError({ code: "28P01", message: "x" }), /Authentication failed/);
  assert.throws(() => pgHandleError({ code: "3D000", message: "x" }), /Database not found/);
  assert.throws(() => pgHandleError({ code: "ECONNREFUSED", message: "x" }), /Cannot connect/);
  assert.throws(() => pgHandleError({ code: "42601", message: "x" }), /SQL error/);
});

// ── mongodb ──────────────────────────────────────────────────────────────────

function fakeMongoConn(docs = []) {
  const calls = [];
  const cursor = {
    sort(s) { calls.push(["sort", s]); return cursor; },
    skip(n) { calls.push(["skip", n]); return cursor; },
    limit(n) { calls.push(["limit", n]); return cursor; },
    async toArray() { return docs; },
  };
  const col = {
    find(filter, opts) { calls.push(["find", filter, opts]); return cursor; },
  };
  return { calls, collection: () => col };
}

test("mongodb find passes the parsed filter, sort, skip and limit through", async () => {
  const conn = fakeMongoConn([{ _id: 1 }]);
  const out = await mongo.run(
    { operation: "find", collection: "users", filter: '{"active":true}', sort: '{"name":1}', limit: 5, skip: 10 },
    conn,
  );
  assert.equal(out.count, 1);
  assert.equal(out.collection, "users");
  assert.deepEqual(conn.calls[0], ["find", { active: true }, { projection: {} }]);
  assert.deepEqual(conn.calls[1], ["sort", { name: 1 }]);
  assert.deepEqual(conn.calls[2], ["skip", 10]);
  assert.deepEqual(conn.calls[3], ["limit", 5]);
});

test("mongodb reports which field held invalid JSON", async () => {
  const conn = fakeMongoConn();
  await assert.rejects(
    () => mongo.run({ operation: "find", collection: "c", filter: "{not json" }, conn),
    /Invalid JSON for 'filter'/,
  );
});

test("mongodb parseJson passes objects through and defaults blanks to {}", () => {
  assert.deepEqual(parseJson({ a: 1 }, "filter"), { a: 1 });
  assert.deepEqual(parseJson("", "filter"), {});
  assert.deepEqual(parseJson(undefined, "filter"), {});
});

test("mongodb rejects an unknown operation", async () => {
  const conn = fakeMongoConn();
  await assert.rejects(
    () => mongo.run({ operation: "nope", collection: "c" }, conn),
    /Unknown operation 'nope'/,
  );
});

// ── redis ────────────────────────────────────────────────────────────────────

test("redis get parses stored JSON but keeps the raw string", async () => {
  const fake = { get: async () => '{"a":1}' };
  const out = await redisRouter.run({ operation: "get", key: "k" }, fake);
  assert.deepEqual(out.value, { a: 1 });
  assert.equal(out.raw, '{"a":1}');
  assert.equal(out.found, true);
});

test("redis get reports a miss without inventing a value", async () => {
  const out = await redisRouter.run({ operation: "get", key: "k" }, { get: async () => null });
  assert.equal(out.found, false);
});

test("redis set serializes objects and applies TTL", async () => {
  const calls = [];
  const fake = { set: async (...a) => { calls.push(a); return "OK"; } };
  await redisRouter.run({ operation: "set", key: "k", value: { a: 1 }, ttl: 60 }, fake);
  assert.deepEqual(calls[0], ["k", '{"a":1}', "EX", 60]);

  calls.length = 0;
  await redisRouter.run({ operation: "set", key: "k", value: "plain" }, fake);
  assert.deepEqual(calls[0], ["k", "plain"]);
});

test("redis skips when the key is missing", async () => {
  const out = await redisRouter.run({ operation: "get" }, { get: async () => null });
  assert.equal(out.skipped, true);
});

test("redis rejects an unknown operation", async () => {
  await assert.rejects(() => redisRouter.run({ operation: "nope" }, {}), /Unknown operation 'nope'/);
});

// ── routers expose what the config panels offer ──────────────────────────────

test("every database router exposes its default operation", () => {
  for (const [name, mod] of [
    ["postgres", pg],
    ["mongodb", mongo],
    ["redis", redisRouter],
    ["supabase", supabase],
    ["firebase", firebase],
    ["pinecone", pinecone],
  ]) {
    assert.ok(Object.keys(mod.OPERATIONS).length > 0, `${name} has no operations`);
    assert.ok(mod.OPERATIONS[mod.DEFAULT_OPERATION], `${name} default '${mod.DEFAULT_OPERATION}' is not an operation`);
    for (const [op, handler] of Object.entries(mod.OPERATIONS)) {
      assert.equal(typeof handler, "function", `${name}.${op} is not callable`);
    }
  }
});

test("supabase, firebase and pinecone reject unknown operations", async () => {
  await assert.rejects(() => supabase.run({ operation: "nope" }, {}), /Unknown operation 'nope'/);
  await assert.rejects(() => firebase.run({ operation: "nope" }, {}), /Unknown operation 'nope'/);
  await assert.rejects(() => pinecone.run({ operation: "nope" }, "key"), /Unknown operation "nope"/);
});
