import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";

const { trimAutomationRuns } = await import("./execution.trim.js");
const { EXECUTION_MAX_PER_AUTOMATION } = await import("../config/env.js");
const { default: Execution } = await import("../models/execution.model.js");
const { default: ExecutionData } = await import("../models/executionData.model.js");

let mongod;
const A = new mongoose.Types.ObjectId();
const B = new mongoose.Types.ObjectId();
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 1);

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  await Execution.deleteMany({});
  await ExecutionData.deleteMany({});
});

// Run i of an automation, created i minutes after T0, with one node output
async function seed(automationId, n, { status = "executed", cursorStatus = "completed", offset = 0 } = {}) {
  const runs = [];
  for (let i = 0; i < n; i++) {
    const at = new Date(T0 + (offset + i) * MIN);
    const run = await Execution.create({
      workspaceId: "ws",
      automationId,
      status,
      cursors: [{ nodeId: "n1", status: cursorStatus }],
      createdAt: at,
      updatedAt: at,
    });
    await ExecutionData.create({ executionId: run._id, nodeId: "n1", output: [{ json: { i } }] });
    runs.push(run);
  }
  return runs;
}

test("defaults to keeping the last 5 runs", () => {
  assert.equal(EXECUTION_MAX_PER_AUTOMATION, 5);
});

test("keeps the newest 5 runs and deletes older ones together with their node data", async () => {
  const runs = await seed(A, 12);
  const other = await seed(B, 3);

  const deleted = await trimAutomationRuns(A);

  assert.equal(deleted, 7);
  const left = await Execution.find({ automationId: A }).sort({ createdAt: -1 }).lean();
  assert.deepEqual(left.map((e) => String(e._id)), runs.slice(-5).reverse().map((e) => String(e._id)));
  assert.equal(await ExecutionData.countDocuments({ executionId: { $in: runs.slice(0, 7).map((e) => e._id) } }), 0,
    "deleted runs must not leave node outputs behind");
  assert.equal(await ExecutionData.countDocuments({ executionId: { $in: left.map((e) => e._id) } }), 5);
  assert.equal(await Execution.countDocuments({ automationId: B }), other.length, "other automations are untouched");
});

test("never deletes an old run that is still in progress", async () => {
  const [running] = await seed(A, 1, { status: "running", cursorStatus: "running" });
  const [parked] = await seed(A, 1, { status: "failed", cursorStatus: "waiting", offset: 1 });
  await seed(A, 8, { offset: 2 });

  const deleted = await trimAutomationRuns(A);

  assert.equal(deleted, 3, "only the finished runs past the cap go");
  assert.ok(await Execution.exists({ _id: running._id }), "a running run survives however old it is");
  assert.ok(await Execution.exists({ _id: parked._id }), "a run with a waiting cursor survives");
  assert.equal(await ExecutionData.countDocuments({ executionId: { $in: [running._id, parked._id] } }), 2);
});

test("a second trim is a no-op and an explicit keep is honoured", async () => {
  await seed(A, 4);
  assert.equal(await trimAutomationRuns(A), 0);
  assert.equal(await trimAutomationRuns(A, 1), 3);
  assert.equal(await Execution.countDocuments({ automationId: A }), 1);
});
