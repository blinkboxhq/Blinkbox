import { WorkflowDefinitionSchema } from "../../../schemas.js";
import type { WorkflowDefinition } from "../../../schemas.js";
import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware: parse and validate req.body against the WorkflowDefinition Zod schema.
 * On failure, responds with 400 + structured Zod issues array.
 */
export function parseWorkflowBody(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const result = WorkflowDefinitionSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      issues: result.error.issues,
    });
    return;
  }

  req.body = result.data;
  next();
}

/**
 * Graph-level validation: reachability from entryNodeId + cycle detection.
 * Called after Zod structural validation (e.g. on activation).
 */
// Agent slot handles — edges with these targetHandles connect sub-nodes that
// never execute themselves. They must be excluded from reachability/cycle checks.
const AGENT_SLOT_HANDLES = new Set(["llm", "chat_model", "memory", "tools", "integration"]);

export function validateAutomation(automation: {
  nodes: ReadonlyArray<{ id: string }>;
  edges: ReadonlyArray<{ source: string; target: string; targetHandle?: string | null }>;
  entryNodeId: string;
}): true {
  const { nodes, edges, entryNodeId } = automation;

  if (!entryNodeId) {
    throw new Error("No entry point configured. Add a trigger node and save first.");
  }

  // ── Build Node Map ────────────────────────────────────────────────────────
  const nodeMap = new Set<string>();
  for (const node of nodes) {
    nodeMap.add(node.id);
  }

  if (!nodeMap.has(entryNodeId)) {
    throw new Error("entryNodeId does not exist in nodes");
  }

  // Agent slot edges (llm/memory/tools) connect sub-nodes that never execute
  // in the normal data-flow graph. Exclude them from all graph checks so that
  // agent_anthropic, agent_memory_* etc. don't appear "unreachable".
  const dataFlowEdges = edges.filter(
    (e) => !e.targetHandle || !AGENT_SLOT_HANDLES.has(e.targetHandle),
  );

  // ── Build Adjacency List ──────────────────────────────────────────────────
  const adjacency = new Map<string, string[]>();
  for (const edge of dataFlowEdges) {
    if (!nodeMap.has(edge.source)) {
      throw new Error(`Edge from unknown node: ${edge.source}`);
    }
    if (!nodeMap.has(edge.target)) {
      throw new Error(`Edge to unknown node: ${edge.target}`);
    }
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }

  // Slot-only nodes are agent sub-nodes (llm/memory/tools): a source of a slot
  // edge but never a source in the data-flow graph. They are intentionally
  // "floating" and must not be treated as trigger roots nor flagged unreachable.
  const slotOnlyNodes = new Set<string>();
  for (const e of edges) {
    if (e.targetHandle && AGENT_SLOT_HANDLES.has(e.targetHandle)) {
      slotOnlyNodes.add(e.source);
    }
  }

  // ── Entry Roots (multi-trigger) ───────────────────────────────────────────
  // Every trigger node is an independent entry point. Beyond the declared
  // entryNodeId, any node with no incoming data-flow edge is a trigger root.
  // Reachability is seeded from ALL of them so a second trigger feeding a
  // shared downstream node is never reported "unreachable".
  const hasIncoming = new Set<string>();
  for (const edge of dataFlowEdges) hasIncoming.add(edge.target);

  const entryRoots = new Set<string>([entryNodeId]);
  for (const nodeId of nodeMap) {
    if (!hasIncoming.has(nodeId) && !slotOnlyNodes.has(nodeId)) {
      entryRoots.add(nodeId);
    }
  }

  // ── Reachability Check ────────────────────────────────────────────────────
  const visited = new Set<string>();
  function dfs(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const next = adjacency.get(nodeId) ?? [];
    for (const n of next) dfs(n);
  }

  for (const root of entryRoots) dfs(root);

  for (const nodeId of nodeMap) {
    if (!visited.has(nodeId) && !slotOnlyNodes.has(nodeId)) {
      throw new Error(`Unreachable node detected: ${nodeId}`);
    }
  }

  // ── Cycle Detection ──────────────────────────────────────────────────────
  const visiting = new Set<string>();
  const fullyVisited = new Set<string>();

  function detectCycle(nodeId: string): void {
    if (visiting.has(nodeId)) {
      throw new Error(`Cycle detected at node: ${nodeId}`);
    }
    if (fullyVisited.has(nodeId)) return;

    visiting.add(nodeId);
    const next = adjacency.get(nodeId) ?? [];
    for (const n of next) detectCycle(n);
    visiting.delete(nodeId);
    fullyVisited.add(nodeId);
  }

  for (const root of entryRoots) detectCycle(root);

  return true;
}
