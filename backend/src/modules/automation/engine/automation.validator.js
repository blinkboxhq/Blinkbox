import { nodeRegistry } from "../../nodes/index.js";

export function validateAutomation(automation) {
  if (!automation) throw new Error("Automation not provided");

  const { nodes, edges, entryNodeId } = automation;

  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("Automation must contain at least one node");
  }

  if (!entryNodeId) {
    throw new Error("entryNodeId is required");
  }

  // ---- Build Node Map ----
  const nodeMap = new Map();
  for (const node of nodes) {
    if (!node.id || !node.type) {
      throw new Error("Each node must have id and type");
    }

    if (!nodeRegistry[node.type]) {
      throw new Error(`Unsupported node type: ${node.type}`);
    }

    nodeMap.set(node.id, node);
  }

  if (!nodeMap.has(entryNodeId)) {
    throw new Error("entryNodeId does not exist in nodes");
  }

  // ---- Build Edge Map ----
  const edgeMap = new Map();
  for (const edge of edges || []) {
    if (!edge.from || !edge.to) {
      throw new Error("Each edge must have from and to");
    }

    if (!nodeMap.has(edge.from)) {
      throw new Error(`Edge from unknown node: ${edge.from}`);
    }

    if (!nodeMap.has(edge.to)) {
      throw new Error(`Edge to unknown node: ${edge.to}`);
    }

    if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, []);
    edgeMap.get(edge.from).push(edge.to);
  }

  // ---- Reachability Check ----
  const visited = new Set();
  function dfs(nodeId) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const next = edgeMap.get(nodeId) || [];
    for (const n of next) dfs(n);
  }

  dfs(entryNodeId);

  for (const nodeId of nodeMap.keys()) {
    if (!visited.has(nodeId)) {
      throw new Error(`Unreachable node detected: ${nodeId}`);
    }
  }

  // ---- Cycle Detection ----
  const visiting = new Set();
  const visitedCycle = new Set();

  function detectCycle(nodeId) {
    if (visiting.has(nodeId)) {
      throw new Error(`Cycle detected at node: ${nodeId}`);
    }
    if (visitedCycle.has(nodeId)) return;

    visiting.add(nodeId);
    const next = edgeMap.get(nodeId) || [];
    for (const n of next) detectCycle(n);
    visiting.delete(nodeId);
    visitedCycle.add(nodeId);
  }

  detectCycle(entryNodeId);

  return true; // VALID ✅
}
