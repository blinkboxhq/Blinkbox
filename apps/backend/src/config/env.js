import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

/**
 * Validated environment configuration.
 * dotenv is loaded here to ensure env vars are available regardless of import order.
 */

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required");
}

if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
  throw new Error("FATAL: ENCRYPTION_KEY must be exactly 32 characters");
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// BACKEND_PUBLIC_URL must be the public-facing URL (e.g. https://blinkbox-backend-production.up.railway.app)
// BACKEND_URL may be an internal hostname (Railway internal) — not reachable from external services like Telegram
export const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

// ── OAuth App Credentials (optional — only needed for OAuth Connect buttons) ──
// These are NOT validated at startup — OAuth flows gracefully return an error
// if the env var is missing, so the app still boots without them.
export const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || null;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || null;
export const SLACK_CLIENT_ID      = process.env.SLACK_CLIENT_ID      || null;
export const SLACK_CLIENT_SECRET  = process.env.SLACK_CLIENT_SECRET  || null;
export const MICROSOFT_CLIENT_ID     = process.env.MICROSOFT_CLIENT_ID     || null;
export const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || null;
export const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID     || null;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || null;
export const AIRTABLE_CLIENT_ID     = process.env.AIRTABLE_CLIENT_ID     || null;
export const AIRTABLE_CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET || null;
export const NOTION_CLIENT_ID     = process.env.NOTION_CLIENT_ID     || null;
export const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || null;
export const META_APP_ID     = process.env.META_APP_ID     || null;
export const META_APP_SECRET = process.env.META_APP_SECRET || null;

// ── AI / LLM API Keys ─────────────────────────────────────────────────────────
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || null;
export const GROQ_API_KEY      = process.env.GROQ_API_KEY      || null;
export const OPENAI_API_KEY    = process.env.OPENAI_API_KEY    || null;
export const GOOGLE_AI_KEY     = process.env.GOOGLE_AI_KEY     || null;
export const XAI_API_KEY       = process.env.XAI_API_KEY       || null;
export const DEEPSEEK_API_KEY  = process.env.DEEPSEEK_API_KEY  || null;
export const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || null;
export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || null;

// ── Messaging / Bot Tokens ────────────────────────────────────────────────────
export const TELEGRAM_BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN  || null;
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || null;
export const DISCORD_BOT_TOKEN   = process.env.DISCORD_BOT_TOKEN   || null;
export const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID  || null;
export const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN   || null;
export const TWILIO_FROM_NUMBER  = process.env.TWILIO_FROM_NUMBER  || null;

// ── Email / SMTP ──────────────────────────────────────────────────────────────
export const SMTP_HOST    = process.env.SMTP_HOST    || null;
export const SMTP_PORT    = process.env.SMTP_PORT    || "587";
export const SMTP_SECURE  = process.env.SMTP_SECURE  || "false";
export const SMTP_USER    = process.env.SMTP_USER    || null;
export const SMTP_PASS    = process.env.SMTP_PASS    || null;
export const FROM_EMAIL   = process.env.FROM_EMAIL   || process.env.SMTP_USER || null;
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || null;
export const RESEND_API_KEY   = process.env.RESEND_API_KEY   || null;

// ── Data / Storage ────────────────────────────────────────────────────────────
export const MONGODB_URI   = process.env.MONGODB_URI || process.env.MONGO_URI || null;
export const REDIS_URL     = process.env.REDIS_URL   || null;
export const POSTGRES_URL  = process.env.POSTGRES_URL || null;
export const SUPABASE_URL  = process.env.SUPABASE_URL || null;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || null;
export const AWS_REGION    = process.env.AWS_REGION  || "us-east-1";
export const AWS_ENDPOINT_URL    = process.env.AWS_ENDPOINT_URL    || null;
export const BINARY_STORE_BUCKET = process.env.BINARY_STORE_BUCKET || null;
export const PINECONE_API_KEY    = process.env.PINECONE_API_KEY    || null;
export const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || null;
export const ELASTICSEARCH_URL   = process.env.ELASTICSEARCH_URL   || null;
export const FIREBASE_PROJECT_ID       = process.env.FIREBASE_PROJECT_ID       || null;
export const FIREBASE_PRIVATE_KEY      = process.env.FIREBASE_PRIVATE_KEY      || null;
export const FIREBASE_CLIENT_EMAIL     = process.env.FIREBASE_CLIENT_EMAIL     || null;

// ── Search / Public APIs ──────────────────────────────────────────────────────
export const GOOGLE_SEARCH_API_KEY    = process.env.GOOGLE_SEARCH_API_KEY    || null;
export const GOOGLE_SEARCH_ENGINE_ID  = process.env.GOOGLE_SEARCH_ENGINE_ID  || null;
export const BING_SEARCH_API_KEY      = process.env.BING_SEARCH_API_KEY      || null;
export const BRAVE_SEARCH_API_KEY     = process.env.BRAVE_SEARCH_API_KEY     || null;
export const TAVILY_API_KEY           = process.env.TAVILY_API_KEY           || null;
export const EXA_API_KEY              = process.env.EXA_API_KEY              || null;
export const SEARXNG_URL              = process.env.SEARXNG_URL              || null;
export const NEWS_API_KEY             = process.env.NEWS_API_KEY             || null;
export const GNEWS_API_KEY            = process.env.GNEWS_API_KEY            || null;
export const OPENWEATHER_API_KEY      = process.env.OPENWEATHER_API_KEY      || null;
export const ALPHA_VANTAGE_API_KEY    = process.env.ALPHA_VANTAGE_API_KEY    || process.env.ALPHAVANTAGE_API_KEY || null;
export const YOUTUBE_API_KEY          = process.env.YOUTUBE_API_KEY          || null;
export const WOLFRAM_APP_ID           = process.env.WOLFRAM_APP_ID           || null;
export const OCR_SPACE_API_KEY        = process.env.OCR_SPACE_API_KEY        || null;
export const LIBRETRANSLATE_URL       = process.env.LIBRETRANSLATE_URL       || null;
export const LIBRETRANSLATE_API_KEY   = process.env.LIBRETRANSLATE_API_KEY   || null;
export const PRODUCTHUNT_API_KEY      = process.env.PRODUCTHUNT_API_KEY      || null;
export const VIRUSTOTAL_API_KEY       = process.env.VIRUSTOTAL_API_KEY       || null;

// ── CRM / SaaS Webhooks & API Keys ───────────────────────────────────────────
export const STRIPE_SECRET_KEY       = process.env.STRIPE_SECRET_KEY       || null;
export const STRIPE_WEBHOOK_SECRET   = process.env.STRIPE_WEBHOOK_SECRET   || null;
export const HUBSPOT_API_KEY         = process.env.HUBSPOT_API_KEY         || null;
export const SHOPIFY_API_KEY         = process.env.SHOPIFY_API_KEY         || null;
export const SHOPIFY_API_SECRET      = process.env.SHOPIFY_API_SECRET      || null;
export const SHOPIFY_STORE_DOMAIN    = process.env.SHOPIFY_STORE_DOMAIN    || null;
export const LINEAR_API_KEY          = process.env.LINEAR_API_KEY          || null;
export const LINEAR_WEBHOOK_SECRET   = process.env.LINEAR_WEBHOOK_SECRET   || null;
export const TYPEFORM_WEBHOOK_SECRET = process.env.TYPEFORM_WEBHOOK_SECRET || null;
export const PIPEDRIVE_API_TOKEN     = process.env.PIPEDRIVE_API_TOKEN     || null;
export const ASANA_ACCESS_TOKEN      = process.env.ASANA_ACCESS_TOKEN      || null;
export const ZENDESK_SUBDOMAIN       = process.env.ZENDESK_SUBDOMAIN       || null;
export const ZENDESK_API_TOKEN       = process.env.ZENDESK_API_TOKEN       || null;
export const INTERCOM_ACCESS_TOKEN   = process.env.INTERCOM_ACCESS_TOKEN   || null;
export const MAILCHIMP_API_KEY       = process.env.MAILCHIMP_API_KEY       || null;
export const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX || null;
export const MONDAY_API_KEY          = process.env.MONDAY_API_KEY          || null;
export const CLICKUP_API_KEY         = process.env.CLICKUP_API_KEY         || null;
export const CALENDLY_WEBHOOK_SECRET = process.env.CALENDLY_WEBHOOK_SECRET || null;
export const DATADOG_API_KEY         = process.env.DATADOG_API_KEY         || null;
export const PAGERDUTY_API_KEY       = process.env.PAGERDUTY_API_KEY       || null;
export const SENTRY_DSN              = process.env.SENTRY_DSN              || null;
export const NETLIFY_API_KEY         = process.env.NETLIFY_API_KEY         || null;
export const VERCEL_TOKEN            = process.env.VERCEL_TOKEN            || null;
export const WOOCOMMERCE_KEY         = process.env.WOOCOMMERCE_KEY         || null;
export const WOOCOMMERCE_SECRET      = process.env.WOOCOMMERCE_SECRET      || null;

// ── Dev Tools / SCM ───────────────────────────────────────────────────────────
export const JIRA_BASE_URL       = process.env.JIRA_BASE_URL       || null;
export const JIRA_EMAIL          = process.env.JIRA_EMAIL          || null;
export const JIRA_API_TOKEN      = process.env.JIRA_API_TOKEN      || null;
export const TRELLO_API_KEY      = process.env.TRELLO_API_KEY      || null;
export const TRELLO_TOKEN        = process.env.TRELLO_TOKEN        || null;
export const GITLAB_TOKEN        = process.env.GITLAB_TOKEN        || null;
export const GITLAB_WEBHOOK_SECRET = process.env.GITLAB_WEBHOOK_SECRET || null;
export const ASANA_WEBHOOK_SECRET  = process.env.ASANA_WEBHOOK_SECRET  || null;
export const DOCKER_SOCKET         = process.env.DOCKER_SOCKET         || "/var/run/docker.sock";
export const SSH_PASSWORD          = process.env.SSH_PASSWORD          || null;
export const SSH_PRIVATE_KEY       = process.env.SSH_PRIVATE_KEY       || null;

// ── Social ────────────────────────────────────────────────────────────────────
export const TWITTER_API_KEY        = process.env.TWITTER_API_KEY        || null;
export const TWITTER_API_SECRET     = process.env.TWITTER_API_SECRET     || null;
export const TWITTER_ACCESS_TOKEN   = process.env.TWITTER_ACCESS_TOKEN   || null;
export const TWITTER_ACCESS_SECRET  = process.env.TWITTER_ACCESS_SECRET  || null;
export const REDDIT_CLIENT_ID       = process.env.REDDIT_CLIENT_ID       || null;
export const REDDIT_CLIENT_SECRET   = process.env.REDDIT_CLIENT_SECRET   || null;
export const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || null;
export const TIKTOK_ACCESS_TOKEN    = process.env.TIKTOK_ACCESS_TOKEN    || null;
export const TWITCH_CLIENT_ID       = process.env.TWITCH_CLIENT_ID       || null;
export const TWITCH_ACCESS_TOKEN    = process.env.TWITCH_ACCESS_TOKEN    || null;

// ── Internal / Infrastructure ─────────────────────────────────────────────────
export const CORS_ORIGINS       = process.env.CORS_ORIGINS       || null;
export const BRIAN_WEBHOOK_URL  = process.env.BRIAN_WEBHOOK_URL  || null;
export const MONITOR_URL        = process.env.MONITOR_URL        || null;
export const ALERT_EMAIL_FROM   = process.env.ALERT_EMAIL_FROM   || null;
export const ALERT_EMAIL_TO     = process.env.ALERT_EMAIL_TO     || null;
export const ALERT_EMAIL_PASS   = process.env.ALERT_EMAIL_PASS   || null;
export const SLACK_WEBHOOK_URL  = process.env.SLACK_WEBHOOK_URL  || null;
export const ENABLE_SHELL_TOOLS    = process.env.ENABLE_SHELL_TOOLS    === "true";
export const ALLOW_LOCAL_REQUESTS  = process.env.ALLOW_LOCAL_REQUESTS  === "true";
