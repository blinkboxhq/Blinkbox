export function brianEdgeKey(edge) {
  return edge.id || [
    edge.source,
    edge.target,
    edge.sourceHandle || "",
    edge.targetHandle || "",
  ].join("|");
}

export function mergeBrianFlow(existingNodes = [], existingEdges = [], flow = {}) {
  const nodeMap = new Map(existingNodes.map((node) => [node.id, node]));
  for (const incoming of flow.nodes || []) {
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
  for (const edge of existingEdges || []) edgeMap.set(brianEdgeKey(edge), edge);
  for (const edge of flow.edges || []) edgeMap.set(brianEdgeKey(edge), edge);

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}
