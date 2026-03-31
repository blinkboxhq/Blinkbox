import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import {
  calculateAllAvailableVariables,
  calculateAvailableVariables,
  inferSchemaFromValue,
  validateAllNodeMappings,
} from "./schemaEngine";

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
  nodeOutputSchemas: {},
  availableVariables: {},
  mappingWarnings: {},
  _schemaGeneration: 0,

  // ── XYFlow callbacks ─────────────────────────────────────────────────────
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) => {
    const newEdges = applyEdgeChanges(changes, get().edges);
    const state = get();
    const newVars = calculateAllAvailableVariables(
      state.nodes,
      newEdges,
      state.nodeOutputSchemas,
    );
    set({
      edges: newEdges,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(state.nodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
    });
  },

  onConnect: (connection) => {
    const { nodes, edges, nodeOutputSchemas } = get();

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

    const newEdges = addEdge(
      {
        ...connection,
        type: "configurable",
        data: { conditionPath: "" },
        style: {},
      },
      edges,
    );

    const newVars = calculateAllAvailableVariables(
      nodes,
      newEdges,
      nodeOutputSchemas,
    );

    set({
      edges: newEdges,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(nodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
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

  duplicateNode: (nodeId) => {
    const { nodes, edges, nodeOutputSchemas } = get();
    const original = nodes.find((n) => n.id === nodeId);
    if (!original) return;

    const newId = `${original.data.backendType}-${crypto.randomUUID()}`;
    const clone = {
      ...original,
      id: newId,
      position: {
        x: original.position.x + 50,
        y: original.position.y + 60,
      },
      data: {
        ...original.data,
        config: { ...original.data.config },
      },
      selected: false,
    };

    const newNodes = [...nodes, clone];
    const newVars = calculateAllAvailableVariables(newNodes, edges, nodeOutputSchemas);
    set({
      nodes: newNodes,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(newNodes, newVars),
    });
  },

  updateNodeConfig: (nodeId, key, value) => {
    const state = get();
    const newNodes = state.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              config: { ...node.data.config, [key]: value },
            },
          }
        : node,
    );
    set({
      nodes: newNodes,
      mappingWarnings: validateAllNodeMappings(newNodes, state.availableVariables),
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
  setGraph: (nodes, edges) => {
    const state = get();
    const newVars = calculateAllAvailableVariables(
      nodes,
      edges,
      state.nodeOutputSchemas,
    );
    set({
      nodes,
      edges,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(nodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
    });
  },

  // ── Schema / Variable Inference ───────────────────────────────────────────

  /**
   * Store the output schema for a node (called when a node is tested).
   * Accepts either a raw schema object or a runtime value to infer from.
   *
   * @param {string} nodeId
   * @param {object} outputOrSchema — The node's test output (runtime value)
   */
  setNodeOutputSchema: (nodeId, outputOrSchema) => {
    const schema = inferSchemaFromValue(outputOrSchema);
    const state = get();
    const newSchemas = { ...state.nodeOutputSchemas, [nodeId]: schema };
    const newVars = calculateAllAvailableVariables(
      state.nodes,
      state.edges,
      newSchemas,
    );
    set({
      nodeOutputSchemas: newSchemas,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(state.nodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
    });
  },

  /**
   * Get available variables for a specific node.
   * Returns the pre-computed result from the memoized store — O(1).
   *
   * @param {string} nodeId
   * @returns {Record<string, object>}
   */
  getAvailableVariables: (nodeId) => {
    return get().availableVariables[nodeId] || {};
  },

  getMappingWarnings: (nodeId) => {
    return get().mappingWarnings[nodeId] || { hasMappingWarning: false, warnings: [] };
  },
});
