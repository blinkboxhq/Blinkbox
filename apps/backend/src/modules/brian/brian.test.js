import test from "node:test";
import assert from "node:assert/strict";
import { buildBrianPreflightQuestions } from "./brian.preflight.js";
import { toolToCanvas } from "./brian.repair.js";
import { mergeBrianFlow, visualRepairBrianFlow } from "../../../../frontend/src/pages/Workspace/brianFlowMerge.js";

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
      targetHandle: "llm",
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
  assert.equal(merged.edges.length, 1);
});

test("Brian preflight asks before building credential-heavy Google RAG agents", () => {
  const questions = buildBrianPreflightQuestions([
    { role: "user", content: "make me a rag agent with all the google integrations and power it with chat and use claude cheaper one" },
  ], "make me a rag agent with all the google integrations and power it with chat and use claude cheaper one");

  assert.ok(questions);
  assert.equal(questions.questions.length, 2);
  assert.equal(questions.questions[0].id, "memory_provider");
  assert.equal(questions.questions[0].options[0].value, "agent_memory_pinecone");
  assert.equal(questions.questions[1].id, "credential_setup");
});

test("Google RAG agent output uses cheap Claude, Pinecone memory, llm slot, and Google integrations", () => {
  const flow = toolToCanvas({
    nodes: [
      { id: "n1", backendType: "chat_trigger", label: "On Chat Message", nodeType: "trigger", x: 0, y: 0, config: {} },
      { id: "n2", backendType: "ai_agent", label: "RAG Agent", nodeType: "action", x: 0, y: 0, config: { systemPrompt: "Answer with Google Workspace context." } },
      { id: "n3", backendType: "agent_anthropic", label: "Claude Haiku", nodeType: "action", x: 0, y: 0, config: { model: "cheap claude", credentialId: "" } },
      { id: "n4", backendType: "agent_memory_pinecone", label: "Pinecone Memory", nodeType: "action", x: 0, y: 0, config: { credentialId: "", indexName: "blinkbox-rag" } },
      { id: "n5", backendType: "agent_integration_gmail", label: "Gmail", nodeType: "action", x: 0, y: 0, config: { credentialId: "", alias: "gmail" } },
      { id: "n6", backendType: "agent_integration_google_calendar", label: "Google Calendar", nodeType: "action", x: 0, y: 0, config: { credentialId: "", alias: "calendar" } },
      { id: "n7", backendType: "agent_integration_google_sheets", label: "Google Sheets", nodeType: "action", x: 0, y: 0, config: { credentialId: "", alias: "sheets" } },
      { id: "n8", backendType: "agent_integration_google_drive", label: "Google Drive", nodeType: "action", x: 0, y: 0, config: { credentialId: "", alias: "drive" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  });

  assert.equal(flow.nodes.find((node) => node.id === "n3").data.config.model, "claude-haiku-4-5-20251001");
  assert.ok(flow.edges.some((edge) => edge.source === "n3" && edge.target === "n2" && edge.targetHandle === "llm"));
  assert.ok(flow.edges.some((edge) => edge.source === "n4" && edge.target === "n2" && edge.targetHandle === "memory"));
  for (const id of ["n5", "n6", "n7", "n8"]) {
    assert.ok(flow.edges.some((edge) => edge.source === id && edge.target === "n2" && edge.targetHandle === "integration"));
  }
});

test("visualRepairBrianFlow flips reversed satellites and removes inbound trigger edges", () => {
  const repaired = visualRepairBrianFlow({
    nodes: [
      { id: "n1", type: "custom", position: { x: 0, y: 0 }, data: { backendType: "chat_trigger", type: "trigger", config: {} } },
      { id: "n2", type: "custom", position: { x: 0, y: 0 }, data: { backendType: "ai_agent", type: "action", config: {} } },
      { id: "n3", type: "custom", position: { x: 0, y: 0 }, data: { backendType: "agent_anthropic", type: "action", config: {} } },
    ],
    edges: [
      { id: "bad-trigger", source: "n2", target: "n1" },
      { id: "reversed", source: "n2", target: "n3", targetHandle: "chat_model" },
    ],
  });

  assert.equal(repaired.edges.some((edge) => edge.target === "n1"), false);
  assert.ok(repaired.edges.some((edge) => edge.id === "reversed" && edge.source === "n3" && edge.target === "n2" && edge.targetHandle === "llm"));
});
