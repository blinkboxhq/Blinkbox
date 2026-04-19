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

export const DEFAULT_SCHEMAS = {
  // Triggers
  manual: { payload: "object" },
  webhook: {
    body: "object",
    query: "object",
    headers: "object",
    method: "string",
  },
  cron_trigger: { scheduledAt: "string", cronExpression: "string" },
  imap_trigger: { subject: "string", from: "string", to: "string", body: "string", date: "string", messageId: "string", attachments: "array" },
  rss_trigger: { title: "string", link: "string", pubDate: "string", content: "string", guid: "string", author: "string", feedUrl: "string" },
  db_trigger: { row: "object", table: "string", operation: "string", timestamp: "string" },
  telegram_trigger: {
    text: "string",
    from: { id: "number", first_name: "string", last_name: "string", username: "string", is_bot: "boolean" },
    chat: { id: "number", type: "string", first_name: "string", last_name: "string", username: "string" },
    date: "number",
    messageId: "number",
    updateId: "number",
  },
  slack_trigger: {
    text: "string",
    user: "string",
    channel: "string",
    ts: "string",
    teamId: "string",
    event: { type: "string", user: "string", text: "string", channel: "string", ts: "string" },
  },
  discord_trigger: {
    content: "string",
    channel_id: "string",
    guild_id: "string",
    author: { id: "string", username: "string", discriminator: "string" },
    message: { id: "string", content: "string", timestamp: "string" },
  },
  whatsapp_trigger: {
    text: "string",
    from: "string",
    phoneNumberId: "string",
    message: { id: "string", type: "string", timestamp: "string" },
    contacts: "array",
  },
  gmail_trigger: {
    subject: "string",
    from: "string",
    to: "string",
    body: "string",
    snippet: "string",
    threadId: "string",
    messageId: "string",
    attachments: "array",
  },
  airtable_trigger: {
    id: "string",
    createdTime: "string",
    tableId: "string",
    fields: "object",
    record: { id: "string", createdTime: "string", fields: "object" },
  },
  notion_trigger: {
    id: "string",
    url: "string",
    lastEditedTime: "string",
    properties: "object",
    page: { id: "string", url: "string", created_time: "string", last_edited_time: "string" },
  },
  hubspot_trigger: {
    objectId: "string",
    objectType: "string",
    changeSource: "string",
    portalId: "string",
    event: { eventId: "string", subscriptionType: "string", objectId: "string" },
  },
  shopify_trigger: {
    id: "string",
    email: "string",
    total_price: "string",
    financial_status: "string",
    fulfillment_status: "string",
    line_items: "array",
    customer: { id: "string", email: "string", first_name: "string", last_name: "string" },
  },
  linear_trigger: {
    id: "string",
    title: "string",
    priority: "number",
    state: { id: "string", name: "string", type: "string" },
    assignee: { id: "string", name: "string", email: "string" },
    team: { id: "string", name: "string", key: "string" },
  },
  typeform_trigger: {
    form_id: "string",
    token: "string",
    submitted_at: "string",
    answers: "array",
    form_response: { form_id: "string", token: "string", submitted_at: "string" },
  },

  // Core nodes
  http_request: {
    status: "number",
    statusText: "string",
    headers: "object",
    data: "object",
  },
  web_scraper: { content: "string", metadata: "object" },
  ai_agent: {
    result: "string",
    model: "string",
    tokensUsed: "number",
    provider: "string",
    agentType: "string",
    iterations: "number",
    intermediateSteps: "array",
  },
  data_mapper: { _dynamic: true },
  logic_router: { _passthrough: true },

  // Supporting nodes
  code: { result: "object" },
  delay: { delayed: "boolean" },
  loop: { items: "array", index: "number", item: "object" },
  merge: { _passthrough: true },
  slack: { ok: "boolean", ts: "string", channel: "string", message: "object" },
  discord: { ok: "boolean", webhookId: "string" },
  // AI Hub
  openai: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  anthropic: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  gemini: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  perplexity: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  xai: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  deepseek: { result: "string", model: "string", tokensUsed: "number", provider: "string" },

  // Comms Hub
  telegram: { ok: "boolean", messageId: "number", chat: "object", pollId: "string", deleted: "boolean", pinned: "boolean" },
  whatsapp: { messageId: "string", contacts: "array", messages: "array", ok: "boolean", status: "string" },
  slack: { ok: "boolean", ts: "string", channel: "string", messageId: "string", fileId: "string", userId: "string", channelId: "string" },
  discord: { ok: "boolean", webhookId: "string", filename: "string" },

  // Data Hub
  airtable: { id: "string", fields: "object", createdTime: "string", records: "array", totalRecords: "number", deleted: "boolean", created: "number", updated: "number" },
  google_sheets: { values: "array", rowCount: "number", range: "string", updatedRange: "string", updatedRows: "number", updatedCells: "number", clearedRange: "string", title: "string", sheets: "array" },
  notion: { pageId: "string", url: "string", title: "string", properties: "object", results: "array", hasMore: "boolean", nextCursor: "string", appended: "number", blockIds: "array", created: "boolean", updated: "boolean" },

  // Email & Messaging
  gmail: { messageId: "string", threadId: "string", from: "string", to: "string", subject: "string", body: "string", snippet: "string", messages: "array", draftId: "string", marked: "string", trashed: "boolean" },
  twilio: { messageSid: "string", status: "string", to: "string", from: "string", body: "string", price: "string", callSid: "string", direction: "string", phoneNumber: "string", carrier: "object" },
  sendgrid: { sent: "boolean", messageId: "string", statusCode: "number", recipientCount: "number", jobId: "string", added: "boolean" },

  // Web Browser
  web_search: { answer: "string", results: "array", query: "string", responseTime: "number" },

  // New Triggers
  youtube_trigger: { videoId: "string", title: "string", description: "string", publishedAt: "string", channelId: "string", channelTitle: "string", thumbnailUrl: "string", url: "string" },
  price_alert_trigger: { coinId: "string", currentPrice: "number", priceChange24h: "number", priceChangePercent24h: "number", marketCap: "number", currency: "string", condition: "string", threshold: "number", triggeredAt: "string" },
  reddit_trigger: { id: "string", title: "string", selftext: "string", url: "string", score: "number", numComments: "number", author: "string", subreddit: "string", created: "string", permalink: "string", isNSFW: "boolean", flair: "string" },
  google_calendar_trigger: { eventId: "string", title: "string", description: "string", startTime: "string", endTime: "string", location: "string", attendees: "array", organizer: "string", meetLink: "string", status: "string", htmlLink: "string" },
  github_issue_trigger: { id: "number", number: "number", title: "string", body: "string", state: "string", url: "string", author: "string", labels: "array", createdAt: "string", type: "string" },

  // New Utility Nodes
  qr_code: { dataUrl: "string", content: "string", size: "number", format: "string" },
  text_splitter: { chunks: "array", chunkCount: "number", totalLength: "number" },
  template_renderer: { rendered: "string", templateLength: "number", outputLength: "number" },
  json_validator: { valid: "boolean", data: "object", errors: "array", errorCount: "number" },
  switch: { value: "string", matchedCase: "string", isDefault: "boolean" },
  image_resize: { dataUrl: "string", format: "string", width: "number", height: "number", sizeBytes: "number" },
  aggregate: { items: "array", count: "number", sessionId: "string", completedAt: "string" },
  pdf_generator: { pdf: "string", filename: "string", sizeBytes: "number", mimeType: "string" },

  // New Integrations
  elevenlabs: { audioBase64: "string", mimeType: "string", voiceId: "string", model: "string", characterCount: "number" },
  pinecone: { matches: "array", upsertedCount: "number", namespace: "string" },
  zoom: { meetingId: "string", topic: "string", joinUrl: "string", startUrl: "string", password: "string", startTime: "string", duration: "number" },
  resend: { id: "string", from: "string", to: "array", subject: "string", createdAt: "string", status: "string" },
  openai_assistant: { threadId: "string", runId: "string", lastMessage: "string", messages: "array", status: "string", usage: "object" },
  virtual_computer: { stdout: "string", stderr: "string", exitCode: "number", language: "string", executionTimeMs: "number", timedOut: "boolean" },
  claude_code:    { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  codex:          { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  gemini_cli:     { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  groq:           { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  ollama:         { result: "string", code: "string", model: "string", operation: "string", provider: "string" },
  github_copilot: { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
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

// ── Expected Input Schemas ────────────────────────────────────────────────
// Declares what each config field expects as its input type.
// Used by validateNodeMapping to flag type mismatches.

const EXPECTED_INPUT_TYPES = {
  http_request: { body: "object", headers: "object", url: "string" },
  data_mapper: { mappings: "object" },
  code: { input: "object" },
  ai_agent: { prompt: "string", systemPrompt: "string" },
  logic_router: { conditions: "array" },
};

/**
 * Extract `{{nodeId.path.to.field}}` expressions from a config value.
 * Returns an array of { raw, nodeId, path[] }.
 */
function extractExpressions(value) {
  if (typeof value !== "string") return [];
  const matches = [...value.matchAll(/\{\{([^}]+)\}\}/g)];
  return matches.map((m) => {
    const parts = m[1].trim().split(".");
    return { raw: m[0], nodeId: parts[0], path: parts.slice(1) };
  });
}

/**
 * Resolve a dot-path against a schema tree to get the terminal type.
 * Returns the type string ("string", "number", "object", etc.) or null.
 */
function resolveType(schema, path) {
  let current = schema;
  for (const key of path) {
    if (current === null || current === undefined) return null;
    if (typeof current === "string") return null; // leaf type, can't descend
    if (current._type === "array" && key === "*") {
      current = current._items;
      continue;
    }
    current = current[key];
  }
  if (current === null || current === undefined) return null;
  if (typeof current === "string") return current; // "string", "number", etc.
  if (typeof current === "object" && current._type) return current._type;
  if (typeof current === "object") return "object";
  return null;
}

/**
 * Validate that a node's config mappings match the types of upstream schemas.
 *
 * @param {string} nodeId
 * @param {Record<string, object>} availableVars — upstream variables for this node
 * @param {object} nodeConfig — the node's config object
 * @param {string} backendType — the node's backend type
 * @returns {{ hasMappingWarning: boolean, warnings: string[] }}
 */
export function validateNodeMapping(nodeId, availableVars, nodeConfig, backendType) {
  const warnings = [];
  const expected = EXPECTED_INPUT_TYPES[backendType];
  if (!expected || !nodeConfig) return { hasMappingWarning: false, warnings };

  for (const [configKey, configValue] of Object.entries(nodeConfig)) {
    const expectedType = expected[configKey];
    if (!expectedType) continue;

    const expressions = extractExpressions(
      typeof configValue === "string" ? configValue : JSON.stringify(configValue),
    );

    for (const expr of expressions) {
      const sourceSchema = availableVars[expr.nodeId];
      if (!sourceSchema) continue;

      const sourceType = resolveType(sourceSchema, expr.path);
      if (!sourceType) continue;

      // Flag mismatch: mapping a scalar into a compound type or vice versa
      const isScalar = (t) => ["string", "number", "boolean", "null"].includes(t);
      const isCompound = (t) => ["object", "array"].includes(t);

      if (isScalar(sourceType) && isCompound(expectedType)) {
        warnings.push(
          `Type mismatch: You mapped a ${sourceType} (${expr.raw}) into "${configKey}" which expects ${expectedType}.`,
        );
      } else if (isCompound(sourceType) && isScalar(expectedType)) {
        warnings.push(
          `Type mismatch: You mapped an ${sourceType} (${expr.raw}) into "${configKey}" which expects ${expectedType}.`,
        );
      }
    }
  }

  return { hasMappingWarning: warnings.length > 0, warnings };
}

/**
 * Validate mappings for ALL nodes in the graph.
 *
 * @param {Array} nodes
 * @param {Record<string, object>} allAvailableVariables
 * @returns {Record<string, { hasMappingWarning: boolean, warnings: string[] }>}
 */
export function validateAllNodeMappings(nodes, allAvailableVariables) {
  const result = {};
  for (const node of nodes) {
    result[node.id] = validateNodeMapping(
      node.id,
      allAvailableVariables[node.id] || {},
      node.data?.config || {},
      node.data?.backendType,
    );
  }
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
