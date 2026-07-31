import test from "node:test";
import assert from "node:assert/strict";
import { PICKER_NODES } from "../../nodes/nodeCatalog.js";
import { NODE_KB } from "../brian/brian.nodes.js";

// mcp.tools.js pulls config/env.js, which throws at import time when these are
// unset. CI has no .env, so seed them before the dynamic import.
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.ENCRYPTION_KEY ||= "0123456789abcdef0123456789abcdef";

const { TOOLS, listToolSpecs } = await import("./mcp.tools.js");

const call = (name, args, api) => TOOLS.find((t) => t.name === name).handler(args, api);

function fakeApi({ credentials = [], onPost } = {}) {
  const posts = [];
  return {
    posts,
    get: async () => ({ status: 200, data: { credentials } }),
    post: async (url, body) => {
      posts.push({ url, body });
      return onPost
        ? onPost(url, body)
        : { status: 201, data: { credential: { _id: "b".repeat(24), name: body.name, type: body.type } } };
    },
  };
}

test("every tool declares a usable spec", () => {
  for (const spec of listToolSpecs()) {
    assert.ok(spec.name && spec.description, `${spec.name} missing name/description`);
    assert.equal(spec.inputSchema.type, "object", `${spec.name} schema is not an object`);
    assert.equal(
      spec.inputSchema.additionalProperties,
      false,
      `${spec.name} must reject unknown args`,
    );
  }
  assert.equal(new Set(TOOLS.map((t) => t.name)).size, TOOLS.length, "duplicate tool name");
});

test("node tools refuse anything the user cannot see in a picker", async () => {
  await assert.rejects(() => call("get_node", { node: "definitely_not_a_node" }), /not a node/);
  // The KB documents nodes that were removed from the pickers; they must stay unusable.
  const hidden = Object.keys(NODE_KB).find((k) => !PICKER_NODES.some((n) => n.key === k));
  if (hidden) {
    await assert.rejects(() => call("get_node", { node: hidden }), /not a node/);
    await assert.rejects(() => call("list_node_actions", { node: hidden }), /not a node/);
  }
});

test("a near-miss node key suggests real alternatives", async () => {
  await assert.rejects(() => call("get_node", { node: "slak" }), /slack/);
});

test("list_nodes hides nodes with no backend handler unless asked", async () => {
  const dead = PICKER_NODES.find((n) => !n.executable);
  assert.ok(dead, "expected at least one canvas-only node to guard against");
  const hidden = await call("list_nodes", { search: dead.key });
  assert.ok(!hidden.includes(`• ${dead.key} `), `${dead.key} leaked into the default listing`);
  const shown = await call("list_nodes", { search: dead.key, include_unavailable: true });
  assert.match(shown, /not runnable yet/);
});

test("get_node warns loudly when a node cannot run", async () => {
  const dead = PICKER_NODES.find((n) => !n.executable);
  const out = await call("get_node", { node: dead.key }, fakeApi());
  assert.match(out, /NOT RUNNABLE/);
});

test("get_node reports the credential a node needs and what is already connected", async () => {
  const connected = fakeApi({
    credentials: [{ _id: "a".repeat(24), name: "My Slack", type: "oauth", provider: "slack" }],
  });
  const withCred = await call("get_node", { node: "slack" }, connected);
  assert.match(withCred, /My Slack/);
  assert.match(withCred, /credentialId/);

  const missing = await call("get_node", { node: "slack" }, fakeApi());
  assert.match(missing, /slack OAuth credential/);
  assert.match(missing, /None saved yet/);
});

test("triggers never advertise operations", async () => {
  const trigger = PICKER_NODES.find((n) => n.category === "trigger" && n.integration);
  assert.ok(trigger, "expected a trigger backed by an integration router");
  const out = await call("list_node_actions", { node: trigger.key });
  assert.match(out, /is a trigger/);
  assert.ok(!/default "/.test(out), "trigger exposed a default operation");
});

test("list_node_actions returns real operations for an app node", async () => {
  const out = await call("list_node_actions", { node: "slack", search: "message" });
  assert.match(out, /postMessage/);
  assert.match(out, /operation\(s\)/);
});

test("create_credential never tries to mint an OAuth credential from chat", async () => {
  const api = fakeApi();
  const out = await call("create_credential", { name: "My Gmail", node: "gmail", secret: "x" }, api);
  assert.match(out, /OAuth/);
  assert.match(out, /credentials/);
  assert.equal(api.posts.length, 0, "an OAuth credential must never be POSTed");
});

test("create_credential requires a secret and stores it under the node's type", async () => {
  await assert.rejects(
    () => call("create_credential", { name: "Stripe key", node: "stripe" }, fakeApi()),
    /secret is required/,
  );
  const api = fakeApi();
  const out = await call(
    "create_credential",
    { name: "Stripe key", node: "stripe", secret: "sk_test_x" },
    api,
  );
  assert.equal(api.posts[0].url, "/credentials");
  assert.equal(api.posts[0].body.type, "stripe");
  assert.ok(!out.includes("sk_test_x"), "the secret must never be echoed back");
});

// An MCP tool that ships no annotations is treated by approval-gated clients as
// possibly-destructive, so every first call blocks on an approval the connector
// may never be able to ask for — the model just sees "No approval received" and
// the request never reaches this server. Reads have to say they are reads.
test("every tool declares annotations and reads are marked read-only", () => {
  const specs = listToolSpecs();
  assert.equal(specs.length, TOOLS.length);

  for (const spec of specs) {
    assert.ok(spec.annotations, `${spec.name} has no annotations`);
    assert.equal(typeof spec.annotations.readOnlyHint, "boolean", `${spec.name} readOnlyHint`);
    assert.equal(typeof spec.annotations.title, "string", `${spec.name} title`);
  }

  const readOnly = specs.filter((s) => s.annotations.readOnlyHint).map((s) => s.name).sort();
  assert.deepEqual(readOnly, [
    "blinkbox_api_get",
    "get_automation",
    "get_execution",
    "get_execution_logs",
    "get_node",
    "list_automations",
    "list_credentials",
    "list_executions",
    "list_node_actions",
    "list_nodes",
  ]);

  for (const spec of specs) {
    if (spec.annotations.readOnlyHint) {
      assert.equal(spec.annotations.destructiveHint, false, `${spec.name} cannot be read-only and destructive`);
    }
  }

  const del = specs.find((s) => s.name === "delete_automation");
  assert.equal(del.annotations.destructiveHint, true);
  // The write passthrough accepts DELETE, so it can never claim to be read-only.
  const passthrough = specs.find((s) => s.name === "blinkbox_api");
  assert.equal(passthrough.annotations.readOnlyHint, false);
  assert.equal(passthrough.annotations.destructiveHint, true);
});
