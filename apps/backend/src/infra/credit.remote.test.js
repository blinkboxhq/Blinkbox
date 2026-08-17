import { test, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.GRACE_HOURS = "72";

// Every call the client makes lands here; each test decides how the cloud answers.
let posts = [];
let respond = () => ({ data: {} });

function fail(status, message = "boom") {
  const err = new Error(message);
  if (status) err.response = { status };
  return err;
}

mock.module("axios", {
  defaultExport: {
    create: () => ({
      get: async () => ({ data: { cost: 1 } }),
      post: async (path, body) => {
        posts.push({ path, body });
        const out = respond(path, body);
        if (out instanceof Error) throw out;
        return out;
      },
    }),
  },
});

const { checkCredits, deductCredits } = await import("./credit.remote.js");
const { default: MeterState } = await import("../models/meterState.model.js");

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  posts = [];
  await MeterState.deleteMany({});
});

const ok = () => ({ data: { allowed: true, remaining: 500, cost: 1, graceHours: 72 } });

test("a healthy check stamps the grace clock and records the cloud's window", async () => {
  respond = ok;
  const res = await checkCredits("ws", "http_request");

  assert.equal(res.allowed, true);
  const state = await MeterState.findById("meter").lean();
  assert.ok(state.lastGoodCheckAt, "a successful check is stamped");
  assert.equal(state.graceHours, 72, "the window comes from the cloud, not local env");
});

// The decision matrix itself lives in credit.grace.test.js, which needs no
// database. What is worth the cost of a real Mongo here is the wiring around
// it: what gets written, what gets burned, and what gets replayed.
test("an unreachable cloud runs on grace while the stamp is fresh", async () => {
  respond = ok;
  await checkCredits("ws", "http_request");

  respond = () => fail(undefined, "ECONNREFUSED");
  const res = await checkCredits("ws", "http_request");

  assert.equal(res.allowed, true, "a blinkbox.net outage must not stop the customer's workflows");
  assert.equal(res.reason, "grace");
  assert.ok(Date.parse(res.graceExpiresAt) > Date.now());
});

test("a rejected license fails closed and burns the stamp, so grace cannot cover a revoke", async () => {
  respond = ok;
  await checkCredits("ws", "http_request");

  respond = () => fail(401);
  const rejected = await checkCredits("ws", "http_request");
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.reason, "invalid_license");

  const state = await MeterState.findById("meter").lean();
  assert.equal(state.lastGoodCheckAt, null, "the stamp is cleared on revoke");

  respond = () => fail(undefined, "ECONNREFUSED");
  const after401 = await checkCredits("ws", "http_request");
  assert.equal(after401.allowed, false, "a revoked instance cannot coast offline");
});

test("spend during grace is queued, then replayed when the cloud returns", async () => {
  respond = ok;
  await checkCredits("ws", "http_request");

  respond = () => fail(undefined, "ECONNREFUSED");
  const res = await deductCredits("ws", { executionId: "exec-1", nodeId: "n1", nodeType: "http_request" });
  assert.equal(res.deferred, true, "grace is deferred billing, not free execution");

  const queued = await MeterState.findById("meter").lean();
  assert.equal(queued.deferred.length, 1);
  assert.equal(queued.deferred[0].executionId, "exec-1");

  respond = ok;
  await checkCredits("ws", "http_request");
  await new Promise((r) => setTimeout(r, 50));

  const flushed = await MeterState.findById("meter").lean();
  assert.equal(flushed.deferred.length, 0, "the queue drains on reconnect");
  assert.ok(
    posts.some((p) => p.path === "/credits/deduct" && p.body.executionId === "exec-1"),
    "the deferred debit is actually sent",
  );
});
