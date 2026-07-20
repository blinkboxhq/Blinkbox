import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import RedisMock from "ioredis-mock";
import { MongoMemoryServer } from "mongodb-memory-server";
import manualTrigger from "../src/triggers/manual.js";
import dataMapper from "../src/nodes/dataMapper.node.js";
import conditionNode from "../src/nodes/condition.node.js";
import loopNode from "../src/nodes/loop.node.js";
import mergeNode from "../src/nodes/merge.node.js";
import delayNode from "../src/nodes/delay.node.js";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";

const queue = [];
const delayedJobs = [];
const noop = async () => {};

mock.module("../src/nodes/index.js", {
  namedExports: {
    nodeRegistry: {
      manual: manualTrigger,
      set_fields: dataMapper,
      condition: conditionNode,
      loop: loopNode,
      merge: mergeNode,
      delay: delayNode,
    },
  },
});
mock.module("../src/modules/workers/cursor.queue.js", {
  namedExports: {
    enqueueCursor: async (payload) => {
      queue.push(payload);
    },
  },
});
mock.module("../src/infra/redis.client.js", { namedExports: { redis: new RedisMock() } });
mock.module("../src/infra/socket.server.js", {
  namedExports: { emitExecutionUpdate: () => {}, emitNodeStatus: () => {} },
});
mock.module("../src/infra/delay.scheduler.js", {
  namedExports: {
    scheduleDelay: async (payload, timestamp) => {
      delayedJobs.push({ payload, timestamp });
    },
  },
});
mock.module("../src/infra/credit.engine.js", {
  namedExports: { checkCredits: async () => ({ allowed: true }), deductCredits: noop },
});
mock.module("../src/nodes/agentTools.registry.js", { defaultExport: { resolve: () => null } });
mock.module("../src/infra/error.trigger.js", { namedExports: { dispatchErrorTriggers: noop } });

const { processCursor } = await import("../src/modules/workers/cursor.executor.js");
const { default: Execution } = await import("../src/models/execution.model.js");
const { default: ExecutionData } = await import("../src/models/executionData.model.js");
const { default: Automation } = await import("../src/models/automation.model.js");

let mongod;
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function startExecution(automation) {
  const execution = await Execution.create({
    workspaceId: automation.workspaceId,
    automationId: automation._id,
    cursors: [{ nodeId: automation.entryNodeId, status: "pending" }],
  });
  queue.push({
    executionId: execution._id.toString(),
    cursorId: execution.cursors[0]._id.toString(),
  });
  return execution;
}

async function drainQueue(cap = 20) {
  let processed = 0;
  while (queue.length > 0 && processed < cap) {
    await processCursor(queue.shift());
    processed++;
  }
  return processed;
}

function conditionAutomation(name, right) {
  return Automation.create({
    name,
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "c1", type: "condition", data: { mode: "simple", condition: { operator: "equals", left: "yes", right } } },
      { id: "a1", type: "set_fields", data: { mode: "set", fields: [{ key: "branch", value: "true-path" }] } },
      { id: "b1", type: "set_fields", data: { mode: "set", fields: [{ key: "branch", value: "false-path" }] } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1" },
      { id: "e2", source: "c1", target: "a1", sourceHandle: "true" },
      { id: "e3", source: "c1", target: "b1", sourceHandle: "false" },
    ],
  });
}

test("condition true routes only to the true-handle edge", async () => {
  const automation = await conditionAutomation("cond-true", "yes");
  const execution = await startExecution(automation);

  const processed = await drainQueue();
  assert.equal(processed, 3, "trigger, condition, true-branch — nothing else");

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.status, "executed");
  assert.ok(fresh.cursors.every((c) => c.status === "completed"));
  assert.ok(!fresh.cursors.some((c) => c.nodeId === "b1"), "false branch never spawned");

  const truthy = await ExecutionData.findOne({ executionId: execution._id, nodeId: "a1" });
  assert.equal(truthy.output[0].json.branch, "true-path");
  assert.equal(await ExecutionData.findOne({ executionId: execution._id, nodeId: "b1" }), null);
});

test("condition false routes to the false-handle edge without failing the execution", async () => {
  const automation = await conditionAutomation("cond-false", "no");
  const execution = await startExecution(automation);

  const processed = await drainQueue();
  assert.equal(processed, 3);

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.status, "executed", "false path is routing, not failure");
  assert.ok(fresh.cursors.every((c) => c.status === "completed"));
  assert.ok(!fresh.cursors.some((c) => c.nodeId === "a1"), "true branch never spawned");

  const falsy = await ExecutionData.findOne({ executionId: execution._id, nodeId: "b1" });
  assert.equal(falsy.output[0].json.branch, "false-path");
});

test("loop fan-out spawns one cursor per item, each with its own item snapshot", async () => {
  const automation = await Automation.create({
    name: "loop-fanout",
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "l1", type: "loop", data: { arrayPath: "items" } },
      { id: "s1", type: "set_fields", data: { mode: "set", fields: [{ key: "itemId", value: "{{ $json.id }}" }] } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "l1" },
      { id: "e2", source: "l1", target: "s1" },
    ],
  });
  const execution = await startExecution(automation);

  // Seed the trigger payload the way executeAutomation's vault write does
  await ExecutionData.create({
    executionId: execution._id,
    nodeId: "t1",
    output: [{ json: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] } }],
  });

  const processed = await drainQueue();
  assert.equal(processed, 5, "trigger + loop + three fan-out cursors");

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.status, "executed");
  assert.equal(fresh.cursors.filter((c) => c.nodeId === "s1").length, 3);
  assert.ok(fresh.cursors.every((c) => c.status === "completed"));
  const overrides = fresh.cursors
    .filter((c) => c.nodeId === "s1")
    .map((c) => c._loopItemOverride.id)
    .sort();
  assert.deepEqual(overrides, [1, 2, 3], "each cursor carries its own item");

  const loopData = await ExecutionData.findOne({ executionId: execution._id, nodeId: "l1" });
  assert.equal(loopData.output.length, 3, "loop output keeps the full items array");

  const itemData = await ExecutionData.findOne({ executionId: execution._id, nodeId: "s1" });
  assert.ok([1, 2, 3].includes(itemData.output[0].json.itemId), "{{ $json.id }} resolved per item");
});

test("merge gate waits for all parallel branches and runs the merge node once", async () => {
  const automation = await Automation.create({
    name: "parallel-merge",
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "a1", type: "set_fields", data: { mode: "set", fields: [{ key: "fromA", value: "A" }] } },
      { id: "b1", type: "set_fields", data: { mode: "set", fields: [{ key: "fromB", value: "B" }] } },
      { id: "m1", type: "merge", data: { mode: "combine" } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1" },
      { id: "e2", source: "t1", target: "b1" },
      { id: "e3", source: "a1", target: "m1", targetHandle: "input" },
      { id: "e4", source: "b1", target: "m1", targetHandle: "input-1" },
    ],
  });
  const execution = await startExecution(automation);

  const processed = await drainQueue();
  assert.equal(processed, 4, "trigger, two branches, one merge");

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.status, "executed");
  assert.equal(fresh.cursors.filter((c) => c.nodeId === "m1").length, 1, "first-arriving branch must not spawn the merge early");

  const merged = await ExecutionData.findOne({ executionId: execution._id, nodeId: "m1" });
  const out = merged.output[0].json;
  assert.equal(out.merged.fromA, "A");
  assert.equal(out.merged.fromB, "B");
  assert.equal(out.__mergedFrom, 2);
  // Unlabelled branches stay individually addressable under their slot slug.
  assert.equal(out.input_1.fromA, "A");
  assert.equal(out.input_2.fromB, "B");
});

test("delay parks the downstream cursor as waiting, schedules resume, and the woken cursor completes the run", async () => {
  delayedJobs.length = 0;
  const automation = await Automation.create({
    name: "delay-resume",
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "d1", type: "delay", data: { mode: "duration", ms: 60000 } },
      { id: "s1", type: "set_fields", data: { mode: "set", fields: [{ key: "woke", value: "up" }] } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "d1" },
      { id: "e2", source: "d1", target: "s1" },
    ],
  });
  const execution = await startExecution(automation);
  const startedAt = Date.now();

  const processed = await drainQueue();
  assert.equal(processed, 2, "trigger and delay run; downstream is parked, not enqueued");

  let fresh = await Execution.findById(execution._id);
  const parked = fresh.cursors.find((c) => c.nodeId === "s1");
  assert.equal(parked.status, "waiting");
  assert.notEqual(fresh.status, "executed", "execution stays open while a cursor waits");

  assert.equal(delayedJobs.length, 1);
  const { payload, timestamp } = delayedJobs[0];
  assert.equal(payload.cursorId, parked._id.toString());
  assert.ok(timestamp >= startedAt + 55000 && timestamp <= startedAt + 65000, "resume scheduled ~60s out");

  // The scheduler firing is just an enqueue — the claim gate accepts "waiting"
  await processCursor(payload);
  await drainQueue();

  fresh = await Execution.findById(execution._id);
  assert.equal(fresh.status, "executed");
  assert.ok(fresh.cursors.every((c) => c.status === "completed"));
  const woke = await ExecutionData.findOne({ executionId: execution._id, nodeId: "s1" });
  assert.equal(woke.output[0].json.woke, "up");
});
