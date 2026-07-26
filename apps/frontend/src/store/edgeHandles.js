// Every source dot on a card is an XYFlow handle with an id, and the add-step
// stub next to it clears only when an edge claims that exact id. Graphs the AI
// builder writes (and older saved graphs) carry sourceHandle: null, so the stub
// reads as unconnected and never goes away. The executor treats a null handle as
// the success path, so resolving null to the handle that path corresponds to on
// that node fixes the canvas without changing what runs.
const AGENT_SLOTS = new Set(["llm", "chat_model", "integration", "tools", "memory"]);
const NO_SPLIT = new Set(["condition", "loop", "merge"]);

export function defaultSourceHandle(node, edge) {
  if (edge?.targetHandle && AGENT_SLOTS.has(edge.targetHandle)) return "agent_out";
  const backendType = node?.data?.backendType;
  if (backendType === "condition") return "true";
  if (
    node?.data?.type !== "trigger" &&
    !NO_SPLIT.has(backendType) &&
    node?.data?.config?.splitOutputs
  ) {
    return "success";
  }
  return "output";
}

export function normalizeEdgeHandles(nodes, edges) {
  if (!edges?.length) return edges ?? [];
  const byId = new Map((nodes ?? []).map((n) => [n.id, n]));
  return edges.map((e) =>
    e.sourceHandle ? e : { ...e, sourceHandle: defaultSourceHandle(byId.get(e.source), e) },
  );
}
