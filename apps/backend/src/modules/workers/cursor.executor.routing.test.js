import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startDb,
  stopDb,
  seed,
  processCursor,
  Execution,
  enqueued,
} from "./executor.testkit.js";

before(startDb);
after(stopDb);

test("__conditionResult:false routes to false-handle edges without failing the execution", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_condition_false", data: {} },
      { id: "nTrue", type: "stub_ok", data: {} },
      { id: "nFalse", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "nTrue", sourceHandle: "true" },
      { id: "e2", source: "n1", target: "nFalse", sourceHandle: "false" },
    ],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  let fresh = await Execution.findById(execution._id);
  assert.equal(fresh.cursors.id(cursorId).status, "completed", "condition cursor must not fail");
  const spawned = fresh.cursors.filter((c) => !c._id.equals(cursorId));
  assert.equal(spawned.length, 1, "only the false branch spawns");
  assert.equal(spawned[0].nodeId, "nFalse");
  assert.notEqual(fresh.status, "failed");

  await processCursor({ executionId: execution._id, cursorId: spawned[0]._id });
  fresh = await Execution.findById(execution._id);
  assert.equal(fresh.status, "executed", "false path finishes as a successful execution");
});

test("__loopFanOut spawns one child cursor per item with _loopItemOverride", async () => {
  const items = [{ json: { i: 1 } }, { json: { i: 2 } }, { json: { i: 3 } }];
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "loop", type: "stub_fanout", data: { items } },
      { id: "child", type: "stub_ok", data: {} },
    ],
    edges: [{ id: "e1", source: "loop", target: "child" }],
    cursorNode: "loop",
  });

  const enqueuedBefore = enqueued.length;
  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  const children = fresh.cursors.filter((c) => c.nodeId === "child");
  assert.equal(children.length, 3);
  assert.deepEqual(
    children.map((c) => c._loopItemOverride),
    [{ i: 1 }, { i: 2 }, { i: 3 }],
  );
  assert.ok(children.every((c) => c.status === "pending"));
  assert.equal(enqueued.length - enqueuedBefore, 3, "each child cursor is enqueued");
});

test("routeEdges refuses to spawn once the execution is at MAX_CURSORS_PER_EXECUTION", async () => {
  const filler = Array.from({ length: 499 }, () => ({ nodeId: "child", status: "completed" }));
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_ok", data: {} },
      { id: "child", type: "stub_ok", data: {} },
    ],
    edges: [{ id: "e1", source: "n1", target: "child" }],
    cursorNode: "n1",
    extraCursors: filler,
  });

  const enqueuedBefore = enqueued.length;
  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.cursors.length, 500, "no cursor added beyond the cap");
  assert.equal(enqueued.length, enqueuedBefore, "nothing enqueued at the cap");
  assert.equal(fresh.cursors.id(cursorId).status, "completed");
});

test("loop fan-out is sliced to the remaining cursor slots", async () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ json: { i } }));
  const filler = Array.from({ length: 497 }, () => ({ nodeId: "child", status: "completed" }));
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "loop", type: "stub_fanout", data: { items } },
      { id: "child", type: "stub_ok", data: {} },
    ],
    edges: [{ id: "e1", source: "loop", target: "child" }],
    cursorNode: "loop",
    extraCursors: filler,
  });

  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.cursors.length, 500, "fan-out fills up to the cap and stops");
  const children = fresh.cursors.filter((c) => c._loopItemOverride != null);
  assert.equal(children.length, 2, "only slotsLeft items spawn (500 - 498 running)");
});

// condition --true--> A --\
//           --false-> B --+--> C
// The false branch never runs, so C must not wait on B forever.
test("a merge node still runs when a sibling condition branch was never taken", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_condition_false", data: {} },
      { id: "A", type: "stub_ok", data: {} },
      { id: "B", type: "stub_ok", data: {} },
      { id: "C", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "A", sourceHandle: "true" },
      { id: "e2", source: "n1", target: "B", sourceHandle: "false" },
      { id: "e3", source: "A", target: "C" },
      { id: "e4", source: "B", target: "C" },
    ],
    cursorNode: "n1",
  });

  for (let i = 0; i < 10; i++) {
    const fresh = await Execution.findById(execution._id);
    const pending = fresh.cursors.find((c) => c.status === "pending");
    if (!pending) break;
    await processCursor({ executionId: execution._id, cursorId: pending._id });
  }

  const fresh = await Execution.findById(execution._id);
  assert.ok(fresh.cursors.some((c) => c.nodeId === "B"), "false branch ran");
  assert.ok(!fresh.cursors.some((c) => c.nodeId === "A"), "true branch was skipped");
  assert.ok(fresh.cursors.some((c) => c.nodeId === "C"), "merge node was reached");
});

// n1 fans out to A and B in parallel; C must wait for BOTH, not race ahead.
test("a merge node waits for a parallel branch that is still pending", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_ok", data: {} },
      { id: "A", type: "stub_ok", data: {} },
      { id: "B", type: "stub_ok", data: {} },
      { id: "C", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "A" },
      { id: "e2", source: "n1", target: "B" },
      { id: "e3", source: "A", target: "C" },
      { id: "e4", source: "B", target: "C" },
    ],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  let fresh = await Execution.findById(execution._id);
  const aCursor = fresh.cursors.find((c) => c.nodeId === "A");
  await processCursor({ executionId: execution._id, cursorId: aCursor._id });

  fresh = await Execution.findById(execution._id);
  assert.ok(!fresh.cursors.some((c) => c.nodeId === "C"), "C held while B is pending");

  const bCursor = fresh.cursors.find((c) => c.nodeId === "B");
  await processCursor({ executionId: execution._id, cursorId: bCursor._id });

  fresh = await Execution.findById(execution._id);
  assert.ok(fresh.cursors.some((c) => c.nodeId === "C"), "C spawns once both arrive");
});

// A false result with nothing wired to the false handle is a dead end, not an
// error — the branch stops and the execution finalizes as a success.
test("a false condition with an unwired false handle ends the run cleanly", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_condition_false", data: {} },
      { id: "nTrue", type: "stub_ok", data: {} },
    ],
    edges: [{ id: "e1", source: "n1", target: "nTrue", sourceHandle: "true" }],
    cursorNode: "n1",
  });

  const enqueuedBefore = enqueued.length;
  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  assert.ok(!fresh.cursors.some((c) => c.nodeId === "nTrue"), "true branch not taken");
  assert.equal(enqueued.length, enqueuedBefore, "nothing enqueued");
  assert.equal(fresh.cursors.id(cursorId).status, "completed");
  assert.equal(fresh.status, "executed", "finalized, not left running");
  assert.ok(fresh.completedAt, "completedAt is stamped");
});
