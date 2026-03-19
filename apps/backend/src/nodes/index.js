/**
 * NODE REGISTRY
 *
 * + supporting nodes (loop, merge, delay, code, respond_webhook)
 *
 * KILLED:  math, json_parse, send_email (raw SMTP)
 * MERGED:  set_fields + transform + filter → data_mapper
 * UPGRADED: if_condition → logic_router, informer → web_scraper
 * NEW:     cron_trigger, ai_agent, integrations hub
 */

// ── Triggers ──────────────────────────────────────────────────────────────────
import cronTrigger from "./cronTrigger.node.js";

// ── Core ──────────────────────────────────────────────────────────────────────
import httpRequest from "./httpRequest.node.js";
import webScraper from "./webScraper.node.js";
import aiAgent from "./aiAgent.node.js";
import dataMapper from "./dataMapper.node.js";
import logicRouter from "./logicRouter.node.js";

// ── Supporting Nodes ─────────────────────────────────────────────────────────
import code from "./code.node.js";
import delay from "./delay.node.js";
import loop from "./loop.node.js";
import merge from "./merge.node.js";
import respondWebhook from "./respond_webhook.node.js";

// ── Integrations: AI Hub ─────────────────────────────────────────────────────
import openai from "./integrations/openai.node.js";
import anthropic from "./integrations/anthropic.node.js";
import gemini from "./integrations/gemini.node.js";
import deepseek from "./integrations/deepseek.node.js";

// ── Integrations: Comms Hub ──────────────────────────────────────────────────
import telegram from "./integrations/telegram.node.js";
import whatsapp from "./integrations/whatsapp.node.js";
import slackReal from "./integrations/slack.node.js";

// ── Integrations: Data Hub ───────────────────────────────────────────────────
import airtable from "./integrations/airtable.node.js";

// ── Integrations: Web Browser ────────────────────────────────────────────────
import webSearch from "./integrations/webSearch.node.js";

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

  // ── Core Nodes ─────────────────────────────────────────────────────────
  http_request: httpRequest,
  web_scraper: webScraper,
  ai_agent: aiAgent,
  data_mapper: dataMapper,
  logic_router: logicRouter,

  // ── Supporting Nodes ───────────────────────────────────────────────────
  code: code,
  delay: delay,
  loop: loop,
  merge: merge,
  respond_webhook: respondWebhook,

  // ── AI Hub ─────────────────────────────────────────────────────────────
  openai: openai,
  anthropic: anthropic,
  gemini: gemini,
  deepseek: deepseek,

  // ── Comms Hub ──────────────────────────────────────────────────────────
  telegram: telegram,
  whatsapp: whatsapp,
  slack: slackReal,
  discord: httpRequest, // still http_request wrapper (webhook-based)
  stripe: httpRequest,  // still http_request wrapper (API-based)

  // ── Data Hub ───────────────────────────────────────────────────────────
  airtable: airtable,

  // ── Web Browser ────────────────────────────────────────────────────────
  web_search: webSearch,

  // ── Backward Compatibility Aliases ─────────────────────────────────────
  // Old node types map to new implementations so existing automations work.
  advanced_scraper: webScraper,
  informer: webScraper,
  set_fields: dataMapper,
  transform: dataMapper,
  filter: dataMapper,
  if_condition: logicRouter,
};
