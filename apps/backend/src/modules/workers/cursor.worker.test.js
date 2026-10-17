import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../../infra/bullmq.prefixed.js", { namedExports: { Worker: class {} } });
mock.module("../../infra/bullmq.js", { namedExports: { createBullMQConnection: () => ({}), getCursorQueue: () => ({}), getDeadLetterQueue: () => ({}) } });
mock.module("../../infra/redis.client.js", { namedExports: { redis: {} } });
mock.module("./cursor.executor.js", { namedExports: { processCursor: async () => {} } });
mock.module("../../config/env.js", { namedExports: { CURSOR_CONCURRENCY: 1 } });

const { runCursorJob } = await import("./cursor.worker.js");
const full = Object.assign(new Error("you are over your space quota"), { code: 8000 });

test("a cursor that hits a full database waits instead of failing into the dead-letter queue", async () => {
  const requeued = [];
  const out = await runCursorJob({ executionId: "e", cursorId: "c" }, {
    process: async () => { throw full; },
    requeue: async (next, delay) => requeued.push({ next, delay }),
    isFull: () => false,
  });
  assert.equal(out, "waiting");
  assert.equal(requeued.length, 1);
  assert.equal(requeued[0].next.dbFullWaits, 1);
  assert.equal(requeued[0].delay, 10 * 60 * 1000);
});

test("the wait is bounded: after 12 waits the job fails normally", async () => {
  await assert.rejects(
    runCursorJob({ executionId: "e", cursorId: "c", dbFullWaits: 12 }, {
      process: async () => { throw full; },
      requeue: async () => assert.fail("must not requeue again"),
      isFull: () => true,
    }),
    /space quota/,
  );
});

test("other errors still fail the job", async () => {
  await assert.rejects(
    runCursorJob({ executionId: "e", cursorId: "c" }, {
      process: async () => { throw new Error("handler exploded"); },
      requeue: async () => assert.fail("must not requeue"),
      isFull: () => false,
    }),
    /handler exploded/,
  );
});
