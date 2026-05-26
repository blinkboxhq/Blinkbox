import { NODE_KB } from "./brian.nodes.js";

export const BRIAN_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export const TRIGGER_BT = new Set([
  "manual", "webhook", "cron_trigger", "rss_trigger", "imap_trigger", "gmail_trigger",
  "slack_trigger", "discord_trigger", "telegram_trigger", "github_trigger",
  "shopify_trigger", "linear_trigger", "notion_trigger", "airtable_trigger",
  "stripe_trigger", "hubspot_trigger", "youtube_trigger", "reddit_trigger",
  "google_calendar_trigger", "form_trigger", "chat_trigger", "db_trigger", "error_trigger",
]);

export const MODEL_BT = new Set([
  "agent_anthropic",
  "agent_openai",
  "agent_gemini",
  "agent_groq",
]);

export const MEMORY_BT = new Set([
  "agent_memory_supabase",
  "agent_memory_pinecone",
  "agent_memory_postgres",
  "agent_memory_redis",
]);

// Keep this list aligned with PLATFORM_TOOL_SPECS in ../../nodes/aiAgent.node.js.
// If a runtime tool is not present there, Brian must not generate it.
export const INTEG_BT = new Set([
  "agent_integration_slack",
  "agent_integration_gmail",
  "agent_integration_discord",
  "agent_integration_telegram",
  "agent_integration_notion",
  "agent_integration_airtable",
  "agent_integration_google_sheets",
  "agent_integration_google_calendar",
  "agent_integration_google_drive",
  "agent_integration_outlook",
  "agent_integration_github",
  "agent_integration_linear",
  "agent_integration_hubspot",
  "agent_integration_jira",
  "agent_integration_asana",
  "agent_integration_stripe",
  "agent_integration_shopify",
  "agent_integration_clickup",
  "agent_integration_twilio",
  "agent_integration_mongodb",
  "agent_integration_postgres",
  "agent_integration_redis",
]);

export const TOOL_BT = new Set(["agent_tool"]);

export const HUB_TYPES = new Set([
  ...MODEL_BT,
  ...MEMORY_BT,
  ...INTEG_BT,
  ...TOOL_BT,
]);

export const AI_AGENT_HANDLES = new Set([
  "chat_model",
  "integration",
  "tools",
  "memory",
]);

export const HUB_SLOT = new Map([
  ...[...MODEL_BT].map((bt) => [bt, "chat_model"]),
  ...[...MEMORY_BT].map((bt) => [bt, "memory"]),
  ...[...INTEG_BT].map((bt) => [bt, "integration"]),
  ...[...TOOL_BT].map((bt) => [bt, "tools"]),
]);

export const AGENT_LAYOUT = Object.freeze({
  trigger: { x: 80, y: 300 },
  hub: { x: 400, y: 300 },
  model: { x: 640, y: 60 },
  memory: { x: 160, y: 60 },
  integrationY: 560,
  integrationX: [
    [],
    [400],
    [220, 580],
    [80, 400, 720],
    [60, 280, 500, 720],
    [60, 230, 400, 570, 740],
  ],
});

export const SUPPORTED_BACKEND_TYPES = new Set([
  ...Object.keys(NODE_KB),
  ...TRIGGER_BT,
  ...MODEL_BT,
  ...MEMORY_BT,
  ...INTEG_BT,
  ...TOOL_BT,
  "ai_agent",
]);

export function isSupportedBackendType(backendType) {
  return SUPPORTED_BACKEND_TYPES.has(backendType);
}

export function integrationTypeFromBackendType(backendType) {
  return String(backendType || "").replace(/^agent_integration_/, "");
}
