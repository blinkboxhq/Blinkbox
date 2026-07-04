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
// Cost tiers:
//   0:  Triggers — passive, receive data only
//   1:  Pure data ops — no external calls
//   3:  Lightweight external APIs (comms, simple lookups)
//   5:  Standard SaaS integrations (CRM, project mgmt, data)
//   8:  Search & enrichment APIs
//   10: LLM / AI inference calls
//   15: Browser automation & heavy compute

const NODE_COSTS = {
  // ── Triggers (0 — passive pass-through) ───────────────────────────────────
  manual: 0, webhook: 0, cron_trigger: 0, cron: 0,
  chat_trigger: 0, form_trigger: 0, error_trigger: 0,
  rss_trigger: 0, imap_trigger: 0, db_trigger: 0,
  github_trigger: 0, stripe_trigger: 0,
  telegram_trigger: 0, slack_trigger: 0, discord_trigger: 0,
  shopify_trigger: 0, linear_trigger: 0, typeform_trigger: 0,
  whatsapp_trigger: 0, gmail_trigger: 0, airtable_trigger: 0,
  notion_trigger: 0, hubspot_trigger: 0,
  youtube_trigger: 0, price_alert_trigger: 0, reddit_trigger: 0,
  google_calendar_trigger: 0, github_issue_trigger: 0,
  ssh_trigger: 0, docker_trigger: 0, jira_trigger: 0,
  trello_trigger: 0, google_sheets_trigger: 0, outlook_trigger: 0,
  teams_trigger: 0, http_monitor_trigger: 0, gitlab_trigger: 0,
  ssl_trigger: 0, dns_trigger: 0, port_monitor_trigger: 0,
  hackernews_trigger: 0, pipedrive_trigger: 0, asana_trigger: 0,
  google_drive_trigger: 0, google_docs_trigger: 0,
  google_forms_trigger: 0, onedrive_trigger: 0, sharepoint_trigger: 0,
  azure_devops_trigger: 0, sentry_trigger: 0, vercel_trigger: 0,
  netlify_trigger: 0, pagerduty_trigger: 0, datadog_trigger: 0,
  zendesk_trigger: 0, calendly_trigger: 0, mailchimp_trigger: 0,
  clickup_trigger: 0, monday_trigger: 0, figma_trigger: 0,
  instagram_trigger: 0, tiktok_trigger: 0, mastodon_trigger: 0,
  producthunt_trigger: 0, intercom_trigger: 0, woocommerce_trigger: 0,
  virustotal_trigger: 0,

  // ── Pure data ops (1 — no external calls) ─────────────────────────────────
  data_mapper: 1, logic_router: 1, condition: 1, success_failed: 1,
  switch: 1, stop_error: 1, retry: 1, rate_limiter: 1,
  delay: 1, merge: 1, loop: 1, code: 1, respond_webhook: 1,
  sub_workflow: 1, wait_for_event: 1, approval: 1,
  filter_array: 1, sort_array: 1, deduplicate: 1, batch_split: 1,
  csv_parser: 1, date_time: 1, crypto_utils: 1,
  text_splitter: 1, template_renderer: 1, json_validator: 1,
  aggregate: 1, data_diff: 1, url_parser: 1,
  base64: 1, color_converter: 1, unit_converter: 1, number_format: 1,
  find_replace: 1, regex_match: 1, math_expression: 1,
  markdown_renderer: 1, text_format: 1, random_pick: 1, counter: 1,
  variable_set_get: 1, schedule_check: 1, env_variable: 1, error: 1,
  zip_files: 1, price_alert: 1, tool_think: 1,
  // backward compat
  set_fields: 1, transform: 1, filter: 1, if_condition: 1,

  // ── Compute-light (2 — simple single external calls) ──────────────────────
  rss: 2, rss_feed_generator: 2, weather: 2,
  ip_lookup: 2, ip_whitelist: 2,
  hackernews: 2, producthunt: 2,
  stock_price: 2, currency_exchange: 2, twitch_stream_status: 2,
  clinical_trials: 2, drug_lookup: 2,

  // ── Comms Hub (3 — messaging API calls) ───────────────────────────────────
  telegram: 3, whatsapp: 3, slack: 3, discord: 3,
  discord_role_assign: 3, mastodon: 3,
  email: 3, imap: 3, webhook_response: 3, game_event_webhook: 3,
  chat: 3,

  // ── Medium (5 — standard SaaS CRUD) ───────────────────────────────────────
  http_request: 5, graphql_request: 5,
  // Data / productivity
  airtable: 5, google_sheets: 5, notion: 5,
  google_calendar: 5, google_drive: 5, google_docs: 5, google_forms: 5,
  sharepoint: 5, onedrive: 5, outlook: 5, teams: 5,
  // CRM / project mgmt
  hubspot: 5, jira: 5, trello: 5, asana: 5, clickup: 5,
  monday: 5, linear: 5, github: 5, gitlab: 5, github_issue: 5,
  pipedrive: 5, intercom: 5, zendesk: 5,
  // Payments / e-commerce
  stripe: 5, shopify: 5, woocommerce: 5,
  // Email marketing
  mailchimp: 5, sendgrid: 5, resend: 5, twilio: 5,
  // Social / media
  youtube: 5, linkedin: 5, tiktok: 5, instagram: 5, reddit: 5,
  // Infra / DevOps
  docker: 5, ssh: 5, s3: 5, sftp: 5, firebase: 5,
  datadog: 5, sentry: 5, pagerduty: 5, netlify: 5, vercel: 5,
  azure_devops: 5, virustotal: 5,
  // SaaS misc
  zoom: 5, calendly: 5, typeform: 5, figma: 5, figma_comment: 5,
  // Databases (simple queries)
  postgres: 5, mongodb: 5, redis_node: 5, supabase: 5,
  // File ops
  file_upload: 5, file_download: 5,

  // ── Web & search (8) ───────────────────────────────────────────────────────
  web_search: 8,

  // ── AI / LLM inference (10) ────────────────────────────────────────────────
  ai_agent: 10,
  openai: 10, anthropic: 10, gemini: 10, perplexity: 10,
  xai: 10, deepseek: 10, moonshot: 10, groq: 10,
  ollama: 10, lm_studio: 10,
  claude_code: 10, codex: 10, gemini_cli: 10, github_copilot: 10,
  openai_assistant: 10, elevenlabs: 10,
  speech_to_text: 10, text_to_speech: 10, translation: 10,
  email_parser: 10, vector_memory: 10, pinecone: 10,
  // agent sub-node aliases
  agent_openai: 10, agent_anthropic: 10, agent_gemini: 10,
  agent_deepseek: 10, agent_moonshot: 10, agent_perplexity: 10,
  agent_xai: 10, agent_groq: 10, agent_ollama: 10, agent_lmstudio: 10,
  agent_llm: 10, agent_memory: 10,
  agent_memory_mongodb: 3, agent_memory_pinecone: 5,
  agent_memory_postgres: 3, agent_memory_redis: 3,
  agent_memory_supabase: 3, agent_memory_window: 1, agent_memory_zep: 5,
  agent_tool: 10, agent: 10,

  // ── Heavy compute (15) ─────────────────────────────────────────────────────
  web_scraper: 15, advanced_scraper: 15, informer: 15,
  ocr: 15, image_resize: 10, qr_code: 2, pdf_generator: 5,
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
