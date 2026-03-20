/**
 * Credit Engine — Fastlane Economics
 *
 * Weighted credit costs per node type. Checked BEFORE each node runs
 * in cursor.executor.js. If the workspace is over limit, the execution
 * is blocked and a quota_exceeded event is emitted.
 *
 * Cost tiers:
 *   Standard (1 credit): triggers, data mapper, logic router, delay, merge, loop, code
 *   Medium (5 credits):  HTTP request, respond webhook
 *   Heavy (10 credits):  AI Agent
 *   Extreme (15 credits): Advanced Scraper (Puppeteer)
 */

import WorkspaceUsage from "../models/workspaceUsage.model.js";

// ── Weighted Cost Map ─────────────────────────────────────────────────────────
const NODE_COSTS = {
  // Triggers (free — they just pass data)
  manual:           0,
  webhook:          0,
  cron_trigger:     0,

  // Standard (1 credit)
  data_mapper:      1,
  logic_router:     1,
  delay:            1,
  merge:            1,
  loop:             1,
  code:             1,
  respond_webhook:  1,

  // Medium (5 credits)
  http_request:     5,

  // Heavy (10 credits)
  ai_agent:         10,

  // Extreme (15 credits)
  advanced_scraper: 15,
  web_scraper:      15,

  // AI Hub (10 credits — external LLM calls)
  openai:           10,
  anthropic:        10,
  gemini:           10,
  deepseek:         10,

  // Comms Hub (3 credits — lightweight API calls)
  telegram:         3,
  whatsapp:         3,
  slack:            3,
  discord:          5,
  stripe:           5,

  // Data Hub (5 credits — external SaaS CRUD)
  airtable:         5,

  // Web Browser (8 credits — search API calls)
  web_search:       8,

  // Backward compat aliases
  set_fields:       1,
  transform:        1,
  filter:           1,
  if_condition:     1,
  informer:         15,
};

/**
 * Get the credit cost for a node type.
 * Returns 1 for unknown types (safe default).
 */
export function getNodeCost(nodeType) {
  return NODE_COSTS[nodeType] ?? 1;
}

/**
 * Check if a workspace has enough credits for a node execution.
 * Does NOT deduct — call deductCredits() after successful execution.
 *
 * @returns {{ allowed: boolean, remaining: number, cost: number }}
 */
export async function checkCredits(workspaceId, nodeType) {
  const cost = getNodeCost(nodeType);

  // Free nodes always pass
  if (cost === 0) return { allowed: true, remaining: Infinity, cost: 0 };

  const usage = await WorkspaceUsage.getOrCreate(workspaceId);
  const remaining = usage.monthlyLimit - usage.creditsUsed;

  return {
    allowed: remaining >= cost,
    remaining,
    cost,
    plan: usage.plan,
    creditsUsed: usage.creditsUsed,
    monthlyLimit: usage.monthlyLimit,
  };
}

/**
 * Deduct credits after a successful node execution.
 * Uses atomic $inc to prevent race conditions.
 * Caps history at 100 entries with $slice.
 *
 * @returns {{ creditsUsed: number, remaining: number }}
 */
export async function deductCredits(workspaceId, { executionId, nodeId, nodeType }) {
  const cost = getNodeCost(nodeType);
  if (cost === 0) return { creditsUsed: 0, remaining: Infinity };

  const result = await WorkspaceUsage.findOneAndUpdate(
    { workspaceId },
    {
      $inc: { creditsUsed: cost },
      $push: {
        history: {
          $each: [{
            executionId: executionId.toString(),
            nodeId,
            nodeType,
            credits: cost,
            at: new Date(),
          }],
          $slice: -100, // Keep last 100 entries
        },
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  return {
    creditsUsed: result.creditsUsed,
    remaining: result.monthlyLimit - result.creditsUsed,
  };
}
