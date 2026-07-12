import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startDb,
  stopDb,
  seed,
  processCursor,
  Execution,
  delays,
} from "./executor.testkit.js";

before(startDb);
after(stopDb);

test("retryable failure backs off exponentially, then permanently fails after MAX_RETRIES", async () => {
  const { execution, cursorId } = await seed({
    nodes: [{ id: "n1", type: "stub_flaky", data: {} }],
    cursorNode: "n1",
  });

  const expectedBackoffs = [1000, 2000, 4000];
  for (let i = 0; i < expectedBackoffs.length; i++) {
    const t0 = Date.now();
    await processCursor({ executionId: execution._id, cursorId });
    const t1 = Date.now();

    const fresh = await Execution.findById(execution._id);
    const cursor = fresh.cursors.id(cursorId);
    assert.equal(cursor.status, "waiting", `attempt ${i + 1} should park the cursor as waiting`);
    assert.equal(cursor.retries, i + 1);

    assert.equal(delays.length, i + 1, "each retry schedules exactly one delayed re-run");
    const { payload, ts } = delays[i];
    assert.equal(payload.cursorId, cursorId.toString());
    assert.ok(
      ts >= t0 + expectedBackoffs[i] && ts <= t1 + expectedBackoffs[i],
      `retry ${i + 1} backoff should be ${expectedBackoffs[i]}ms, got ~${ts - t0}ms`,
    );
  }

  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  const cursor = fresh.cursors.id(cursorId);
  assert.equal(cursor.status, "failed", "4th attempt exhausts the retry budget");
  assert.match(cursor.errorMessage, /flaky boom/);
  assert.equal(fresh.status, "failed");
  assert.equal(delays.length, 3, "no further retry scheduled after exhaustion");
});
