import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildBrianPreflightQuestions } from "./brian.preflight.js";
import { toolToCanvas } from "./brian.repair.js";
import { NODE_KB, buildNodeRef } from "./brian.nodes.js";
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
      sourceHandle: "agent_out",
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

test("toolToCanvas builds the hub an orphan agent satellite implies", () => {
  const flow = toolToCanvas({
    nodes: [
      { id: "trigger_1", backendType: "chat_trigger", label: "Chat Trigger", nodeType: "trigger", x: 0, y: 0, config: {} },
      { id: "agent_1", backendType: "agent_nvidia_nim", label: "NVIDIA NIM", nodeType: "action", x: 0, y: 0, config: { model: "nvidia/nemotron", credentialId: "c1", prompt: "{{$json.message}}", systemPrompt: "Be concise." } },
    ],
    edges: [{ id: "e_trigger_agent", source: "trigger_1", target: "agent_1", sourceHandle: "output" }],
  });

  assert.ok(flow);
  const hub = flow.nodes.find((n) => n.data.backendType === "ai_agent");
  assert.ok(hub, "hub synthesized");
  assert.equal(hub.data.config.prompt, "{{$json.message}}");
  assert.equal(hub.data.config.systemPrompt, "Be concise.");
  assert.ok(flow.edges.some((e) => e.source === "trigger_1" && e.target === hub.id && !e.targetHandle));
  assert.ok(flow.edges.some((e) => e.source === "agent_1" && e.target === hub.id && e.targetHandle === "llm"));
  assert.ok(!flow.edges.some((e) => e.target === "agent_1"), "satellite is never a chain target");
});

test("visualRepairBrianFlow builds the hub a saved orphan satellite implies", () => {
  const flow = visualRepairBrianFlow({
    nodes: [
      { id: "trigger_1", type: "custom", position: { x: 0, y: 0 }, data: { label: "On Chat Message", backendType: "chat_trigger", type: "trigger", config: {} } },
      { id: "agent_1", type: "custom", position: { x: 0, y: 0 }, data: { label: "NVIDIA NIM", backendType: "agent_nvidia_nim", type: "action", config: { prompt: "{{$json.message}}" } } },
    ],
    edges: [{ id: "e1", source: "trigger_1", target: "agent_1", sourceHandle: "output", targetHandle: null }],
  });

  const hub = flow.nodes.find((n) => n.data.backendType === "ai_agent");
  assert.ok(hub, "hub synthesized");
  assert.deepEqual(hub.position, { x: 400, y: 300 });
  assert.equal(hub.data.config.prompt, "{{$json.message}}");
  assert.ok(flow.edges.some((e) => e.source === "trigger_1" && e.target === hub.id && !e.targetHandle));
  assert.ok(flow.edges.some((e) =>
    e.source === "agent_1" &&
    e.target === hub.id &&
    e.sourceHandle === "agent_out" &&
    e.targetHandle === "llm"
  ));
});

test("visualRepairBrianFlow leaves a hubless non-agent flow alone", () => {
  const flow = visualRepairBrianFlow({
    nodes: [
      { id: "t", type: "custom", position: { x: 10, y: 20 }, data: { label: "Webhook", backendType: "webhook", type: "trigger", config: {} } },
      { id: "a", type: "custom", position: { x: 30, y: 40 }, data: { label: "Slack", backendType: "slack", type: "action", config: {} } },
    ],
    edges: [{ id: "e1", source: "t", target: "a", sourceHandle: "output", targetHandle: null }],
  });

  assert.equal(flow.nodes.length, 2);
  assert.deepEqual(flow.nodes.map((n) => n.position), [{ x: 10, y: 20 }, { x: 30, y: 40 }]);
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

test("Brian preflight asks only for the points a Google RAG prompt left open", () => {
  const prompt =
    "make me a rag agent with all the google integrations and power it with chat and use claude cheaper one";
  const questions = buildBrianPreflightQuestions([{ role: "user", content: prompt }], prompt);

  assert.ok(questions);
  // Goal, entrypoint and model are all stated in the prompt — re-asking them is
  // the loop this preflight exists to avoid. RAG with no named store still gets
  // asked, because guessing provisions a vector DB the user may not have.
  assert.deepEqual(questions.questions.map((q) => q.id), ["memory_provider", "credential_setup"]);
  assert.ok(questions.intro.includes("Claude Haiku") || questions.intro.includes("Cheap Claude"));

  const memory = questions.questions[0].options;
  assert.equal(memory[0].value, "none");
  assert.equal(memory.filter((o) => o.value === "agent_memory_pinecone").length, 1);
});

test("Brian preflight asks the full brief only when the prompt says almost nothing", () => {
  const questions = buildBrianPreflightQuestions(
    [{ role: "user", content: "build me an ai agent" }],
    "build me an ai agent",
  );

  assert.ok(questions);
  assert.deepEqual(questions.questions.map((q) => q.id), [
    "agent_goal",
    "entrypoint",
    "model_choice",
    "credential_setup",
  ]);
  const models = questions.questions[2].options.map((o) => o.value);
  assert.ok(models.includes("agent_nvidia_nim"));
  assert.ok(questions.questions[1].options.some((o) => o.value === "manual"));
  assert.ok(!questions.intro.includes("Haiku"));
});

test("Brian preflight builds instead of re-asking a prompt that answers the brief", () => {
  const prompt =
    "Research agent that finds leads. Entrypoint: manual run with a niche input. " +
    "Model profile: NVIDIA NIM specifically, not Claude, not OpenAI, not Gemini. " +
    "Memory: none. Credentials: use existing creds.";

  assert.equal(buildBrianPreflightQuestions([{ role: "user", content: prompt }], prompt), null);
});

test("Brian preflight does not re-ask once a brief was already returned", () => {
  const asked = [
    { role: "user", content: "build me an ai agent" },
    { role: "assistant", content: "Agent build brief: answer these 4 point(s)." },
    { role: "user", content: "whatever you think is best" },
  ];

  assert.equal(buildBrianPreflightQuestions(asked, "whatever you think is best"), null);
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
  assert.deepEqual(flow.nodes.find((node) => node.id === "n3").position, { x: 260, y: 560 });
  assert.deepEqual(flow.nodes.find((node) => node.id === "n4").position, { x: 540, y: 560 });
  assert.ok(flow.nodes.filter((node) => node.data.backendType.startsWith("agent_integration_")).every((node) => node.position.y === 780));
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

test("toolToCanvas upgrades mistaken linear signup email flow into an AI agent hub", () => {
  const flow = toolToCanvas({
    userText: "when a automation fires a ai agent takes the users email gives him a thanks for signing email and saves it in a spreadsheet",
    nodes: [
      { id: "n1", backendType: "form_trigger", label: "Form Trigger", nodeType: "trigger", x: 0, y: 0, config: { fields: [{ name: "email", type: "email" }] } },
      { id: "n2", backendType: "manual", label: "Manual Trigger", nodeType: "trigger", x: 0, y: 0, config: {} },
      { id: "n3", backendType: "gmail", label: "Gmail", nodeType: "action", x: 0, y: 0, config: { credentialId: "", to: "{{$json.email}}" } },
      { id: "n4", backendType: "google_sheets", label: "Google Sheets", nodeType: "action", x: 0, y: 0, config: { credentialId: "", operation: "append" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
    ],
  });

  const backendTypes = flow.nodes.map((node) => node.data.backendType);
  assert.ok(backendTypes.includes("form_trigger"));
  assert.ok(backendTypes.includes("ai_agent"));
  assert.ok(backendTypes.includes("agent_anthropic"));
  assert.ok(backendTypes.includes("agent_integration_gmail"));
  assert.ok(backendTypes.includes("agent_integration_google_sheets"));
  assert.equal(backendTypes.includes("manual"), false);
  assert.equal(backendTypes.includes("gmail"), false);
  assert.equal(backendTypes.includes("google_sheets"), false);

  const agent = flow.nodes.find((node) => node.data.backendType === "ai_agent");
  const model = flow.nodes.find((node) => node.data.backendType === "agent_anthropic");
  const gmail = flow.nodes.find((node) => node.data.backendType === "agent_integration_gmail");
  const sheets = flow.nodes.find((node) => node.data.backendType === "agent_integration_google_sheets");

  assert.ok(flow.edges.some((edge) => edge.source === "n1" && edge.target === agent.id));
  assert.ok(flow.edges.some((edge) => edge.source === model.id && edge.target === agent.id && edge.targetHandle === "llm"));
  assert.ok(flow.edges.some((edge) => edge.source === gmail.id && edge.target === agent.id && edge.targetHandle === "integration"));
  assert.ok(flow.edges.some((edge) => edge.source === sheets.id && edge.target === agent.id && edge.targetHandle === "integration"));
  assert.ok(flow.nodes.every((node) => {
    const bt = node.data.backendType;
    return !bt.startsWith("agent_") || bt === "ai_agent" || node.position.y > agent.position.y;
  }));
});

// Brian can only pick an operation it was told about, and a value the panels and
// executor don't have is worse than no value: the panel silently falls back to
// its default operation, so the step reads as unconfigured while holding config.
// Keep every enumerated operation in NODE_KB grounded in a real panel.
test("every NODE_KB operation enum exists in the node's real operation list", () => {
  const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
  const ENUM_D = /^[A-Za-z0-9_.:-]+(\s*\|\s*[A-Za-z0-9_.:-]+)+$/;

  const panelOps = (type) => {
    const dir = path.join(repoRoot, "packages/nodes", type);
    if (!fs.existsSync(dir)) return null;
    const vals = new Set();
    for (const file of fs.readdirSync(dir)) {
      if (!/\.jsx?$/.test(file)) continue;
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      const collect = (chunk) => {
        for (const m of chunk.matchAll(/value:\s*['"`]([^'"`]+)['"`]/g)) vals.add(m[1]);
      };
      const ops = src.indexOf("OPERATIONS = [");
      if (ops >= 0) collect(src.slice(ops, src.indexOf("\n];", ops) + 3));
      const meta = Math.max(src.indexOf('name: "operation"'), src.indexOf("name: 'operation'"));
      if (meta >= 0) collect(src.slice(meta, meta + 2500));
    }
    return vals.size ? vals : null;
  };

  const failures = [];
  let checked = 0;
  for (const [type, node] of Object.entries(NODE_KB)) {
    const field = node.fields.find(
      (f) => f.k === "operation" && f.t === "select" && ENUM_D.test(String(f.d || "").trim()),
    );
    if (!field) continue;
    const real = panelOps(type);
    if (!real) continue;
    checked++;
    const declared = String(field.d).split("|").map((s) => s.trim());
    const missing = declared.filter((v) => !real.has(v));
    if (!real.has(field.ex)) missing.push(`ex:${field.ex}`);
    if (missing.length) failures.push(`${type} → ${missing.join(", ")}`);
  }

  assert.ok(checked >= 20, `expected to check 20+ nodes, checked ${checked}`);
  assert.deepEqual(failures, []);
});

test("buildNodeRef enumerates select operations instead of one sample value", () => {
  const line = buildNodeRef().split("\n").find((l) => l.startsWith("slack:"));
  assert.match(line, /operation\(one of: postMessage\|/);
});
