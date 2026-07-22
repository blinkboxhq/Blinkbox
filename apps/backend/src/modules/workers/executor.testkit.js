import { mock } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";

export const enqueued = [];
export const delays = [];

export const stubRegistry = {
  stub_ok: { run: async () => ({ ok: true }) },
  stub_flaky: {
    run: async () => {
      throw new Error("flaky boom");
    },
  },
  stub_condition_false: { run: async () => ({ __conditionResult: false, matched: false }) },
  // "401" classifies as auth — a no-retry category, so it fails permanently on
  // the first pass and reaches the failure branch without burning the budget.
  stub_hard_fail: {
    run: async () => {
      throw new Error("401 unauthorized");
    },
  },
  stub_soft_fail: { run: async () => ({ success: false, error: "upstream said no" }) },
  stub_fanout: { run: async (config) => ({ __loopFanOut: true, items: config.items }) },
};

const noop = async () => {};

mock.module("../../nodes/index.js", { namedExports: { nodeRegistry: stubRegistry } });
mock.module("./cursor.queue.js", {
  namedExports: {
    enqueueCursor: async (payload) => {
      enqueued.push(payload);
    },
  },
});
mock.module("../execution/execution.events.js", { namedExports: { emitExecutionEvent: noop } });
mock.module("../../modules/automation/engine/expression.parser.js", {
  namedExports: { resolveConfig: (data) => ({ ...(data || {}) }) },
});
mock.module("../../infra/redis.lock.js", {
  namedExports: { acquireLock: async () => true, renewLock: async () => true, releaseLock: noop },
});
mock.module("../../infra/socket.server.js", {
  namedExports: { emitExecutionUpdate: () => {}, emitNodeStatus: () => {} },
});
mock.module("../../infra/delay.scheduler.js", {
  namedExports: {
    scheduleDelay: async (payload, ts) => {
      delays.push({ payload, ts });
    },
  },
});
mock.module("../../infra/credit.engine.js", {
  namedExports: { checkCredits: async () => ({ allowed: true }), deductCredits: noop },
});
mock.module("../../nodes/agentTools.registry.js", { defaultExport: { resolve: () => null } });

export const { processCursor } = await import("./cursor.executor.js");
export const { default: Execution } = await import("../../models/execution.model.js");
export const { default: Automation } = await import("../../models/automation.model.js");

let mongod;
export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}
export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function seed({ nodes, edges = [], cursorNode, extraCursors = [] }) {
  const automation = await Automation.create({
    name: "executor-test",
    trigger: "manual",
    workspaceId: "ws-test",
    nodes,
    edges,
  });
  const execution = await Execution.create({
    workspaceId: "ws-test",
    automationId: automation._id,
    cursors: [{ nodeId: cursorNode, status: "pending" }, ...extraCursors],
  });
  return { automation, execution, cursorId: execution.cursors[0]._id };
}
