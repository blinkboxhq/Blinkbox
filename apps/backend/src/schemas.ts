import { z } from "zod";

// ── Node Types ──────────────────────────────────────────────────────────────────
// Accept any string — the node registry is the source of truth.
// Using z.string() prevents Zod from rejecting new node types added to the registry.

export const NODE_TYPES = [
  // Triggers
  "manual", "webhook", "cron_trigger", "chat_trigger", "form_trigger",
  "imap_trigger", "rss_trigger", "db_trigger",
  "telegram_trigger", "slack_trigger", "discord_trigger", "whatsapp_trigger",
  "gmail_trigger", "airtable_trigger", "notion_trigger", "hubspot_trigger",
  "shopify_trigger", "stripe_trigger", "github_trigger", "linear_trigger",
  "typeform_trigger", "youtube_trigger", "price_alert_trigger",
  "reddit_trigger", "google_calendar_trigger", "github_issue_trigger",
  "app_event_trigger", "evaluation_trigger", "database_trigger",
  "ssh_trigger", "docker_trigger", "jira_trigger", "trello_trigger",
  "google_sheets_trigger", "outlook_trigger",
  "http_monitor_trigger", "gitlab_trigger",
  "ssl_trigger", "dns_trigger", "port_monitor_trigger",
  "hackernews_trigger", "pipedrive_trigger", "asana_trigger",
  // Core
  "http_request", "web_scraper", "ai_agent", "data_mapper", "condition",
  // Supporting
  "code", "delay", "loop", "merge", "respond_webhook",
  // Utility
  "filter_array", "sort_array", "deduplicate", "csv_parser",
  "date_time", "crypto_utils", "data_diff", "aggregate", "set_fields",
  "email_verifier",
  "qr_code", "image_resize", "pdf_generator",
  "template_renderer", "json_validator",
  // AI Hub
  "openai", "anthropic", "gemini", "deepseek", "groq", "perplexity", "xai",
  "openai_assistant", "ai_classify", "ai_extract", "ai_transform", "ai_decision",
  // Comms
  "telegram", "whatsapp", "discord", "slack", "twilio", "sendgrid", "gmail",
  "resend", "notify_hub", "email_parser",
  // Data
  "airtable", "google_sheets", "notion", "mongodb", "postgres", "redis_node",
  "firebase", "supabase", "pinecone",
  // Web
  "web_search",
  // Dev tools
  "github", "jira", "linear",
  // Payments
  "stripe", "shopify", "hubspot",
  // Google Workspace
  "google_calendar", "google_drive",
  // Social
  "twitter", "elevenlabs", "zoom",
  // Agent / Computer
  "virtual_computer", "coding_agent",
  "claude_code", "codex", "gemini_cli", "ollama", "lm_studio", "github_copilot",
  // Flow Control
  "wait_for_event", "sub_workflow",
  // Backward-compat aliases
  "advanced_scraper", "informer", "transform", "filter", "if_condition",
] as const;

// For runtime validation in save routes we accept any non-empty string
// so new node types never break saves. Strict enum validation only at activation.
export const NodeTypeSchema = z.string().min(1);

// ── Edge Types ──────────────────────────────────────────────────────────────────

export const EDGE_TYPES = ["onSuccess", "onFailure"] as const;
export const EdgeTypeSchema = z.enum(EDGE_TYPES);

// ── Trigger Types ───────────────────────────────────────────────────────────────

export const TRIGGER_TYPES = [
  "manual", "webhook", "cron_trigger", "chat_trigger", "form_trigger",
  "imap_trigger", "rss_trigger", "db_trigger",
  "telegram_trigger", "slack_trigger", "discord_trigger", "whatsapp_trigger",
  "gmail_trigger", "airtable_trigger", "notion_trigger", "hubspot_trigger",
  "shopify_trigger", "stripe_trigger", "github_trigger", "linear_trigger",
  "typeform_trigger", "youtube_trigger", "price_alert_trigger",
  "reddit_trigger", "google_calendar_trigger", "github_issue_trigger",
  "app_event_trigger", "evaluation_trigger", "database_trigger",
  "ssl_trigger", "dns_trigger", "port_monitor_trigger",
  "hackernews_trigger", "pipedrive_trigger", "asana_trigger",
] as const;

// Accept any non-empty string for trigger type on save — new triggers shouldn't break saves
export const TriggerTypeSchema = z.string().min(1);

// ── Shared Primitives ───────────────────────────────────────────────────────────

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const EdgeConditionSchema = z.union([
  z.literal("always"),
  z.record(z.string(), z.unknown()),
]);

// ── NodeConfig ──────────────────────────────────────────────────────────────────

export const NodeConfigSchema = z.object({
  id: z.string().min(1, "Node id is required"),
  type: NodeTypeSchema,
  data: z.record(z.string(), z.unknown()).default({}),
  position: PositionSchema.default({ x: 0, y: 0 }),
  description: z.string().default(""),
});

// ── EdgeConfig ──────────────────────────────────────────────────────────────────

export const EdgeConfigSchema = z.object({
  id: z.string().min(1, "Edge id is required"),
  source: z.string().min(1, "Edge source is required"),
  target: z.string().min(1, "Edge target is required"),
  sourceHandle: z.string().nullable().default(null),
  targetHandle: z.string().nullable().default(null),
  condition: EdgeConditionSchema.default("always"),
  type: EdgeTypeSchema.default("onSuccess"),
  description: z.string().default(""),
});

// ── Binary Metadata ────────────────────────────────────────────────────────────

export const BinaryMetadataSchema = z.object({
  type: z.literal("binary"),
  fileId: z.string(),
  mimeType: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  storageKey: z.string(),
  storedAt: z.enum(["s3", "local"]),
});

export type BinaryMetadata = z.infer<typeof BinaryMetadataSchema>;

// ── Automation Settings ─────────────────────────────────────────────────────────
// passthrough() so extra fields (cronExpression, etc.) are preserved, not stripped

export const AutomationSettingsSchema = z.object({
  maxParallel: z.number().int().min(1).max(100).default(10),
}).passthrough();

// ── WorkflowDefinition ──────────────────────────────────────────────────────────

export const WorkflowDefinitionSchema = z.object({
  name: z.string().min(1, "Automation name is required").max(200),
  trigger: TriggerTypeSchema,
  active: z.boolean().optional(),
  workspaceId: z.string().optional(),
  nodes: z.array(NodeConfigSchema).default([]),
  edges: z.array(EdgeConfigSchema).default([]),
  entryNodeId: z.string().optional().default(""),
  settings: AutomationSettingsSchema.default({ maxParallel: 10 }),
  // Not defaulted: the canvas payload omits description, and a default of ""
  // would make every autosave erase whatever the user (or the API) had set.
  description: z.string().optional(),
}).passthrough();

// ── Inferred TypeScript Types ───────────────────────────────────────────────────

export type NodeType = (typeof NODE_TYPES)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];
export type TriggerType = (typeof TRIGGER_TYPES)[number];
export type Position = z.infer<typeof PositionSchema>;
export type EdgeCondition = z.infer<typeof EdgeConditionSchema>;
export type NodeConfig = z.infer<typeof NodeConfigSchema>;
export type EdgeConfig = z.infer<typeof EdgeConfigSchema>;
export type AutomationSettings = z.infer<typeof AutomationSettingsSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
