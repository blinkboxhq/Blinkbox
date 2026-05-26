export function brianEdgeKey(edge) {
  return [
    edge.source,
    edge.target,
    edge.sourceHandle || "",
    edge.targetHandle || "",
  ].join("|");
}

const MODEL_BT = new Set(["agent_anthropic", "agent_openai", "agent_gemini", "agent_groq"]);
const MEMORY_BT = new Set(["agent_memory_supabase", "agent_memory_pinecone", "agent_memory_postgres", "agent_memory_redis"]);
const TOOL_BT = new Set(["agent_tool"]);
const INTEG_PREFIX = "agent_integration_";
const HUB_HANDLES = new Set(["llm", "chat_model", "memory", "integration", "tools"]);
const LAYOUT = {
  trigger: { x: 80, y: 300 },
  hub: { x: 400, y: 300 },
  model: { x: 260, y: 560 },
  memory: { x: 540, y: 560 },
  integrationY: 780,
  integrationGap: 220,
};

function backendType(node) {
  return node?.data?.backendType || node?.backendType || "";
}

function isTrigger(node) {
  const bt = backendType(node);
  return node?.data?.type === "trigger" || node?.nodeType === "trigger" || bt === "manual" || bt.endsWith("_trigger");
}

function slotFor(node) {
  const bt = backendType(node);
  if (MODEL_BT.has(bt)) return "llm";
  if (MEMORY_BT.has(bt)) return "memory";
  if (bt.startsWith(INTEG_PREFIX)) return "integration";
  if (TOOL_BT.has(bt)) return "tools";
  return null;
}

function integrationXs(count) {
  const gap = LAYOUT.integrationGap;
  const start = LAYOUT.hub.x - ((count - 1) * gap) / 2;
  return Array.from({ length: count }, (_, i) => Math.round(start + i * gap));
}

function visualRepairBrianFlow(flow = {}) {
  const nodes = (flow.nodes || []).map((node) => ({
    ...node,
    position: { ...(node.position || { x: 0, y: 0 }) },
    data: { ...(node.data || {}), config: { ...(node.data?.config || {}) } },
  }));
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const agent = nodes.find((node) => backendType(node) === "ai_agent");

  let edges = (flow.edges || [])
    .map((edge, i) => ({
      id: edge.id || `e_brian_${i + 1}`,
      source: String(edge.source || ""),
      target: String(edge.target || ""),
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle === "chat_model" ? "llm" : edge.targetHandle || null,
      type: edge.type || "configurable",
      data: { conditionPath: "", ...(edge.data || {}) },
      style: edge.style || {},
    }))
    .filter((edge) => edge.source && edge.target && nodeMap.has(edge.source) && nodeMap.has(edge.target))
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (backendType(source) === "ai_agent" && slotFor(target)) {
        return {
          ...edge,
          source: edge.target,
          target: edge.source,
          sourceHandle: "agent_out",
          targetHandle: slotFor(target),
        };
      }
      if (agent && edge.target === agent.id && slotFor(source)) {
        return {
          ...edge,
          sourceHandle: "agent_out",
          targetHandle: slotFor(source),
        };
      }
      return edge;
    })
    .filter((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (isTrigger(target)) return false;
      if (isTrigger(source) && HUB_HANDLES.has(edge.targetHandle)) return false;
      return true;
    });

  if (agent) {
    agent.position = { ...LAYOUT.hub };
    const trigger = nodes.find(isTrigger);
    if (trigger) trigger.position = { ...LAYOUT.trigger };

    nodes.forEach((node) => {
      const bt = backendType(node);
      if (MODEL_BT.has(bt)) node.position = { ...LAYOUT.model };
      if (MEMORY_BT.has(bt)) node.position = { ...LAYOUT.memory };
    });

    const integrations = nodes.filter((node) => backendType(node).startsWith(INTEG_PREFIX));
    const xs = integrationXs(integrations.length);
    integrations.forEach((node, i) => {
      node.position = { x: xs[i], y: LAYOUT.integrationY };
    });

    const wired = new Set(edges.filter((edge) => edge.target === agent.id && edge.targetHandle).map((edge) => edge.source));
    nodes.forEach((node) => {
      if (node.id === agent.id || wired.has(node.id)) return;
      const slot = slotFor(node);
      if (!slot) return;
      edges.push({
        id: `e_brian_slot_${node.id}`,
        source: node.id,
        target: agent.id,
        sourceHandle: "agent_out",
        targetHandle: slot,
        type: "configurable",
        data: { conditionPath: "" },
        style: {},
      });
    });
  }

  const seenIds = new Set();
  const seenStrict = new Set();
  edges = edges.filter((edge) => {
    const strict = brianEdgeKey(edge);
    if (edge.id && seenIds.has(edge.id)) return false;
    if (seenStrict.has(strict)) return false;
    if (edge.id) seenIds.add(edge.id);
    seenStrict.add(strict);
    return true;
  });

  return { ...flow, nodes, edges };
}

export function mergeBrianFlow(existingNodes = [], existingEdges = [], flow = {}) {
  const repairedFlow = visualRepairBrianFlow(flow);
  const nodeMap = new Map(existingNodes.map((node) => [node.id, node]));
  for (const incoming of repairedFlow.nodes || []) {
    const existing = nodeMap.get(incoming.id);
    nodeMap.set(incoming.id, existing ? {
      ...existing,
      ...incoming,
      position: incoming.position || existing.position,
      data: {
        ...(existing.data || {}),
        ...(incoming.data || {}),
        config: {
          ...(existing.data?.config || {}),
          ...(incoming.data?.config || {}),
        },
      },
    } : incoming);
  }

  const edgeMap = new Map();
  const idMap = new Map();
  for (const edge of existingEdges || []) {
    edgeMap.set(brianEdgeKey(edge), edge);
    if (edge.id) idMap.set(edge.id, brianEdgeKey(edge));
  }
  for (const edge of repairedFlow.edges || []) {
    const key = brianEdgeKey(edge);
    const oldKey = edge.id ? idMap.get(edge.id) : null;
    if (oldKey) edgeMap.delete(oldKey);
    edgeMap.set(key, edge);
    if (edge.id) idMap.set(edge.id, key);
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

export { visualRepairBrianFlow };
