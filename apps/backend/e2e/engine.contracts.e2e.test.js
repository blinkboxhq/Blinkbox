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

// Stands in for aggregate.node.js, which reaches for Redis at import time —
// a static import of it would bind the real client before mock.module runs.
// What is under test here is the executor's __hold contract, not the batching.
let holdCalls = 0;
const holdingNode = {
  async run() {
    holdCalls += 1;
    return holdCalls < 3
      ? { __hold: true, collected: holdCalls, expected: 3 }
      : { items: [1, 2, 3], count: 3 };
  },
};

// Same reasoning as holdingNode: rateLimiter.node.js imports Redis at module
// scope. These stubs pin the executor's side of the contract — that a dropped
// branch stops, and that an upstream __retryConfig overrides the built-in budget.
const droppingNode = { async run(config, input) { return { ...input, __stopBranch: true, dropped: true }; } };

let flakyAttempts = 0;
const flakyNode = {
  async run() {
    flakyAttempts += 1;
    throw new Error("upstream returned 500");
  },
};

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
      aggregate: holdingNode,
      rate_limiter: droppingNode,
      flaky: flakyNode,
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

test("merge keys each branch by its input dot, not by stored edge order", async () => {
  const automation = await Automation.create({
    name: "merge-slot-order",
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "a1", type: "set_fields", data: { mode: "set", fields: [{ key: "who", value: "A" }] } },
      { id: "b1", type: "set_fields", data: { mode: "set", fields: [{ key: "who", value: "B" }] } },
      {
        id: "m1",
        type: "merge",
        data: { mode: "combine", branches: [{ label: "Left" }, { label: "Right" }] },
      },
    ],
    // b1 → slot 1 is stored FIRST; positional assembly would label it "left".
    edges: [
      { id: "e1", source: "t1", target: "a1" },
      { id: "e2", source: "t1", target: "b1" },
      { id: "e4", source: "b1", target: "m1", targetHandle: "input-1" },
      { id: "e3", source: "a1", target: "m1", targetHandle: "input" },
    ],
  });
  const execution = await startExecution(automation);
  await drainQueue();

  const merged = await ExecutionData.findOne({ executionId: execution._id, nodeId: "m1" });
  const out = merged.output[0].json;
  assert.equal(out.left.who, "A", "slot 0 must come from the edge on the 'input' dot");
  assert.equal(out.right.who, "B", "slot 1 must come from the edge on the 'input-1' dot");
  assert.equal(out.__mergedFrom, 2);
});

test("aggregate holds the batch: only the run that receives the last item routes downstream", async () => {
  holdCalls = 0;
  const automation = await Automation.create({
    name: "aggregate-hold",
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "l1", type: "loop", data: { arrayPath: "items" } },
      { id: "g1", type: "aggregate", data: { expectedCount: 3 } },
      { id: "s1", type: "set_fields", data: { mode: "set", fields: [{ key: "done", value: "yes" }] } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "l1" },
      { id: "e2", source: "l1", target: "g1" },
      { id: "e3", source: "g1", target: "s1" },
    ],
  });
  const execution = await startExecution(automation);
  await ExecutionData.create({
    executionId: execution._id,
    nodeId: "t1",
    output: [{ json: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] } }],
  });
  await drainQueue();

  const agg = await ExecutionData.findOne({ executionId: execution._id, nodeId: "g1" });
  assert.equal(agg.output.at(-1).json.count, 3, "final run emits the whole batch");

  // Count cursors, not ExecutionData docs: output is upserted one doc per
  // nodeId, so a doc count stays 1 however many times the node actually ran.
  // A dead __hold marker routes the two holding runs onward as well, which
  // shows up here as three s1 cursors instead of one.
  const reloaded = await Execution.findById(execution._id);
  const downstreamCursors = reloaded.cursors.filter((c) => c.nodeId === "s1");
  assert.equal(downstreamCursors.length, 1, "downstream runs once, not once per held item");
});

test("rate limiter 'drop' ends the branch instead of passing the dropped item downstream", async () => {
  const automation = await Automation.create({
    name: "rate-drop",
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "r1", type: "rate_limiter", data: { strategy: "drop", limit: 1 } },
      { id: "s1", type: "set_fields", data: { mode: "set", fields: [{ key: "sent", value: "yes" }] } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "r1" },
      { id: "e2", source: "r1", target: "s1" },
    ],
  });
  const execution = await startExecution(automation);
  await drainQueue();

  const limited = await ExecutionData.findOne({ executionId: execution._id, nodeId: "r1" });
  assert.equal(limited.output[0].json.dropped, true, "limiter records the drop");

  // Dropping has to mean the downstream node never runs. Before the executor
  // honoured __stopBranch, "drop" and "pass through" were the same code path.
  const reloaded = await Execution.findById(execution._id);
  assert.equal(reloaded.cursors.filter((c) => c.nodeId === "s1").length, 0, "no downstream cursor spawned");
});

test("an upstream __retryConfig overrides the executor's built-in retry budget", async () => {
  flakyAttempts = 0;
  const automation = await Automation.create({
    name: "retry-budget",
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "f1", type: "flaky", data: {} },
    ],
    edges: [{ id: "e1", source: "t1", target: "f1" }],
  });
  const execution = await startExecution(automation);
  await ExecutionData.create({
    executionId: execution._id,
    nodeId: "t1",
    output: [{ json: { __retryConfig: { maxRetries: 1, delayMs: 100, backoff: "fixed" } } }],
  });

  // Retries land in delayedJobs, not the main queue, so pump them back in.
  for (let i = 0; i < 8 && (queue.length || delayedJobs.length); i++) {
    await drainQueue();
    while (delayedJobs.length) queue.push(delayedJobs.shift().payload);
  }

  // maxRetries:1 means one attempt plus one retry. The hardcoded default of 3
  // would have produced 4 — that difference is the whole point of the node.
  assert.equal(flakyAttempts, 2, "honours maxRetries:1 rather than the built-in 3");
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

test("a delay carries the upstream payload across the sleep", async () => {
  delayedJobs.length = 0;
  const automation = await Automation.create({
    name: "delay-passthrough",
    trigger: "manual",
    workspaceId: "ws-contracts",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      { id: "s0", type: "set_fields", data: { mode: "set", fields: [{ key: "orderId", value: "A1" }] } },
      { id: "d1", type: "delay", data: { mode: "duration", ms: 60000 } },
      { id: "s1", type: "set_fields", data: { mode: "set", fields: [{ key: "echoed", value: "{{ $json.orderId }}" }] } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "s0" },
      { id: "e2", source: "s0", target: "d1" },
      { id: "e3", source: "d1", target: "s1" },
    ],
  });
  const execution = await startExecution(automation);
  await drainQueue();

  const parked = await ExecutionData.findOne({ executionId: execution._id, nodeId: "d1" });
  assert.equal(parked.output[0].json.orderId, "A1", "the delay must not wipe upstream fields");
  assert.equal(parked.output[0].json.delayed, true);
  assert.equal(parked.output[0].json.__delay, undefined, "the marker is consumed, not stored");

  await processCursor(delayedJobs[0].payload);
  await drainQueue();

  const woke = await ExecutionData.findOne({ executionId: execution._id, nodeId: "s1" });
  assert.equal(woke.output[0].json.echoed, "A1", "{{ $json.* }} still resolves after the sleep");
});

