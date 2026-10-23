// Real-Redis timing check for the Schedule trigger: runs the actual BullMQ
// scheduler + worker and measures how late each slot fires.
// Skipped unless CRON_TIMING_REDIS_URL points at a disposable Redis.
import { test } from "node:test";
import assert from "node:assert/strict";

const REDIS = process.env.CRON_TIMING_REDIS_URL;

test("schedule trigger fires every slot once, on time", { skip: !REDIS && "set CRON_TIMING_REDIS_URL to run" }, async () => {
  process.env.REDIS_URL = REDIS;
  process.env.JWT_SECRET ||= "test-jwt-secret";
  process.env.ENCRYPTION_KEY ||= "0123456789abcdef0123456789abcdef";

  const { startCronScheduler, stopCronScheduler } = await import("./cron.scheduler.js");
  const { Queue } = await import("./bullmq.prefixed.js");
  const { createBullMQConnection } = await import("./bullmq.js");

  const queueName = `bb-cron-timing-${process.pid}`;
  const automation = {
    _id: "timing-auto",
    name: "timing",
    active: true,
    workspaceId: "ws-timing",
    entryNodeId: "c1",
    nodes: [{ id: "c1", type: "cron_trigger", data: { preset: "custom", customCron: "* * * * * *", timezone: "UTC" } }],
  };
  const fires = [];

  await startCronScheduler({
    queueName,
    healIntervalMs: 0,
    listAutomations: async () => [automation],
    loadAutomation: async () => automation,
    fire: async (_a, payload) => fires.push(payload),
  });
  await new Promise((r) => setTimeout(r, 8000));
  await stopCronScheduler();

  const connection = createBullMQConnection();
  const queue = new Queue(queueName, { connection });
  await queue.obliterate({ force: true });
  await queue.close();
  await connection.quit();

  const slots = fires.map((f) => Date.parse(f.triggeredAt));
  const late = fires.map((f) => f.lateMs).sort((a, b) => a - b);
  console.log(`[cron timing] ${fires.length} fires, lateness ms min=${late[0]} p50=${late[late.length >> 1]} max=${late.at(-1)}`);

  assert.ok(fires.length >= 6, `expected ≥6 fires in 8s, got ${fires.length}`);
  assert.equal(new Set(slots).size, slots.length, "a slot fired twice");
  for (let i = 1; i < slots.length; i++) assert.equal(slots[i] - slots[i - 1], 1000, "a slot was skipped");
  assert.ok(late.at(-1) < 1000, `slowest fire was ${late.at(-1)}ms late`);
});
