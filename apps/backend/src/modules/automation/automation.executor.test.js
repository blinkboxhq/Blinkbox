// A run that gets created just before the database fills up must not sit
// "pending" forever (the resumer would keep re-queuing it). Uses a local
// mongod with the failCommand failpoint to fail only the follow-up write.
import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const enqueued = [];
mock.module("../workers/cursor.queue.js", { namedExports: { enqueueCursor: async (job) => enqueued.push(job) } });

const { executeAutomation } = await import("./automation.executor.js");
const { default: Execution } = await import("../../models/execution.model.js");

let mongod;
before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { args: ["--setParameter", "enableTestCommands=1"] } });
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const automation = { _id: new mongoose.Types.ObjectId(), name: "A", trigger: "webhook", entryNodeId: "t1" };

test("a run whose trigger data can't be saved is marked failed, not left pending", async () => {
  // findAndModify = the ExecutionData upsert; the Execution insert still lands.
  await mongoose.connection.db.admin().command({
    configureFailPoint: "failCommand",
    mode: { times: 1 },
    data: { failCommands: ["findAndModify"], errorCode: 8000 },
  });
  await assert.rejects(executeAutomation(automation, { hello: 1 }, { workspaceId: "w1" }), (err) => err.code === 8000);
  const runs = await Execution.find({ automationId: automation._id });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, "failed");
  assert.equal(runs[0].cursors[0].status, "failed");
  assert.ok(runs[0].completedAt);
  assert.equal(enqueued.length, 0, "nothing was queued for a run that never started");
});

test("a normal run is created pending and queued", async () => {
  const run = await executeAutomation(automation, { hello: 2 }, { workspaceId: "w1" });
  assert.equal(run.status, "pending");
  assert.equal(enqueued.length, 1);
});
