// ─────────────────────────────────────────────────────────────────────────────
// Schema Engine — Pure utility functions for AST-style variable inference.
//
// Given a target node, traverses the React Flow edge graph *backwards* to
// collect the output schemas of all upstream nodes. Returns a nested tree
// that UI components can render as autocomplete suggestions.
//
// Performance:
//   - Backward DFS is O(N + E) per node — microseconds for typical DAGs.
//   - Visited-set prevents infinite loops if cycles exist.
//   - Results are memoized in the store; only recomputed on edge/schema change.
// ─────────────────────────────────────────────────────────────────────────────

// ── Default Schemas ─────────────────────────────────────────────────────────
// Known output shapes for built-in node types. Used as fallback when a node
// hasn't been tested yet. Users see *something* useful immediately.

const DEFAULT_SCHEMAS = {
  // Triggers
  manual: { payload: "object" },
  webhook: {
    body: "object",
    query: "object",
    headers: "object",
    method: "string",
  },
  cron_trigger: { scheduledAt: "string", cronExpression: "string" },

  // Core nodes
  http_request: {
    status: "number",
    statusText: "string",
    headers: "object",
    data: "object",
  },
  advanced_scraper: { content: "string", metadata: "object" },
  ai_agent: { response: "string", usage: "object" },
  data_mapper: { _dynamic: true },
  logic_router: { _passthrough: true },

  // Supporting nodes
  code: { result: "object" },
  delay: { delayed: "boolean" },
  loop: { items: "array", index: "number", item: "object" },
  merge: { _passthrough: true },
  respond_webhook: { sent: "boolean" },
};

/**
 * Infer a schema tree from an actual runtime value.
 * Called when the user tests a node — replaces the default schema with real shape.
 *
 * @param {unknown} value — The runtime output of a node
 * @returns {object} — Schema tree (keys → type strings or nested objects)
 */
export function inferSchemaFromValue(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "array";
    // Infer from first element for homogeneous arrays
    return { _type: "array", _items: inferSchemaFromValue(value[0]) };
  }
  if (typeof value === "object") {
    const schema = {};
    for (const [key, val] of Object.entries(value)) {
      schema[key] = inferSchemaFromValue(val);
    }
    return schema;
  }
  return typeof value; // "string", "number", "boolean"
}

/**
 * Get the default or stored schema for a node.
 *
 * @param {object} node — React Flow node
 * @param {Record<string, object>} nodeOutputSchemas — Stored schemas
 * @returns {object|null}
 */
function getNodeSchema(node, nodeOutputSchemas) {
  // Prefer stored schema (from test execution)
  if (nodeOutputSchemas[node.id]) return nodeOutputSchemas[node.id];

  // Fall back to default schema for known types
  const backendType = node.data?.backendType;
  if (backendType && DEFAULT_SCHEMAS[backendType]) {
    return DEFAULT_SCHEMAS[backendType];
  }

  return null;
}

/**
 * Calculate all variables available to a target node by traversing upstream.
 *
 * Walks backwards through edges, collecting output schemas from every ancestor.
 * Returns a nested tree keyed by source node ID:
 *
 *   {
 *     "node-1": { _label: "Webhook Trigger", _type: "webhook", body: { user: { email: "string" } } },
 *     "node-2": { _label: "HTTP Request",    _type: "http_request", status: "number", data: "object" },
 *   }
 *
 * @param {string} targetNodeId
 * @param {Array} nodes — React Flow nodes array
 * @param {Array} edges — React Flow edges array
 * @param {Record<string, object>} nodeOutputSchemas — Per-node stored schemas
 * @returns {Record<string, object>}
 */
export function calculateAvailableVariables(
  targetNodeId,
  nodes,
  edges,
  nodeOutputSchemas,
) {
  const result = {};
  const visited = new Set();

  // Build O(1) lookup maps
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const incomingByTarget = new Map();
  for (const edge of edges) {
    if (!incomingByTarget.has(edge.target)) {
      incomingByTarget.set(edge.target, []);
    }
    incomingByTarget.get(edge.target).push(edge);
  }

  function traverse(nodeId) {
    if (visited.has(nodeId)) return; // cycle guard
    visited.add(nodeId);

    const incoming = incomingByTarget.get(nodeId);
    if (!incoming) return;

    for (const edge of incoming) {
      const sourceId = edge.source;
      const sourceNode = nodeById.get(sourceId);
      if (!sourceNode) continue;

      // Collect this ancestor's schema
      const schema = getNodeSchema(sourceNode, nodeOutputSchemas);
      if (schema) {
        result[sourceId] = {
          _label:
            sourceNode.data?.label ||
            sourceNode.data?.backendType ||
            sourceId,
          _type: sourceNode.data?.backendType || "unknown",
          ...schema,
        };
      }

      // Continue upstream
      traverse(sourceId);
    }
  }

  traverse(targetNodeId);
  return result;
}

/**
 * Recalculate available variables for ALL nodes in the graph.
 * Returns a map: { nodeId → availableVariables }.
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Record<string, object>} nodeOutputSchemas
 * @returns {Record<string, object>}
 */
export function calculateAllAvailableVariables(
  nodes,
  edges,
  nodeOutputSchemas,
) {
  const result = {};
  for (const node of nodes) {
    result[node.id] = calculateAvailableVariables(
      node.id,
      nodes,
      edges,
      nodeOutputSchemas,
    );
  }
  return result;
}
