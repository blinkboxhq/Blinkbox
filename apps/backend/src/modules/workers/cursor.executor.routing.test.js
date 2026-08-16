import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startDb,
  stopDb,
  seed,
  processCursor,
  Execution,
  enqueued,
  deducted,
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

// The verdict is an engine signal, not data. Left in the payload it landed in
// the next node's $json, and any node that passes its input through re-emitted
// it — the executor then read that as the passthrough node's own false verdict
// and routed it to failure edges it never had, so the branch died one node in.
test("the false branch keeps flowing past a passthrough node", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_condition_false", data: {} },
      { id: "pass", type: "stub_passthrough", data: {} },
      { id: "after", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "pass", sourceHandle: "false" },
      { id: "e2", source: "pass", target: "after" },
    ],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });
  let fresh = await Execution.findById(execution._id);
  const branch = fresh.cursors.find((c) => c.nodeId === "pass");
  assert.ok(branch, "false branch cursor spawned");
  assert.ok(
    !(branch._branchItems || []).some((i) => "__conditionResult" in i),
    "the signal is stripped before it reaches the branch",
  );

  await processCursor({ executionId: execution._id, cursorId: branch._id });
  fresh = await Execution.findById(execution._id);
  assert.ok(fresh.cursors.some((c) => c.nodeId === "after"), "the node after the false branch still runs");
});

// One failing item used to flip the whole batch onto the false branch and the
// true branch never fired at all.
test("a mixed batch splits per item across the two branches", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "t", type: "stub_two_items", data: {} },
      { id: "n1", type: "stub_condition_split", data: {} },
      { id: "nTrue", type: "stub_ok", data: {} },
      { id: "nFalse", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e0", source: "t", target: "n1" },
      { id: "e1", source: "n1", target: "nTrue", sourceHandle: "true" },
      { id: "e2", source: "n1", target: "nFalse", sourceHandle: "false" },
    ],
    cursorNode: "t",
  });

  await processCursor({ executionId: execution._id, cursorId });
  let fresh = await Execution.findById(execution._id);
  const cond = fresh.cursors.find((c) => c.nodeId === "n1");
  await processCursor({ executionId: execution._id, cursorId: cond._id });

  fresh = await Execution.findById(execution._id);
  const yes = fresh.cursors.find((c) => c.nodeId === "nTrue");
  const no = fresh.cursors.find((c) => c.nodeId === "nFalse");
  assert.ok(yes, "the passing item still takes the true branch");
  assert.ok(no, "the failing item takes the false branch");
  assert.deepEqual(yes._branchItems.map((i) => i.id), [1]);
  assert.deepEqual(no._branchItems.map((i) => i.id), [2]);
});

// ── Split outputs ────────────────────────────────────────────────────────────

test("split outputs: a node error powers only the failed handle", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_hard_fail", data: { config: { splitOutputs: true } } },
      { id: "ok", type: "stub_ok", data: {} },
      { id: "bad", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "ok", sourceHandle: "success" },
      { id: "e2", source: "n1", target: "bad", sourceHandle: "failed" },
    ],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  const spawned = fresh.cursors.filter((c) => !c._id.equals(cursorId));
  assert.equal(spawned.length, 1, "exactly one branch fires");
  assert.equal(spawned[0].nodeId, "bad", "the failed handle, not success");
});

test("split outputs: a handled failure does not mark the execution failed", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_hard_fail", data: { config: { splitOutputs: true } } },
      { id: "bad", type: "stub_ok", data: {} },
    ],
    edges: [{ id: "e2", source: "n1", target: "bad", sourceHandle: "failed" }],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });
  let fresh = await Execution.findById(execution._id);
  assert.equal(fresh.cursors.id(cursorId).status, "completed", "failure was handled in-graph");

  const spawned = fresh.cursors.filter((c) => !c._id.equals(cursorId));
  await processCursor({ executionId: execution._id, cursorId: spawned[0]._id });
  fresh = await Execution.findById(execution._id);
  assert.equal(fresh.status, "executed");
});

test("split outputs: with no failure branch wired, an error still stops the workflow", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_hard_fail", data: { config: { splitOutputs: true } } },
      { id: "ok", type: "stub_ok", data: {} },
    ],
    edges: [{ id: "e1", source: "n1", target: "ok", sourceHandle: "success" }],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.cursors.id(cursorId).status, "failed");
  assert.equal(fresh.cursors.length, 1, "success branch must not fire on an error");
  assert.equal(fresh.status, "failed");
});

test("split outputs: an output reporting success:false takes the failed handle", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_soft_fail", data: { config: { splitOutputs: true } } },
      { id: "ok", type: "stub_ok", data: {} },
      { id: "bad", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "ok", sourceHandle: "success" },
      { id: "e2", source: "n1", target: "bad", sourceHandle: "failed" },
    ],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  const spawned = (await Execution.findById(execution._id)).cursors.filter(
    (c) => !c._id.equals(cursorId),
  );
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].nodeId, "bad");
});

test("without the split toggle, success:false is just data and takes the normal path", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_soft_fail", data: {} },
      { id: "next", type: "stub_ok", data: {} },
    ],
    edges: [{ id: "e1", source: "n1", target: "next" }],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  const spawned = (await Execution.findById(execution._id)).cursors.filter(
    (c) => !c._id.equals(cursorId),
  );
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].nodeId, "next");
});

test("an edge from the legacy onFailure handle never fires on success", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_ok", data: {} },
      { id: "next", type: "stub_ok", data: {} },
      { id: "err", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "next" },
      { id: "e2", source: "n1", target: "err", sourceHandle: "onFailure" },
    ],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  const spawned = (await Execution.findById(execution._id)).cursors.filter(
    (c) => !c._id.equals(cursorId),
  );
  assert.deepEqual(spawned.map((c) => c.nodeId), ["next"]);
});

test("a skipped node stops its branch and does not report success", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_skipped", data: {} },
      { id: "next", type: "stub_ok", data: {} },
    ],
    edges: [{ id: "e1", source: "n1", target: "next" }],
    cursorNode: "n1",
  });

  const deductedBefore = deducted.length;
  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  const cursor = fresh.cursors.id(cursorId);
  assert.equal(cursor.status, "skipped", "a node that refused to run is not completed");
  assert.match(cursor.errorMessage, /'url' is required/, "the node's own reason survives");
  assert.equal(
    fresh.cursors.filter((c) => c.nodeId === "next").length,
    0,
    "the failed payload must not flow downstream",
  );
  assert.equal(fresh.status, "partial", "the run is not a clean success");
  assert.equal(deducted.length, deductedBefore, "a node that did nothing is charged nothing");
});

test("a skipped node takes a wired failure branch instead of dying silently", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_skipped", data: {} },
      { id: "ok", type: "stub_ok", data: {} },
      { id: "rescue", type: "stub_ok", data: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "ok" },
      { id: "e2", source: "n1", target: "rescue", sourceHandle: "failed" },
    ],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  const spawned = fresh.cursors.filter((c) => !c._id.equals(cursorId));
  assert.equal(spawned.length, 1, "only the failure branch spawns");
  assert.equal(spawned[0].nodeId, "rescue");
});

test("a skipped node reports node_skipped, not node_completed", async () => {
  const { execution, cursorId } = await seed({
    nodes: [{ id: "n1", type: "stub_skipped", data: {} }],
    cursorNode: "n1",
  });

  await processCursor({ executionId: execution._id, cursorId });

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.cursors.id(cursorId).status, "skipped");
  assert.equal(fresh.status, "partial");
  assert.ok(fresh.completedAt, "the run still finishes");
});

test("a real failure still outranks a skip when both are present", async () => {
  const { execution, cursorId } = await seed({
    nodes: [
      { id: "n1", type: "stub_skipped", data: {} },
      { id: "bad", type: "stub_hard_fail", data: {} },
    ],
    cursorNode: "n1",
    extraCursors: [{ nodeId: "bad", status: "pending" }],
  });

  await processCursor({ executionId: execution._id, cursorId });
  const mid = await Execution.findById(execution._id);
  const badCursor = mid.cursors.find((c) => c.nodeId === "bad");
  await processCursor({ executionId: execution._id, cursorId: badCursor._id });

  const fresh = await Execution.findById(execution._id);
  assert.equal(fresh.status, "failed", "a hard failure is not downgraded to partial");
});
