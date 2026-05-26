import test from "node:test";
import assert from "node:assert/strict";
import { toolToCanvas } from "./brian.repair.js";
import { mergeBrianFlow } from "../../../../frontend/src/pages/Workspace/brianFlowMerge.js";

test("toolToCanvas flips reversed agent satellite edges", () => {
  const flow = toolToCanvas({
    nodes: [
      { id: "n1", backendType: "chat_trigger", label: "Chat", nodeType: "trigger", x: 0, y: 0, config: {} },
      { id: "n2", backendType: "ai_agent", label: "Agent", nodeType: "action", x: 0, y: 0, config: { prompt: "Help" } },
      { id: "n3", backendType: "agent_anthropic", label: "Model", nodeType: "action", x: 0, y: 0, config: { model: "claude-sonnet-4-6", credentialId: "" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3", targetHandle: "chat_model" },
    ],
  });

  assert.ok(flow);
  assert.deepEqual(
    flow.edges.find((edge) => edge.id === "e2"),
    {
      id: "e2",
      source: "n3",
      target: "n2",
      sourceHandle: null,
      targetHandle: "chat_model",
      type: "configurable",
      data: { conditionPath: "" },
      style: {},
    },
  );
});

test("toolToCanvas auto-wires missing satellite edges to ai_agent", () => {
  const flow = toolToCanvas({
    nodes: [
      { id: "n1", backendType: "chat_trigger", label: "Chat", nodeType: "trigger", x: 0, y: 0, config: {} },
      { id: "n2", backendType: "ai_agent", label: "Agent", nodeType: "action", x: 0, y: 0, config: { prompt: "Help" } },
      { id: "n3", backendType: "agent_integration_gmail", label: "Gmail", nodeType: "action", x: 0, y: 0, config: { credentialId: "", alias: "gmail" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  });

  assert.ok(flow);
  assert.ok(flow.edges.some((edge) =>
    edge.source === "n3" &&
    edge.target === "n2" &&
    edge.targetHandle === "integration"
  ));
});

test("toolToCanvas drops inbound trigger edges", () => {
  const flow = toolToCanvas({
    nodes: [
      { id: "n1", backendType: "chat_trigger", label: "Chat", nodeType: "trigger", x: 0, y: 0, config: {} },
      { id: "n2", backendType: "ai_agent", label: "Agent", nodeType: "action", x: 0, y: 0, config: { prompt: "Help" } },
    ],
    edges: [
      { id: "bad", source: "n2", target: "n1" },
      { id: "good", source: "n1", target: "n2" },
    ],
  });

  assert.ok(flow);
  assert.equal(flow.edges.some((edge) => edge.target === "n1"), false);
  assert.ok(flow.warnings.some((warning) => warning.includes("cannot be a target")));
});

test("mergeBrianFlow upserts nodes and deduplicates edges", () => {
  const existingNodes = [
    {
      id: "n1",
      type: "custom",
      position: { x: 1, y: 1 },
      data: { label: "Old", backendType: "chat_trigger", type: "trigger", config: { keep: true } },
    },
  ];
  const existingEdges = [
    { id: "e1", source: "n1", target: "n2", sourceHandle: null, targetHandle: null },
  ];
  const flow = {
    nodes: [
      {
        id: "n1",
        type: "custom",
        position: { x: 10, y: 20 },
        data: { label: "New", backendType: "chat_trigger", type: "trigger", config: { added: true } },
      },
      {
        id: "n2",
        type: "custom",
        position: { x: 30, y: 40 },
        data: { label: "Agent", backendType: "ai_agent", type: "action", config: {} },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", sourceHandle: null, targetHandle: null },
      { source: "n1", target: "n2", sourceHandle: null, targetHandle: null },
      { source: "n1", target: "n2", sourceHandle: null, targetHandle: null },
    ],
  };

  const merged = mergeBrianFlow(existingNodes, existingEdges, flow);

  assert.equal(merged.nodes.length, 2);
  assert.equal(merged.nodes.find((node) => node.id === "n1").data.label, "New");
  assert.deepEqual(merged.nodes.find((node) => node.id === "n1").data.config, { keep: true, added: true });
  assert.equal(merged.edges.length, 2);
});
