import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import RedisMock from "ioredis-mock";
import { MongoMemoryServer } from "mongodb-memory-server";
import manualTrigger from "../src/triggers/manual.js";
import dataMapper from "../src/nodes/dataMapper.node.js";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";

const queue = [];
const noop = async () => {};

mock.module("../src/nodes/index.js", {
  namedExports: {
    nodeRegistry: {
      manual: manualTrigger,
      set_fields: dataMapper,
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
mock.module("../src/infra/redis.client.js", { namedExports: { redis: new RedisMock(), stripPrefix: (keys) => keys } });
mock.module("../src/infra/socket.server.js", {
  namedExports: { emitExecutionUpdate: () => {}, emitNodeStatus: () => {} },
});
mock.module("../src/infra/delay.scheduler.js", { namedExports: { scheduleDelay: noop } });
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

test("3-node workflow runs end to end: manual → set_fields → set_fields", async () => {
  const automation = await Automation.create({
    name: "e2e-smoke",
    trigger: "manual",
    workspaceId: "ws-e2e",
    entryNodeId: "t1",
    nodes: [
      { id: "t1", type: "manual", data: {} },
      {
        id: "s1",
        type: "set_fields",
        data: {
          mode: "set",
          fields: [
            { key: "status", value: "processed" },
            { key: "source", value: "{{ $json.triggerType }}" },
          ],
        },
      },
      {
        id: "f1",
        type: "set_fields",
        data: {
          mode: "set",
          fields: [
            { key: "outcome", value: "success" },
            { key: "message", value: "all good" },
          ],
        },
      },
    ],
    edges: [
      { id: "e1", source: "t1", target: "s1" },
      { id: "e2", source: "s1", target: "f1" },
    ],
  });

  const execution = await Execution.create({
    workspaceId: "ws-e2e",
    automationId: automation._id,
    cursors: [{ nodeId: "t1", status: "pending" }],
  });

  queue.push({
    executionId: execution._id.toString(),
    cursorId: execution.cursors[0]._id.toString(),
  });

  let processed = 0;
  while (queue.length > 0 && processed < 10) {
    await processCursor(queue.shift());
    processed++;
  }
  assert.equal(processed, 3, "exactly three cursors should run");

  const fresh = await Execution.findById(execution._id);
  // NOTE: the executor's terminal success status is "executed" (see enum in
  // execution.model.js) — there is no "completed" execution status.
  assert.equal(fresh.status, "executed");
  assert.ok(fresh.completedAt instanceof Date);
  assert.equal(fresh.cursors.length, 3);
  assert.ok(fresh.cursors.every((c) => c.status === "completed"));

  const finalData = await ExecutionData.findOne({ executionId: execution._id, nodeId: "f1" });
  const out = finalData.output[0].json;
  assert.equal(out.status, "processed", "set_fields static value flows through");
  assert.equal(out.source, "manual", "{{ $json.triggerType }} resolved by the real parser");
  assert.equal(out.triggerType, "manual", "trigger payload preserved down the chain");
  assert.equal(out.outcome, "success");
  assert.equal(out.message, "all good");

  const eventTypes = fresh.events.map((e) => e.type);
  assert.equal(eventTypes.filter((t) => t === "node_completed").length, 3);
  assert.ok(eventTypes.includes("execution_completed"));
});
