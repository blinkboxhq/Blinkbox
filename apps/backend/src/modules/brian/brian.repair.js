import { NODE_KB } from "./brian.nodes.js";
import {
  AGENT_LAYOUT,
  AI_AGENT_HANDLES,
  BRIAN_CHEAP_ANTHROPIC_MODEL,
  HUB_SLOT,
  HUB_TYPES,
  INTEG_BT,
  MEMORY_BT,
  MODEL_BT,
  SUPPORTED_BACKEND_TYPES,
  TRIGGER_BT,
} from "./brian.registry.js";

const CREDENTIAL_KEYS = new Set([
  "credentialId",
  "credentials",
  "apiKey",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "password",
]);

function edgeKey(edge) {
  return [
    edge.id || "",
    edge.source || "",
    edge.target || "",
    edge.sourceHandle || "",
    edge.targetHandle || "",
  ].join("|");
}

function dedupeEdges(edges) {
  const seen = new Set();
  const out = [];
  for (const edge of edges) {
    const key = edge.id ? `id:${edge.id}` : `strict:${edgeKey(edge)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edge);
  }
  return out;
}

function canonicalAgentHandle(handle) {
  return handle === "chat_model" ? "llm" : handle;
}

const NO_SPLIT = new Set(["condition", "loop", "merge"]);

// Each source dot on a card is a handle with an id, and the canvas only hides a
// card's "add step" stub when an edge claims that exact id. A null sourceHandle
// claims nothing, so the stub lingers on a node that is visibly connected. The
// executor already treats null as the success path, so resolving it to whichever
// handle that path is on the source node is behavior-preserving.
function normalizeSourceHandles(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((e) => {
    if (e.sourceHandle) return e;
    const node = byId.get(e.source);
    const bt = node?.data?.backendType;
    let sourceHandle = "output";
    if (e.targetHandle && AI_AGENT_HANDLES.has(e.targetHandle)) sourceHandle = "agent_out";
    else if (bt === "condition") sourceHandle = "true";
    else if (node?.data?.type !== "trigger" && !NO_SPLIT.has(bt) && node?.data?.config?.splitOutputs) sourceHandle = "success";
    return { ...e, sourceHandle };
  });
}

function integrationXs(count) {
  const predefined = AGENT_LAYOUT.integrationX[Math.min(count, AGENT_LAYOUT.integrationX.length - 1)];
  if (predefined?.length === count) return predefined;
  const gap = AGENT_LAYOUT.integrationGap || 220;
  const start = AGENT_LAYOUT.hub.x - ((count - 1) * gap) / 2;
  return Array.from({ length: count }, (_, i) => Math.round(start + i * gap));
}

function wantsAiAgent(userText = "") {
  return /\b(ai\s*agent|agent\s+takes|agent\s+that|assistant)\b/i.test(String(userText || ""));
}

const DIRECT_TO_AGENT_INTEGRATION = new Map([
  ["gmail", { backendType: "agent_integration_gmail", label: "Gmail", alias: "gmail" }],
  ["google_sheets", { backendType: "agent_integration_google_sheets", label: "Google Sheets", alias: "sheets" }],
  ["google_calendar", { backendType: "agent_integration_google_calendar", label: "Google Calendar", alias: "calendar" }],
  ["google_drive", { backendType: "agent_integration_google_drive", label: "Google Drive", alias: "drive" }],
  ["slack", { backendType: "agent_integration_slack", label: "Slack", alias: "slack" }],
  ["notion", { backendType: "agent_integration_notion", label: "Notion", alias: "notion" }],
  ["airtable", { backendType: "agent_integration_airtable", label: "Airtable", alias: "airtable" }],
]);

function uniqueNodeId(nodes, base) {
  const ids = new Set(nodes.map((node) => String(node.id)));
  if (!ids.has(base)) return base;
  let i = 2;
  while (ids.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

function upgradeLinearServicesToAgent(nodes, edges, userText = "") {
  if (!wantsAiAgent(userText)) return { nodes, edges };
  if (nodes.some((node) => node.backendType === "ai_agent")) return { nodes, edges };

  const serviceNodes = nodes.filter((node) => DIRECT_TO_AGENT_INTEGRATION.has(node.backendType));
  if (!serviceNodes.length) return { nodes, edges };

  const trigger = nodes.find((node) => TRIGGER_BT.has(node.backendType || "") && node.backendType !== "manual");
  const triggerNodes = trigger ? [trigger] : [];
  const aiAgentId = uniqueNodeId(nodes, "n_ai_agent");
  const modelId = uniqueNodeId([...nodes, { id: aiAgentId }], "n_model");
  const serviceIds = new Set(serviceNodes.map((node) => node.id));
  const upgradedServices = serviceNodes.map((node) => {
    const meta = DIRECT_TO_AGENT_INTEGRATION.get(node.backendType);
    return {
      ...node,
      backendType: meta.backendType,
      label: meta.label,
      nodeType: "action",
      config: {
        credentialId: "",
        alias: meta.alias,
      },
    };
  });

  const upgradedNodes = [
    ...triggerNodes,
    {
      id: aiAgentId,
      backendType: "ai_agent",
      label: "Signup Thank You Agent",
      nodeType: "action",
      x: AGENT_LAYOUT.hub.x,
      y: AGENT_LAYOUT.hub.y,
      config: {
        systemPrompt: "You are a signup automation agent. When a signup event arrives, read the user's email from the trigger payload, send a warm thank-you email through the Gmail integration, and append the signup email plus timestamp to the Google Sheets integration.",
        userMessage: "New signup payload: {{$json}}",
      },
    },
    {
      id: modelId,
      backendType: "agent_anthropic",
      label: "Claude Model",
      nodeType: "action",
      x: AGENT_LAYOUT.model.x,
      y: AGENT_LAYOUT.model.y,
      config: {
        model: BRIAN_CHEAP_ANTHROPIC_MODEL,
        credentialId: "",
      },
    },
    ...upgradedServices,
  ];

  const upgradedEdges = [
    ...(trigger ? [{
      id: "e_trigger_agent",
      source: trigger.id,
      target: aiAgentId,
    }] : []),
    {
      id: "e_model_agent",
      source: modelId,
      target: aiAgentId,
      targetHandle: "llm",
    },
    ...upgradedServices.map((node) => ({
      id: `e_${node.id}_agent`,
      source: node.id,
      target: aiAgentId,
      targetHandle: "integration",
    })),
  ];

  const passthroughNodes = nodes.filter((node) =>
    !serviceIds.has(node.id) &&
    node.id !== trigger?.id &&
    node.backendType !== "manual"
  );

  return {
    nodes: [...upgradedNodes, ...passthroughNodes],
    edges: upgradedEdges,
  };
}

function isEmptyRequiredValue(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function validateGeneratedNodes(rawNodes, canvasNodes, canvasEdges) {
  const warnings = [];
  const errors = [];
  const rawIdCounts = new Map();

  for (const raw of rawNodes) {
    const id = String(raw?.id || "");
    if (!id) continue;
    rawIdCounts.set(id, (rawIdCounts.get(id) || 0) + 1);
  }

  for (const [id, count] of rawIdCounts) {
    if (count > 1) errors.push(`Duplicate node id generated: ${id}`);
  }

  for (const node of canvasNodes) {
    const bt = node.data?.backendType;
    if (!SUPPORTED_BACKEND_TYPES.has(bt)) {
      errors.push(`Unsupported backendType generated: ${bt}`);
      continue;
    }
    if (String(bt).startsWith("agent_integration_") && !INTEG_BT.has(bt)) {
      errors.push(`Unsupported agent integration generated: ${bt}`);
    }

    const kb = NODE_KB[bt];
    const config = node.data?.config || {};
    for (const field of kb?.fields || []) {
      if (!field.r || CREDENTIAL_KEYS.has(field.k)) continue;
      if (isEmptyRequiredValue(config[field.k])) {
        warnings.push(`Required config "${field.k}" is empty on ${node.id} (${bt})`);
      }
    }
  }

  const nodeIds = new Set(canvasNodes.map((n) => n.id));
  for (const edge of canvasEdges) {
    if (!nodeIds.has(edge.source)) errors.push(`Edge ${edge.id} references missing source node ${edge.source}`);
    if (!nodeIds.has(edge.target)) errors.push(`Edge ${edge.id} references missing target node ${edge.target}`);
  }

  return { warnings, errors };
}

export function toolToCanvas({ nodes = [], edges = [], userText = "" }) {
  if (!nodes.length) return null;
  ({ nodes, edges } = upgradeLinearServicesToAgent(nodes, edges, userText));

  const hasAiAgent = nodes.some((n) => n.backendType === "ai_agent");
  const isTriggerNode = (n) => TRIGGER_BT.has(n.backendType || "") || n.nodeType === "trigger";
  const isManual = (n) => (n.backendType || "manual") === "manual";

  // Keep at most ONE trigger, and prefer a real trigger over a bare `manual`.
  // Without this, an LLM that prepends a `manual` trigger to every flow (against
  // the system prompt) leaves stray manual triggers that pile up on the canvas.
  const realTrigger = nodes.find((n) => isTriggerNode(n) && !isManual(n));
  let triggerKept = false;
  const sanitizedNodes = nodes.filter((n) => {
    if (!isTriggerNode(n)) return true;
    // Drop every manual trigger when a real trigger or an AI agent is present —
    // the agent flow injects its own chat_trigger below.
    if (isManual(n) && (realTrigger || hasAiAgent)) return false;
    // Collapse duplicate triggers down to the first survivor.
    if (triggerKept) return false;
    triggerKept = true;
    return true;
  });

  const hasTriggerAfterSanitize = sanitizedNodes.some((n) => TRIGGER_BT.has(n.backendType || "") || n.nodeType === "trigger");
  if (!hasTriggerAfterSanitize && hasAiAgent) {
    sanitizedNodes.unshift({
      id: "n_trigger",
      backendType: "chat_trigger",
      label: "On Chat Message",
      nodeType: "trigger",
      x: AGENT_LAYOUT.trigger.x,
      y: AGENT_LAYOUT.trigger.y,
      config: {},
    });
  }

  const canvasNodes = sanitizedNodes.map((n, i) => {
    const bt = n.backendType || "manual";
    const isTrig = TRIGGER_BT.has(bt) || n.nodeType === "trigger";
    return {
      id: String(n.id || `n${i + 1}`),
      type: "custom",
      position: { x: Number(n.x) || 400, y: Number(n.y) || (80 + i * 220) },
      data: {
        label: n.label || bt,
        backendType: bt,
        type: isTrig ? "trigger" : "action",
        config: n.config || {},
      },
    };
  });

  const nodeIds = new Set(canvasNodes.map((n) => n.id));
  const validationNotes = { warnings: [], errors: [] };

  let canvasEdges = edges
    .map((e, i) => {
      const raw = {
        id: String(e.id || `e${i + 1}`),
        source: String(e.source || ""),
        target: String(e.target || ""),
        sourceHandle: e.sourceHandle || null,
        targetHandle: canonicalAgentHandle(e.targetHandle || null),
        type: "configurable",
        data: { conditionPath: "" },
        style: {},
      };
      if (raw.targetHandle && AI_AGENT_HANDLES.has(raw.targetHandle)) {
        const srcNode = canvasNodes.find((n) => n.id === raw.source);
        const tgtNode = canvasNodes.find((n) => n.id === raw.target);
        const tgtIsHub = tgtNode && (HUB_TYPES.has(tgtNode.data?.backendType) || raw.targetHandle === "integration");
        if (srcNode?.data?.backendType === "ai_agent" && tgtIsHub) {
          [raw.source, raw.target] = [raw.target, raw.source];
        }
      }
      return raw;
    })
    .filter((e) => {
      if (!e.source || !e.target) return false;
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false;
      const sourceNode = canvasNodes.find((n) => n.id === e.source);
      const targetNode = canvasNodes.find((n) => n.id === e.target);
      if (targetNode?.data?.type === "trigger") {
        validationNotes.warnings.push(`Dropped edge ${e.id}: trigger ${targetNode.id} cannot be a target`);
        return false;
      }
      if (e.targetHandle && AI_AGENT_HANDLES.has(e.targetHandle) && sourceNode?.data?.type === "trigger") {
        validationNotes.warnings.push(`Dropped edge ${e.id}: trigger ${sourceNode.id} cannot target agent slot ${e.targetHandle}`);
        return false;
      }
      return true;
    });

  if (!canvasEdges.length && canvasNodes.length > 1) {
    canvasEdges = canvasNodes.slice(0, -1).map((n, i) => ({
      id: `e${i + 1}`,
      source: n.id,
      target: canvasNodes[i + 1].id,
      sourceHandle: null,
      targetHandle: null,
      type: "configurable",
      data: { conditionPath: "" },
      style: {},
    }));
  }

  const agentHubForLayout = canvasNodes.find((n) => n.data.backendType === "ai_agent");
  if (agentHubForLayout) {
    agentHubForLayout.position = { ...AGENT_LAYOUT.hub };
    const trigNode = canvasNodes.find((n) => n.data.type === "trigger");
    if (trigNode) trigNode.position = { ...AGENT_LAYOUT.trigger };

    canvasNodes.forEach((n) => {
      const bt = n.data.backendType;
      if (MODEL_BT.has(bt)) {
        n.position = { ...AGENT_LAYOUT.model };
        if (bt === "agent_anthropic") {
          const model = String(n.data.config?.model || "");
          if (/cheap|haiku/i.test(model)) n.data.config.model = BRIAN_CHEAP_ANTHROPIC_MODEL;
        }
      }
      else if (MEMORY_BT.has(bt)) n.position = { ...AGENT_LAYOUT.memory };
    });

    const integNodes = canvasNodes.filter(
      (n) =>
        INTEG_BT.has(n.data.backendType) ||
        canvasEdges.some((e) => e.source === n.id && e.targetHandle === "integration"),
    );
    const xArr = integrationXs(integNodes.length);
    integNodes.forEach((n, i) => {
      n.position = { x: xArr[i] ?? 400, y: AGENT_LAYOUT.integrationY };
    });
  }

  const agentHub = canvasNodes.find((n) => n.data.backendType === "ai_agent");
  if (agentHub) {
    const wiredToHub = new Set(
      canvasEdges.filter((e) => e.target === agentHub.id && e.targetHandle).map((e) => e.source),
    );
    canvasNodes.forEach((node) => {
      if (node.id === agentHub.id || wiredToHub.has(node.id)) return;
      const slot = HUB_SLOT.get(node.data.backendType);
      if (!slot) return;
      canvasEdges.push({
        id: `e_aw_${node.id}`,
        source: node.id,
        target: agentHub.id,
        sourceHandle: null,
        targetHandle: slot,
        type: "configurable",
        data: { conditionPath: "" },
        style: {},
      });
    });
  }

  const hubConnectedTargets = new Set(canvasEdges.filter((e) => e.targetHandle).map((e) => e.source));
  const triggerNode = canvasNodes.find((n) => n.data.type === "trigger") || canvasNodes[0];
  if (triggerNode && canvasNodes.length > 1) {
    const reachable = new Set([triggerNode.id]);
    for (const id of hubConnectedTargets) reachable.add(id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of canvasEdges) {
        if (reachable.has(e.source) && !reachable.has(e.target)) {
          reachable.add(e.target);
          changed = true;
        }
      }
    }
    const removed = canvasNodes.filter((n) => !reachable.has(n.id));
    if (removed.length) {
      const keepIds = reachable;
      canvasEdges = canvasEdges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target));
      const lastReachable = [...reachable].filter((id) => !hubConnectedTargets.has(id)).pop() || [...reachable].pop();
      removed.forEach((orphan, oi) => {
        const prevId = oi === 0 ? lastReachable : removed[oi - 1].id;
        canvasEdges.push({
          id: `e_fix_${oi}`,
          source: prevId,
          target: orphan.id,
          sourceHandle: null,
          targetHandle: null,
          type: "configurable",
          data: { conditionPath: "" },
          style: {},
        });
        reachable.add(orphan.id);
      });
    }
  }

  const trigIdx = canvasNodes.findIndex((n) => n.data.type === "trigger");
  if (trigIdx > 0) {
    const [trig] = canvasNodes.splice(trigIdx, 1);
    canvasNodes.unshift(trig);
  }

  const positionsSeen = new Set();
  canvasNodes.forEach((n) => {
    const key = `${n.position.x},${n.position.y}`;
    if (positionsSeen.has(key)) n.position.x += 220;
    positionsSeen.add(`${n.position.x},${n.position.y}`);
  });

  canvasEdges = normalizeSourceHandles(canvasNodes, canvasEdges);
  canvasEdges = dedupeEdges(canvasEdges);

  const validation = validateGeneratedNodes(nodes, canvasNodes, canvasEdges);
  const warnings = [...validationNotes.warnings, ...validation.warnings];
  const flow = { nodes: canvasNodes, edges: canvasEdges };
  if (warnings.length) flow.warnings = warnings;
  if (validation.errors.length) flow.errors = validation.errors;
  return flow;
}

export function normalizeFlow(parsed, userText = "") {
  const src = parsed.flow || parsed.workflow || parsed;
  const nodes = src.nodes || parsed.nodes || [];
  const edges = src.edges || parsed.edges || [];
  if (!nodes.length) return null;

  const toolNodes = nodes.map((n, i) => {
    const bt = n.backendType || n.data?.backendType || n.type || "manual";
    const cleanBt = bt === "custom" ? "manual" : bt;
    const pos = n.position || {};
    return {
      id: String(n.id || `n${i + 1}`),
      backendType: cleanBt,
      label: n.label || n.data?.label || n.name || cleanBt,
      nodeType: TRIGGER_BT.has(cleanBt) || n.data?.type === "trigger" ? "trigger" : "action",
      x: Number(pos.x) || Number(n.x) || 300,
      y: Number(pos.y) || Number(n.y) || 100 + i * 220,
      config: n.config || n.data?.config || {},
    };
  });

  const toolEdges = edges.map((e, i) => ({
    id: String(e.id || `e${i + 1}`),
    source: String(e.source || e.from || ""),
    target: String(e.target || e.to || ""),
    sourceHandle: e.sourceHandle || null,
    targetHandle: e.targetHandle || null,
  })).filter((e) => e.source && e.target);

  return toolToCanvas({ nodes: toolNodes, edges: toolEdges, userText });
}
