import test from "node:test";
import assert from "node:assert/strict";
import { deriveTriggerFields } from "../../scripts/triggerFields.derive.mjs";
import { TRIGGER_FIELDS, getTriggerFields } from "./triggerFields.js";
import { describeNodeFields, hasFieldKnowledge } from "./nodeFields.js";
import { PICKER_NODES, getPickerNode } from "./nodeCatalog.js";

test("trigger fields match the frontend panels — regenerate with `npm run catalog`", async () => {
  const { triggers } = await deriveTriggerFields();
  assert.deepEqual(TRIGGER_FIELDS, JSON.parse(JSON.stringify(triggers)));
});

test("every trigger schema names a real picker node", () => {
  for (const key of Object.keys(TRIGGER_FIELDS)) {
    assert.ok(getPickerNode(key), `${key} has panel fields but is in no picker`);
  }
});

test("every runnable picker node has field knowledge", () => {
  const missing = PICKER_NODES.filter((n) => n.executable && !hasFieldKnowledge(n)).map((n) => n.key);
  assert.deepEqual(missing, [], `no config schema for: ${missing.join(", ")}`);
});

test("a trigger reports its events, panel fields and output variables", async () => {
  const figma = await describeNodeFields(getPickerNode("figma_trigger"));
  assert.equal(figma.source, "trigger");
  assert.deepEqual(
    figma.fields.map((f) => f.k),
    ["fileKey", "token", "pollIntervalMinutes"],
  );
  // A field the panel pre-fills is not something the caller must supply.
  assert.equal(figma.fields.find((f) => f.k === "pollIntervalMinutes").r, false);
  assert.equal(figma.fields.find((f) => f.k === "fileKey").r, true);
  assert.ok(figma.events.length > 1);
  assert.ok(figma.out.length, "trigger exposes no output variables");
  assert.ok(!figma.out.some((v) => v.startsWith("$trigger.")), "output vars kept their prefix");
});

test("asking for an event folds in that event's config skeleton and extra fields", async () => {
  const spec = getTriggerFields("figma_trigger");
  const withExtra = spec.events.find((e) => e.fields?.length);
  const d = await describeNodeFields(getPickerNode("figma_trigger"), withExtra.id);
  assert.equal(d.event.id, withExtra.id);
  assert.equal(d.event.cfg.event, withExtra.cfg.event);
  for (const f of withExtra.fields) {
    assert.ok(d.fields.some((x) => x.k === f.k), `${f.k} missing from the merged field list`);
  }
});

test("an unknown event id resolves to no event rather than a wrong one", async () => {
  const d = await describeNodeFields(getPickerNode("figma_trigger"), "not_an_event");
  assert.equal(d.event, null);
  assert.ok(d.events.length, "events list must still be offered");
});

test("hand-authored knowledge covers nodes with no derived panel", async () => {
  const slack = await describeNodeFields(getPickerNode("slack"));
  assert.equal(slack.source, "kb");
  assert.ok(slack.fields.some((f) => f.k === "channel"), "lost slack's real fields");
});

test("a trigger describes its own panel, never its action twin's schema", async () => {
  const d = await describeNodeFields(getPickerNode("google_sheets_trigger"));
  assert.equal(d.source, "trigger");
  assert.ok(d.events.length, "a trigger with no events cannot be configured");
  assert.ok(
    !d.fields.some((f) => f.k === "operation"),
    "inherited the google_sheets action fields",
  );
});

test("the derived panel outranks a hand-authored trigger entry", async () => {
  const d = await describeNodeFields(getPickerNode("slack_trigger"));
  assert.equal(d.source, "trigger");
  assert.ok(d.fields.some((f) => f.k === "channel"), "not the panel's field list");
  assert.ok(!d.fields.some((f) => f.k === "events"), "kept a field the panel does not show");
});

test("an integration node with no hand-authored schema still gets operation + credential", async () => {
  const node = PICKER_NODES.find(
    (n) => n.integration && n.category !== "trigger" && !n.documented,
  );
  assert.ok(node, "expected an undocumented integration node");
  const d = await describeNodeFields(node);
  assert.equal(d.source, "integration");
  assert.equal(d.passthrough, true);
  const keys = d.fields.map((f) => f.k);
  assert.ok(keys.includes("operation") && keys.includes("credentialId"));
  assert.ok(d.fields.every((f) => f.k && f.t), "a derived field is missing key or type");
});

test("declared field keys are unique per node", async () => {
  for (const n of PICKER_NODES.filter((x) => x.executable)) {
    const keys = (await describeNodeFields(n)).fields.map((f) => f.k);
    assert.equal(new Set(keys).size, keys.length, `${n.key} declares a duplicate field key`);
  }
});
