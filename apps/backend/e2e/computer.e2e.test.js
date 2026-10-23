import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import RedisMock from "ioredis-mock";
import { MongoMemoryServer } from "mongodb-memory-server";

const SERVER = fileURLToPath(new URL("../../computer/server.mjs", import.meta.url));
const TOKEN = "e2e-computer-token-0123456789abcdef";
const hasPython = spawnSync("python3", ["--version"]).status === 0;

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.COMPUTER_TOKEN = TOKEN;
process.env.COMPUTER_ALLOWED_WORKSPACES = "ws-e2e";

const workspace = await mkdtemp(path.join(tmpdir(), "computer-e2e-"));
const computer = spawn(process.execPath, [SERVER], {
  env: { ...process.env, COMPUTER_TOKEN: TOKEN, PORT: "0", HOST: "127.0.0.1", WORKSPACE_DIR: workspace },
  stdio: ["ignore", "pipe", "inherit"],
});
const port = await new Promise((resolve, reject) => {
  let buf = "";
  computer.once("exit", (code) => reject(new Error(`computer service exited early (${code})`)));
  computer.stdout.on("data", (chunk) => {
    buf += chunk;
    for (const line of buf.split("\n")) {
      try {
        const msg = JSON.parse(line);
        if (msg.msg === "listening") resolve(msg.port);
      } catch {}
    }
  });
});
process.env.COMPUTER_URL = `http://127.0.0.1:${port}`;

const queue = [];
const retries = [];
const noop = async () => {};

mock.module("../src/models/user.model.js", {
  defaultExport: { findById: () => ({ select: () => ({ lean: async () => null }) }) },
});
const { default: manualTrigger } = await import("../src/triggers/manual.js");
const { default: computerCommand } = await import("../src/nodes/integrations/computerCommand.node.js");
const { default: computerScript } = await import("../src/nodes/integrations/computerScript.node.js");
const { default: computerFiles } = await import("../src/nodes/integrations/computerFiles.node.js");
const { default: computerInfo } = await import("../src/nodes/integrations/computerInfo.node.js");

mock.module("../src/nodes/index.js", {
  namedExports: {
    nodeRegistry: {
      manual: manualTrigger,
      computer_command: computerCommand,
      computer_script: computerScript,
      computer_files: computerFiles,
      computer_info: computerInfo,
    },
  },
});
mock.module("../src/modules/workers/cursor.queue.js", {
  namedExports: { enqueueCursor: async (payload) => queue.push(payload) },
});
mock.module("../src/infra/redis.client.js", { namedExports: { redis: new RedisMock(), stripPrefix: (keys) => keys } });
mock.module("../src/infra/socket.server.js", {
  namedExports: { emitExecutionUpdate: () => {}, emitNodeStatus: () => {} },
});
mock.module("../src/infra/delay.scheduler.js", {
  namedExports: { scheduleDelay: async (payload) => retries.push(payload) },
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
  computer.kill();
  await rm(workspace, { recursive: true, force: true });
});

async function run(name, steps, workspaceId = "ws-e2e") {
  const nodes = [{ id: "t1", type: "manual", data: {} }, ...steps.map((s, i) => ({ id: `n${i + 1}`, ...s }))];
  const automation = await Automation.create({
    name,
    trigger: "manual",
    workspaceId,
    entryNodeId: "t1",
    nodes,
    edges: nodes.slice(1).map((n, i) => ({ id: `e${i + 1}`, source: nodes[i].id, target: n.id })),
  });
  const execution = await Execution.create({
    workspaceId,
    automationId: automation._id,
    cursors: [{ nodeId: "t1", status: "pending" }],
  });
  queue.push({ executionId: execution._id.toString(), cursorId: execution.cursors[0]._id.toString() });
  retries.length = 0;
  let processed = 0;
  while (queue.length > 0 && processed < 20) {
    await processCursor(queue.shift());
    processed++;
  }
  const output = async (nodeId) =>
    (await ExecutionData.findOne({ executionId: execution._id, nodeId }))?.output?.[0]?.json;
  const fresh = await Execution.findById(execution._id);
  const failure = async (nodeId) => {
    const log = (await ExecutionData.findOne({ executionId: execution._id, nodeId }))?.log;
    const event = fresh.events.find((e) => e.nodeId === nodeId && e.meta?.category);
    return { error: log?.error, category: event?.meta?.category };
  };
  return { execution: fresh, output, failure };
}

test("command → file write → file read → script → info runs on the real computer", async () => {
  const steps = [
    { type: "computer_command", data: { command: "echo hello-$WHO", env: [{ key: "WHO", value: "e2e" }] } },
    { type: "computer_files", data: { operation: "write", path: "reports/out.txt", content: "{{ $json.output }}" } },
    { type: "computer_files", data: { operation: "read", path: "reports/out.txt" } },
    hasPython
      ? {
          type: "computer_script",
          data: { language: "python", code: "import json\nprint(json.dumps({'n': 6 * 7}))", parseJson: true },
        }
      : { type: "computer_command", data: { command: "echo skipped" } },
    { type: "computer_info", data: {} },
  ];
  const { execution, output } = await run("computer-chain", steps);

  assert.equal(execution.status, "executed");
  assert.ok(execution.cursors.every((c) => c.status === "completed"));
  assert.equal((await output("n1")).output, "hello-e2e");
  assert.equal((await output("n2")).bytesWritten, 9);
  assert.equal(await readFile(path.join(workspace, "reports/out.txt"), "utf8"), "hello-e2e");
  assert.equal((await output("n3")).content, "hello-e2e");
  if (hasPython) assert.deepEqual((await output("n4")).json, { n: 42 });
  const info = await output("n5");
  assert.equal(info.success, true);
  assert.equal(typeof info.hostname, "string");
});

test("a failing command stops the run once, without auto-retry", async () => {
  const { execution, failure } = await run("computer-fail", [
    { type: "computer_command", data: { command: "echo attempt >> runs.log; echo broke >&2; exit 3" } },
    { type: "computer_command", data: { command: "echo never > never.txt" } },
  ]);

  assert.equal(execution.status, "failed");
  assert.equal(retries.length, 0);
  const failed = await failure("n1");
  assert.equal(failed.category, "code");
  assert.match(failed.error, /Command exited with code 3: broke/);
  assert.equal((await readFile(path.join(workspace, "runs.log"), "utf8")).trim().split("\n").length, 1);
  await assert.rejects(readFile(path.join(workspace, "never.txt")), { code: "ENOENT" });
});

test("with stop-on-error off the run continues past a failing command", async () => {
  const { execution, output } = await run("computer-soft-fail", [
    { type: "computer_command", data: { command: "exit 5", failOnError: false } },
    { type: "computer_command", data: { command: "echo after-$PREV", env: [{ key: "PREV", value: "{{ $json.exitCode }}" }] } },
  ]);

  assert.equal(execution.status, "executed");
  const soft = await output("n1");
  assert.equal(soft.success, false);
  assert.equal(soft.exitCode, 5);
  assert.equal((await output("n2")).output, "after-5");
});

test("other accounts cannot use the computer", async () => {
  const { execution, failure } = await run(
    "computer-denied",
    [{ type: "computer_command", data: { command: "echo pwned > pwned.txt" } }],
    "ws-other",
  );

  assert.equal(execution.status, "failed");
  assert.equal(retries.length, 0);
  const denied = await failure("n1");
  assert.equal(denied.category, "config");
  assert.match(denied.error, /owner-only/);
  await assert.rejects(readFile(path.join(workspace, "pwned.txt")), { code: "ENOENT" });
});
