/**
 * NODE REGISTRY — The Final 7 Bulletproof MVP Nodes
 *
 * + supporting nodes (loop, merge, delay, code, respond_webhook)
 *
 * KILLED:  math, json_parse, send_email (raw SMTP)
 * MERGED:  set_fields + transform + filter → data_mapper
 * UPGRADED: if_condition → logic_router, informer → advanced_scraper
 * NEW:     cron_trigger, ai_agent
 */

// ── Triggers ──────────────────────────────────────────────────────────────────
import cronTrigger from "./cronTrigger.node.js";

// ── Core 7 ────────────────────────────────────────────────────────────────────
import httpRequest from "./httpRequest.node.js";
import informer from "./informer.node.js"; // Advanced Scraper v2
import aiAgent from "./aiAgent.node.js";
import dataMapper from "./dataMapper.node.js";
import logicRouter from "./logicRouter.node.js";

// ── Supporting Nodes ─────────────────────────────────────────────────────────
import code from "./code.node.js";
import delay from "./delay.node.js";
import loop from "./loop.node.js";
import merge from "./merge.node.js";
import respondWebhook from "./respond_webhook.node.js";

export const nodeRegistry = {
  // ── Triggers (genesis nodes) ────────────────────────────────────────────
  manual: {
    async run(config, input) {
      return input;
    },
  },
  webhook: {
    async run(config, input) {
      return input;
    },
  },
  cron_trigger: cronTrigger,

  // ── Core 7 MVP Nodes ───────────────────────────────────────────────────
  http_request: httpRequest,
  advanced_scraper: informer, // Informer v2 with markdown/html/targeted modes
  ai_agent: aiAgent,
  data_mapper: dataMapper, // Consolidates set_fields + transform + filter
  logic_router: logicRouter, // Multi-path routing (replaces if_condition)

  // ── Supporting Nodes ───────────────────────────────────────────────────
  code: code, // Sandboxed JS execution (isolated-vm)
  delay: delay, // Schedule pauses (Redis ZADD)
  loop: loop, // Array iteration
  merge: merge, // DAG convergence
  respond_webhook: respondWebhook,

  // ── Backward Compatibility Aliases ─────────────────────────────────────
  // Old node types map to new implementations so existing automations work.
  informer: informer,
  set_fields: dataMapper,
  transform: dataMapper,
  filter: dataMapper,
  if_condition: logicRouter,
};
