import test from "node:test";
import assert from "node:assert/strict";
import { derive } from "../../scripts/nodeCatalog.derive.mjs";
import { PICKER_NODES, listPickerNodes, getPickerNode, BUILDABLE_KEYS } from "./nodeCatalog.js";

test("catalog matches the frontend pickers — regenerate with `npm run catalog`", () => {
  assert.deepEqual(PICKER_NODES, derive().nodes);
});

test("every catalog entry is reachable from at least one picker", () => {
  for (const n of PICKER_NODES) {
    assert.ok(n.pickers.length > 0, `${n.key} has no picker`);
    assert.ok(n.key && n.label, `${n.key} is missing key or label`);
  }
});

test("buildable set excludes canvas-only nodes", () => {
  for (const n of PICKER_NODES) {
    assert.equal(BUILDABLE_KEYS.has(n.key), n.executable, `${n.key} buildable/executable mismatch`);
  }
});

test("lookups and filters agree with the flat list", () => {
  assert.equal(getPickerNode("slack")?.pickers.includes("action"), true);
  assert.equal(getPickerNode("definitely_not_a_node"), null);
  assert.equal(
    listPickerNodes({ picker: "trigger" }).length,
    PICKER_NODES.filter((n) => n.pickers.includes("trigger")).length,
  );
  assert.ok(listPickerNodes({ buildableOnly: true }).every((n) => n.executable));
});
