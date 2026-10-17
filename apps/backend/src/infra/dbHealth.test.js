// Simulates Atlas's "over your space quota" (code 8000) against a local
// mongod with the failCommand failpoint, end to end through the driver,
// Mongoose and Express. Never touches a real database.
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import { attachDbMonitor, trackDbRequests, dbFullResponses, dbIsFull, runWithDbContext, requestHitDbFull } from "./dbHealth.js";

let mongod;
let server;
let base;
const Thing = mongoose.model("DbHealthThing", new mongoose.Schema({ name: String }));

function failWrites(commands = ["insert", "update", "findAndModify", "delete"]) {
  return mongoose.connection.db.admin().command({
    configureFailPoint: "failCommand",
    mode: "alwaysOn",
    data: { failCommands: commands, errorCode: 8000 },
  });
}
function allowWrites() {
  return mongoose.connection.db.admin().command({ configureFailPoint: "failCommand", mode: "off" });
}

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { args: ["--setParameter", "enableTestCommands=1"] } });
  await mongoose.connect(mongod.getUri(), { monitorCommands: true });
  attachDbMonitor(mongoose.connection.getClient());
  await Thing.create({ name: "existing" });

  const app = express();
  app.use(express.json());
  app.use(trackDbRequests);
  app.use(dbFullResponses);
  // Mirrors the controllers: their catch blocks answer a generic 500 or a 400.
  app.post("/things", async (req, res) => {
    try {
      const t = await Thing.create({ name: req.body.name });
      res.status(201).json({ id: t._id });
    } catch {
      res.status(500).json({ success: false, message: "Failed to save." });
    }
  });
  app.post("/things-400", async (req, res) => {
    try {
      await Thing.create({ name: req.body.name });
      res.status(201).json({ ok: true });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  app.get("/things", async (_req, res) => res.json({ count: await Thing.countDocuments() }));
  app.post("/boom", (_req, res) => res.status(500).json({ message: "unrelated failure" }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await allowWrites();
  await Thing.create({ name: "probe" }); // a successful write clears the full flag
});

const post = (path, body) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("a save that hits a full database answers a friendly 503 instead of the handler's 500", async () => {
  await failWrites();
  const res = await post("/things", { name: "new" });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("retry-after"), "600");
  const body = await res.json();
  assert.equal(body.code, "DB_FULL");
  assert.equal(body.success, false);
  assert.match(body.message, /out of storage space/);
  assert.equal(dbIsFull(), true);
});

test("a handler that leaks the raw driver error as a 400 is rewritten too", async () => {
  await failWrites();
  const res = await post("/things-400", { name: "new" });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, "DB_FULL");
  assert.doesNotMatch(JSON.stringify(body), /failpoint|8000/);
});

test("reads keep working while writes fail, and nothing half-written is left", async () => {
  const before = (await (await fetch(base + "/things")).json()).count;
  await failWrites();
  const res = await fetch(base + "/things");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).count, before);
  await post("/things", { name: "should-not-exist" });
  assert.equal(await Thing.countDocuments({ name: "should-not-exist" }), 0);
});

test("an unrelated 500 in another request is not relabelled as storage-full", async () => {
  await failWrites();
  await post("/things", { name: "x" }); // marks only that request
  const res = await post("/boom", {});
  assert.equal(res.status, 500);
  assert.equal((await res.json()).message, "unrelated failure");
});

test("the full flag clears as soon as a write succeeds again", async () => {
  await failWrites();
  await post("/things", { name: "x" });
  assert.equal(dbIsFull(), true);
  await allowWrites();
  const res = await post("/things", { name: "after" });
  assert.equal(res.status, 201);
  assert.equal(dbIsFull(), false);
});

test("the request context marks only the operation that failed", async () => {
  await failWrites(["insert"]);
  const [hit, clean] = await Promise.all([
    runWithDbContext(async () => { await Thing.create({ name: "a" }).catch(() => {}); return requestHitDbFull(); }),
    runWithDbContext(async () => { await Thing.findOne(); return requestHitDbFull(); }),
  ]);
  assert.equal(hit, true);
  assert.equal(clean, false);
});
