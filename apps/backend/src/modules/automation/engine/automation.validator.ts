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
export function validateAutomation(automation: {
  nodes: ReadonlyArray<{ id: string }>;
  edges: ReadonlyArray<{ source: string; target: string }>;
  entryNodeId: string;
}): true {
  const { nodes, edges, entryNodeId } = automation;

  // ── Build Node Map ────────────────────────────────────────────────────────
  const nodeMap = new Set<string>();
  for (const node of nodes) {
    nodeMap.add(node.id);
  }

  if (!nodeMap.has(entryNodeId)) {
    throw new Error("entryNodeId does not exist in nodes");
  }

  // ── Build Adjacency List ──────────────────────────────────────────────────
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!nodeMap.has(edge.source)) {
      throw new Error(`Edge from unknown node: ${edge.source}`);
    }
    if (!nodeMap.has(edge.target)) {
      throw new Error(`Edge to unknown node: ${edge.target}`);
    }
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }

  // ── Reachability Check ────────────────────────────────────────────────────
  const visited = new Set<string>();
  function dfs(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const next = adjacency.get(nodeId) ?? [];
    for (const n of next) dfs(n);
  }

  dfs(entryNodeId);

  for (const nodeId of nodeMap) {
    if (!visited.has(nodeId)) {
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

  detectCycle(entryNodeId);

  return true;
}
