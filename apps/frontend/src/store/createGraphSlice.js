import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";

// ─────────────────────────────────────────────────────────────────────────────
// Graph Slice — owns nodes, edges, and all XYFlow mutation logic.
// Isolated from execution and UI state so canvas re-renders are surgical.
// ─────────────────────────────────────────────────────────────────────────────

// DFS cycle detection: returns true if adding source→target creates a cycle.
function wouldCreateCycle(edges, source, target) {
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source).push(e.target);
  }
  // Add the proposed edge
  if (!adj.has(source)) adj.set(source, []);
  adj.get(source).push(target);

  // DFS from target — if we can reach source, it's a cycle
  const visited = new Set();
  const stack = [target];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === source) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    const neighbors = adj.get(node) || [];
    for (const n of neighbors) stack.push(n);
  }
  return false;
}

export const createGraphSlice = (set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  nodes: [],
  edges: [],

  // ── XYFlow callbacks ─────────────────────────────────────────────────────
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) => {
    const { nodes, edges } = get();

    // RULE 1: Reject connections targeting a trigger node
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (targetNode?.data?.type === "trigger") return;

    // RULE 2: Reject duplicate edges
    const duplicate = edges.some(
      (e) => e.source === connection.source && e.target === connection.target,
    );
    if (duplicate) return;

    // RULE 3: DFS cycle detection
    if (wouldCreateCycle(edges, connection.source, connection.target)) return;

    set({
      edges: addEdge(
        {
          ...connection,
          type: "configurable",
          data: { conditionPath: "" },
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        },
        edges,
      ),
    });
  },

  // isValidConnection — passed to ReactFlow for real-time handle feedback
  isValidConnection: (connection) => {
    const { nodes, edges } = get();
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (targetNode?.data?.type === "trigger") return false;
    if (connection.source === connection.target) return false;
    const duplicate = edges.some(
      (e) => e.source === connection.source && e.target === connection.target,
    );
    if (duplicate) return false;
    return !wouldCreateCycle(edges, connection.source, connection.target);
  },

  // ── Mutations ────────────────────────────────────────────────────────────
  addNode: (node) => set({ nodes: [...get().nodes, node] }),

  updateNodeConfig: (nodeId, key, value) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: { ...node.data.config, [key]: value },
              },
            }
          : node,
      ),
    });
  },

  // Update edge condition path (used by ConfigurableEdge)
  updateEdgeCondition: (edgeId, conditionPath) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, conditionPath } }
          : e,
      ),
    });
  },

  // Bulk-set nodes + edges (used by loadEngine)
  setGraph: (nodes, edges) => set({ nodes, edges }),
});
