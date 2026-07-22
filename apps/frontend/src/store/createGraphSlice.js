import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { playConnect, playDelete } from "../lib/sounds";
import dagre from "dagre";
import { getSuggestions, shouldSuggest } from "../pages/Workspace/nodeSuggestions";
import {
  calculateAllAvailableVariables,
  calculateAvailableVariables,
  inferSchemaFromValue,
  validateAllNodeMappings,
} from "./schemaEngine";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 80;

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

const MAX_HISTORY = 20;

function pushHistory(get) {
  const { nodes, edges, _past } = get();
  const snapshot = { nodes: [...nodes], edges: [...edges] };
  const past = [...(_past ?? []), snapshot].slice(-MAX_HISTORY);
  return { _past: past, _future: [] };
}

export const createGraphSlice = (set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  nodes: [],
  edges: [],
  nodeOutputSchemas: {},
  availableVariables: {},
  mappingWarnings: {},
  _schemaGeneration: 0,
  selectedNodeIds: [],
  _past: [],
  _future: [],

  // ── XYFlow callbacks ─────────────────────────────────────────────────────
  onNodesChange: (changes) => {
    if (changes.some((c) => c.type === "remove")) playDelete();
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

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

    // RULE 2: Reject duplicate edges — same handle only, so a condition's true
    // and false outputs can both rejoin at the same node
    const duplicate = edges.some(
      (e) =>
        e.source === connection.source &&
        e.target === connection.target &&
        (e.sourceHandle || null) === (connection.sourceHandle || null),
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

    playConnect();
    set({
      ...pushHistory(get),
      edges: newEdges,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(nodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
    });

    // Suggest what should come after the target node
    if (targetNode && !targetNode.data?.isSuggestion) {
      const bt = targetNode.data?.backendType;
      const suggestions = getSuggestions(bt);
      const sugg = suggestions?.[0];
      const targetAlreadyHasOutput = newEdges.some(
        e => e.source === connection.target && (e.sourceHandle === 'output' || e.sourceHandle == null),
      );
      if (sugg && shouldSuggest(bt) && !targetAlreadyHasOutput) {
        const sugPos = { x: targetNode.position.x, y: targetNode.position.y + 220 };
        set({
          suggestionNode: {
            id: '__suggestion__',
            type: 'custom',
            position: sugPos,
            selectable: false,
            draggable: false,
            data: {
              label: sugg.label,
              backendType: sugg.type,
              type: 'action',
              config: {},
              isSuggestion: true,
              suggestionSourceId: connection.target,
              suggestionPosition: sugPos,
            },
          },
        });
      }
    }
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

  // ── Selection ─────────────────────────────────────────────────────────────
  onSelectionChange: ({ nodes: selectedNodes }) => {
    set({ selectedNodeIds: selectedNodes.map((n) => n.id) });
  },

  deleteNode: (nodeId) => {
    const { nodes, edges, nodeOutputSchemas } = get();
    const newNodes = nodes.filter((n) => n.id !== nodeId);
    const newEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    const newVars = calculateAllAvailableVariables(newNodes, newEdges, nodeOutputSchemas);
    playDelete();
    set({
      ...pushHistory(get),
      nodes: newNodes,
      edges: newEdges,
      selectedNodeIds: [],
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(newNodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
    });
  },

  duplicateNode: (nodeId) => {
    const { nodes, edges, nodeOutputSchemas } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const clone = {
      ...node,
      id: `${node.data.backendType}-${crypto.randomUUID()}`,
      position: { x: node.position.x + 60, y: node.position.y + 70 },
      data: { ...node.data, config: { ...node.data.config } },
      selected: false,
    };
    const newNodes = [...nodes, clone];
    const newVars = calculateAllAvailableVariables(newNodes, edges, nodeOutputSchemas);
    set({
      ...pushHistory(get),
      nodes: newNodes,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(newNodes, newVars),
      selectedNodeIds: [clone.id],
    });
  },

  deleteSelectedNodes: () => {
    const { nodes, edges, selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;
    const idSet = new Set(selectedNodeIds);
    const newNodes = nodes.filter((n) => !idSet.has(n.id));
    const newEdges = edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target));
    const newVars = calculateAllAvailableVariables(newNodes, newEdges, get().nodeOutputSchemas);
    set({
      ...pushHistory(get),
      nodes: newNodes,
      edges: newEdges,
      selectedNodeIds: [],
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(newNodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
    });
  },

  duplicateSelectedNodes: () => {
    const { nodes, edges, selectedNodeIds, nodeOutputSchemas } = get();
    if (selectedNodeIds.length === 0) return;
    const idSet = new Set(selectedNodeIds);
    const oldToNew = new Map();
    const clones = nodes
      .filter((n) => idSet.has(n.id))
      .map((n) => {
        const newId = `${n.data.backendType}-${crypto.randomUUID()}`;
        oldToNew.set(n.id, newId);
        return {
          ...n,
          id: newId,
          position: { x: n.position.x + 60, y: n.position.y + 70 },
          data: { ...n.data, config: { ...n.data.config } },
          selected: false,
        };
      });
    const clonedEdges = edges
      .filter((e) => idSet.has(e.source) && idSet.has(e.target))
      .map((e) => ({
        ...e,
        id: `e-${crypto.randomUUID()}`,
        source: oldToNew.get(e.source),
        target: oldToNew.get(e.target),
      }));
    const newNodes = [...nodes, ...clones];
    const newEdges = [...edges, ...clonedEdges];
    const newVars = calculateAllAvailableVariables(newNodes, newEdges, nodeOutputSchemas);
    set({
      ...pushHistory(get),
      nodes: newNodes,
      edges: newEdges,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(newNodes, newVars),
      selectedNodeIds: clones.map((c) => c.id),
    });
  },

  alignSelectedNodes: (axis) => {
    const { nodes, selectedNodeIds } = get();
    if (selectedNodeIds.length < 2) return;
    const idSet = new Set(selectedNodeIds);
    const selected = nodes.filter((n) => idSet.has(n.id));
    const anchorPos = axis === "horizontal"
      ? Math.min(...selected.map((n) => n.position.y))
      : Math.min(...selected.map((n) => n.position.x));
    const newNodes = nodes.map((n) => {
      if (!idSet.has(n.id)) return n;
      return {
        ...n,
        position: {
          x: axis === "vertical" ? anchorPos : n.position.x,
          y: axis === "horizontal" ? anchorPos : n.position.y,
        },
      };
    });
    set({ nodes: newNodes });
  },

  undo: () => {
    const { _past, nodes, edges } = get();
    if (!_past || _past.length === 0) return;
    const prev = _past[_past.length - 1];
    const future = [{ nodes: [...nodes], edges: [...edges] }, ...(get()._future ?? [])].slice(0, MAX_HISTORY);
    const newVars = calculateAllAvailableVariables(prev.nodes, prev.edges, get().nodeOutputSchemas);
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      _past: _past.slice(0, -1),
      _future: future,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(prev.nodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
    });
  },

  redo: () => {
    const { _future, nodes, edges } = get();
    if (!_future || _future.length === 0) return;
    const next = _future[0];
    const past = [...(get()._past ?? []), { nodes: [...nodes], edges: [...edges] }].slice(-MAX_HISTORY);
    const newVars = calculateAllAvailableVariables(next.nodes, next.edges, get().nodeOutputSchemas);
    set({
      nodes: next.nodes,
      edges: next.edges,
      _past: past,
      _future: _future.slice(1),
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(next.nodes, newVars),
      _schemaGeneration: get()._schemaGeneration + 1,
    });
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });

    for (const node of nodes) {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const newNodes = nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        },
      };
    });
    set({ nodes: newNodes });
  },

  // ── Mutations ────────────────────────────────────────────────────────────
  addNode: (node) => set({ ...pushHistory(get), nodes: [...get().nodes, node], suggestionNode: null }),

  renameNode: (nodeId, customLabel) => {
    const state = get();
    set({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, customLabel } } }
          : n
      ),
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

  // Apply a remote collaborator's node move without triggering local re-emit.
  applyRemoteNodeMove: (nodeId, position) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n,
      ),
    }));
  },

  // Replace the full graph from a collab:graph_sync event (after a remote save).
  // Skips nodes/edges that are already identical to avoid unnecessary re-renders.
  applyGraphSync: (incomingNodes, incomingEdges) => {
    const state = get();
    const newVars = calculateAllAvailableVariables(incomingNodes, incomingEdges, state.nodeOutputSchemas);
    set({
      nodes: incomingNodes,
      edges: incomingEdges,
      availableVariables: newVars,
      mappingWarnings: validateAllNodeMappings(incomingNodes, newVars),
      _schemaGeneration: state._schemaGeneration + 1,
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
   * Batch-infer and store schemas from a full run's outputs ({ [nodeId]: output }).
   * Turns any node's real JSON into typed variables — no hand-written schema needed.
   */
  recordRunOutputSchemas: (outputs) => {
    const state = get();
    const newSchemas = { ...state.nodeOutputSchemas };
    for (const [nodeId, output] of Object.entries(outputs)) {
      if (output !== undefined) newSchemas[nodeId] = inferSchemaFromValue(output);
    }
    const newVars = calculateAllAvailableVariables(state.nodes, state.edges, newSchemas);
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
