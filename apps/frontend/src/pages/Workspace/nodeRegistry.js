import {
  Zap,
  Globe,
  Hourglass,
  Search,
  Database,
  Bot,
  GitBranch,
  Code2,
  Repeat,
  Sparkles,
  MousePointerClick,
  Webhook,
  Clock,
  Brain,
  Filter,
  Layers,
  LayoutGrid,
  FileText,
  Calendar,
  Scissors,
  Github,
  CreditCard,
  Ticket,
  Circle,
  ShoppingBag,
  Users,
  Merge,
  CheckSquare,
  Server,
  AlignLeft,
  CheckCheck,
  XCircle,
  ToggleLeft,
  Mail,
  Edit2,
  Image,
  Package,
  FileOutput,
  Send,
  MessageCircle,
  DollarSign,
  GraduationCap,
  Briefcase,
  PenTool,
  Archive,
  GitFork,
  Share2,
  Gamepad2,
  Regex,
} from "lucide-react";

// Local asset icons
import imgOpenAI from "@nodes/openai/logo.svg";
import imgAnthropic from "@nodes/anthropic/logo.svg";
import imgGemini from "@nodes/gemini/logo.svg";
import imgRedis from "@nodes/redis/logo.svg";
import imgMongoDB from "@nodes/mongodb/logo.svg";
import imgSupabase from "@nodes/supabase/logo.svg";
import imgHTTP from "@nodes/http_request/logo.svg";
import imgCode from "@nodes/code/logo.svg";
import imgAirtable from "@nodes/airtable/logo.svg";
import imgNotion from "@nodes/notion/logo.svg";
import imgTwilio from "@nodes/twilio/logo.svg";
import imgSlack from "@nodes/slack/logo.png";
import imgDiscord from "@nodes/discord/logo.png";
import imgTelegram from "@nodes/telegram/logo.png";
import imgGmail from "@nodes/gmail/logo.png";
import imgGitHub from "@nodes/github/logo.svg";
import imgStripe from "@nodes/stripe/logo.svg";
import imgHubSpot from "@nodes/hubspot/logo.svg";
import imgShopify from "@nodes/shopify/logo.svg";
import imgLinear from "@nodes/linear/logo.svg";
import imgTypeform from "@nodes/typeform/logo.svg";
import imgPostgres from "@nodes/postgres/logo.svg";
import imgJira from "@nodes/jira/logo.svg";
import imgTrello from "@nodes/trello/logo.svg";
import imgGoogleSheets from "@nodes/google_sheets/logo.svg";
import imgGoogleDrive from "@nodes/google_drive/logo.svg";
import imgComputer from "../../assets/computer.png";
import imgGoogle from "../../assets/google-search.svg";
import imgManualTrigger from "@triggers/manual/logo.svg";
import imgWebhookTrigger from "@triggers/webhook/logo.png";
import imgCronTrigger from "@triggers/cron/logo.svg";
import imgFormTrigger from "@triggers/form/logo.png";
import imgErrorTrigger from "@triggers/error_trigger/logo.svg";
import imgImap from "@triggers/imap/logo.svg";

// Config Panels — Triggers
import TriggerNode from "@triggers/manual/ConfigPanel.jsx";
import WebhookTriggerNode from "@triggers/webhook/ConfigPanel.jsx";
import ScheduleTriggerNode from "@triggers/cron/ConfigPanel.jsx";
import FormTriggerNode from "@triggers/form/ConfigPanel.jsx";
import GitHubTriggerNode from "@triggers/github/ConfigPanel.jsx";
import StripeTriggerNode from "@triggers/stripe/ConfigPanel.jsx";
import TelegramTriggerNode from "@triggers/telegram/ConfigPanel.jsx";
import SlackTriggerNode from "@triggers/slack/ConfigPanel.jsx";
import DiscordTriggerNode from "@triggers/discord/ConfigPanel.jsx";
import GmailTriggerNode from "@triggers/gmail/ConfigPanel.jsx";
import AirtableTriggerNode from "@triggers/airtable/ConfigPanel.jsx";
import NotionTriggerNode from "@triggers/notion/ConfigPanel.jsx";
import ShopifyTriggerNode from "@triggers/shopify/ConfigPanel.jsx";
import ErrorTriggerNode from "@triggers/error_trigger/ConfigPanel.jsx";
import EmailTriggerNode from "@triggers/imap/ConfigPanel.jsx";

// Config Panels — Action Nodes
import HttpRequestNode from "@nodes/http_request/ConfigPanel.jsx";
import DelayNode from "@nodes/delay/ConfigPanel.jsx";
import InformerNode from "@nodes/informer/ConfigPanel.jsx";
import AIAgentNode from "@nodes/ai_agent/ConfigPanel.jsx";
import SetFieldsNode from "@nodes/set_fields/ConfigPanel.jsx";
import CodeNode from "@nodes/code/ConfigPanel.jsx";
import LoopNode from "@nodes/loop/ConfigPanel.jsx";
import SlackNode from "@nodes/slack/ConfigPanel.jsx";
import DiscordNode from "@nodes/discord/ConfigPanel.jsx";
import OpenAINode from "@nodes/openai/ConfigPanel.jsx";
import AnthropicNode from "@nodes/anthropic/ConfigPanel.jsx";
import GeminiNode from "@nodes/gemini/ConfigPanel.jsx";
import TelegramNode from "@nodes/telegram/ConfigPanel.jsx";
import AirtableNode from "@nodes/airtable/ConfigPanel.jsx";
import WebSearchNode from "@nodes/web_search/ConfigPanel.jsx";
import GoogleSheetsNode from "@nodes/google_sheets/ConfigPanel.jsx";
import GmailNode from "@nodes/gmail/ConfigPanel.jsx";
import NotionNode from "@nodes/notion/ConfigPanel.jsx";
import TwilioNode from "@nodes/twilio/ConfigPanel.jsx";
import MergeNode from "@nodes/merge/ConfigPanel.jsx";
import FilterArrayNode from "@nodes/filter_array/ConfigPanel.jsx";
import CSVParserNode from "@nodes/csv_parser/ConfigPanel.jsx";
import DateTimeNode from "@nodes/date_time/ConfigPanel.jsx";
import TemplateRendererNode from "@nodes/template_renderer/ConfigPanel.jsx";
import JSONValidatorNode from "@nodes/json_validator/ConfigPanel.jsx";
import SwitchNode from "@nodes/switch/ConfigPanel.jsx";
import ImageResizeNode from "@nodes/image_resize/ConfigPanel.jsx";
import PDFGeneratorNode from "@nodes/pdf_generator/ConfigPanel.jsx";
import OpenAIAssistantNode from "@nodes/openai_assistant/ConfigPanel.jsx";
import TextFormatNode from "@nodes/text_format/ConfigPanel.jsx";
import RegexMatchNode from "@nodes/regex_match/ConfigPanel.jsx";
import ConditionNode from "@nodes/condition/ConfigPanel.jsx";
import StopErrorNode from "@nodes/stop_error/ConfigPanel.jsx";
import SupabaseNode from "@nodes/supabase/ConfigPanel.jsx";
import MongoDBNode from "@nodes/mongodb/ConfigPanel.jsx";
import RedisNode from "@nodes/redis/ConfigPanel.jsx";
import GithubNode from "@nodes/github/ConfigPanel.jsx";
import StripeNode from "@nodes/stripe/ConfigPanel.jsx";
import PostgresNode from "@nodes/postgres/ConfigPanel.jsx";
import JiraNode from "@nodes/jira/ConfigPanel.jsx";
import LinearNode from "@nodes/linear/ConfigPanel.jsx";
import GoogleDriveNode from "@nodes/google_drive/ConfigPanel.jsx";
import HubSpotNode from "@nodes/hubspot/ConfigPanel.jsx";
import ShopifyNode from "@nodes/shopify/ConfigPanel.jsx";
import TrelloNode from "@nodes/trello/ConfigPanel.jsx";
import TypeformNode from "@nodes/typeform/ConfigPanel.jsx";
import WebhookResponseNode from "@nodes/respond_webhook/ConfigPanel.jsx";
import ZipFilesNode from "@nodes/zip_files/ConfigPanel.jsx";
import VariableSetGetNode from "@nodes/variable_set_get/ConfigPanel.jsx";

// Category Definitions (ordered for sidebar)
export const CATEGORIES = [
  { id: "trigger", label: "Triggers", icon: Zap, shape: "square" },
  { id: "ai", label: "AI", icon: Sparkles, shape: "glass" },
  { id: "data", label: "Data & APIs", icon: Database, shape: "sharp" },
  { id: "transform", label: "Data Processing", icon: Layers, shape: "sharp" },
  { id: "research", label: "Research", icon: Search, shape: "sharp" },
  { id: "flow", label: "Flow Control", icon: GitFork, shape: "sharp" },
  { id: "code", label: "Code", icon: Code2, shape: "sharp" },
  { id: "integration", label: "Integrations", icon: Package, shape: "pill" },
  { id: "devtools", label: "Developer Tools", icon: Server, shape: "rounded" },
  { id: "payments", label: "Payments", icon: CreditCard, shape: "rounded" },
  { id: "crm", label: "CRM & Commerce", icon: ShoppingBag, shape: "rounded" },
  { id: "social", label: "Social Media", icon: Users, shape: "rounded" },
  {
    id: "education",
    label: "Education & AI",
    icon: GraduationCap,
    shape: "rounded",
  },
  { id: "design", label: "Design & Creative", icon: PenTool, shape: "pill" },
  { id: "social_pub", label: "Social Media", icon: Share2, shape: "rounded" },
  {
    id: "finance",
    label: "Finance & Accounting",
    icon: DollarSign,
    shape: "rounded",
  },
  { id: "gaming", label: "Gaming", icon: Gamepad2, shape: "sharp" },
  {
    id: "automation",
    label: "Automation Utilities",
    icon: Zap,
    shape: "sharp",
  },
];

export const NodeRegistry = {
  // ── Triggers ─────────────────────────────────────────────────────────────────
  manual: {
    label: "Manual Trigger",
    icon: MousePointerClick,
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    logoUrl: imgManualTrigger,
    ConfigPanel: TriggerNode,
    category: "trigger",
  },
  webhook: {
    label: "Webhook Trigger",
    icon: Webhook,
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    logoUrl: imgWebhookTrigger,
    ConfigPanel: WebhookTriggerNode,
    category: "trigger",
  },
  cron_trigger: {
    label: "Schedule Trigger",
    icon: Clock,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    logoUrl: imgCronTrigger,
    ConfigPanel: ScheduleTriggerNode,
    category: "trigger",
  },
  form_trigger: {
    label: "Form Trigger",
    icon: FileText,
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    logoUrl: imgFormTrigger,
    ConfigPanel: FormTriggerNode,
    category: "trigger",
  },
  github_trigger: {
    label: "GitHub Trigger",
    icon: Github,
    colorClass: "text-zinc-200",
    accentColor: "244,244,245",
    logoUrl: imgGitHub,
    ConfigPanel: GitHubTriggerNode,
    category: "trigger",
  },
  stripe_trigger: {
    label: "Stripe Trigger",
    icon: CreditCard,
    colorClass: "text-[#635BFF]",
    accentColor: "99,91,255",
    logoUrl: imgStripe,
    ConfigPanel: StripeTriggerNode,
    category: "trigger",
  },
  telegram_trigger: {
    label: "Telegram Trigger",
    icon: Brain,
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    logoUrl: imgTelegram,
    ConfigPanel: TelegramTriggerNode,
    category: "trigger",
  },
  slack_trigger: {
    label: "Slack Trigger",
    icon: Brain,
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    logoUrl: imgSlack,
    ConfigPanel: SlackTriggerNode,
    category: "trigger",
  },
  discord_trigger: {
    label: "Discord Trigger",
    icon: Brain,
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    logoUrl: imgDiscord,
    ConfigPanel: DiscordTriggerNode,
    category: "trigger",
  },
  gmail_trigger: {
    label: "Gmail Trigger",
    icon: Brain,
    colorClass: "text-[#EA4335]",
    accentColor: "234,67,53",
    logoUrl: imgGmail,
    ConfigPanel: GmailTriggerNode,
    category: "trigger",
  },
  airtable_trigger: {
    label: "Airtable Trigger",
    icon: Brain,
    colorClass: "text-[#F65858]",
    accentColor: "246,88,88",
    logoUrl: imgAirtable,
    ConfigPanel: AirtableTriggerNode,
    category: "trigger",
  },
  notion_trigger: {
    label: "Notion Trigger",
    icon: Brain,
    colorClass: "text-white",
    accentColor: "255,255,255",
    logoUrl: imgNotion,
    ConfigPanel: NotionTriggerNode,
    category: "trigger",
  },
  shopify_trigger: {
    label: "Shopify Trigger",
    icon: ShoppingBag,
    colorClass: "text-[#95BF47]",
    accentColor: "149,191,71",
    logoUrl: imgShopify,
    ConfigPanel: ShopifyTriggerNode,
    category: "trigger",
  },
  error_trigger: {
    label: "Error Trigger",
    icon: XCircle,
    colorClass: "text-red-400",
    accentColor: "239,68,68",
    logoUrl: imgErrorTrigger,
    category: "trigger",
    ConfigPanel: ErrorTriggerNode,
  },

  // ── AI ────────────────────────────────────────────────────────────────────────
  openai: {
    label: "OpenAI",
    icon: Brain,
    colorClass: "text-[#10A37F]",
    accentColor: "16,163,127",
    logoUrl: imgOpenAI,
    ConfigPanel: OpenAINode,
    category: "ai",
  },
  anthropic: {
    label: "Anthropic",
    icon: Brain,
    colorClass: "text-[#D4C1B3]",
    accentColor: "212,193,179",
    logoUrl: imgAnthropic,
    ConfigPanel: AnthropicNode,
    category: "ai",
  },
  gemini: {
    label: "Google Gemini",
    icon: Brain,
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    logoUrl: imgGemini,
    ConfigPanel: GeminiNode,
    category: "ai",
  },
  ai_agent: {
    label: "AI Agent",
    icon: Bot,
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    ConfigPanel: AIAgentNode,
    category: "ai",
    description:
      "Autonomous AI that reasons, uses tools, and completes multi-step tasks on its own",
  },
  web_search: {
    label: "Web Search",
    icon: Globe,
    logoUrl: imgGoogle,
    colorClass: "text-white",
    accentColor: "129,140,248",
    ConfigPanel: WebSearchNode,
    category: "research",
  },
  openai_assistant: {
    label: "OpenAI Assistant",
    icon: Brain,
    logoUrl: imgOpenAI,
    colorClass: "text-green-400",
    accentColor: "74,222,128",
    ConfigPanel: OpenAIAssistantNode,
    category: "ai",
    description: "Create threads and run OpenAI Assistants API with file attachments",
  },

  // ── Data & APIs ───────────────────────────────────────────────────────────────
  http_request: {
    label: "HTTP Request",
    icon: Globe,
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    logoUrl: imgHTTP,
    ConfigPanel: HttpRequestNode,
    category: "data",
  },
  postgres: {
    label: "PostgreSQL",
    icon: Server,
    colorClass: "text-white",
    accentColor: "91,155,213",
    logoUrl: imgPostgres,
    ConfigPanel: PostgresNode,
    category: "data",
  },
  supabase: {
    label: "Supabase",
    icon: Database,
    logoUrl: imgSupabase,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: SupabaseNode,
    category: "data",
  },
  mongodb: {
    label: "MongoDB",
    icon: Database,
    logoUrl: imgMongoDB,
    colorClass: "text-[#47A248]",
    accentColor: "71,162,72",
    ConfigPanel: MongoDBNode,
    category: "data",
  },
  redis_node: {
    label: "Redis",
    icon: Server,
    logoUrl: imgRedis,
    colorClass: "text-[#FF4438]",
    accentColor: "255,68,56",
    ConfigPanel: RedisNode,
    category: "data",
  },

  // ── Data Processing / Transform ───────────────────────────────────────────────
  csv_parser: {
    label: "CSV Parser",
    icon: FileText,
    colorClass: "text-white",
    accentColor: "52,211,153",
    ConfigPanel: CSVParserNode,
    category: "transform",
  },
  date_time: {
    label: "Date & Time",
    icon: Calendar,
    colorClass: "text-blue-400",
    accentColor: "96,165,250",
    ConfigPanel: DateTimeNode,
    category: "transform",
    description: "Parse, format and manipulate dates and times",
  },
  json_validator: {
    label: "JSON Validator",
    icon: FileText,
    colorClass: "text-green-400",
    accentColor: "74,222,128",
    ConfigPanel: JSONValidatorNode,
    category: "transform",
    description: "Validate, format and minify JSON payloads",
  },
  image_resize: {
    label: "Image Resize",
    icon: Image,
    colorClass: "text-purple-400",
    accentColor: "192,132,252",
    ConfigPanel: ImageResizeNode,
    category: "transform",
    description: "Resize, crop, convert and optimise images",
  },
  pdf_generator: {
    label: "PDF Generator",
    icon: FileText,
    colorClass: "text-red-400",
    accentColor: "248,113,113",
    ConfigPanel: PDFGeneratorNode,
    category: "transform",
    description: "Generate PDFs from HTML templates and merge documents",
  },
  text_format: {
    label: "Text Format",
    icon: AlignLeft,
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    ConfigPanel: TextFormatNode,
    category: "transform",
    description: "Trim, truncate, slugify, case-convert and pad strings",
  },
  regex_match: {
    label: "Regex Match",
    icon: Regex,
    colorClass: "text-green-400",
    accentColor: "74,222,128",
    ConfigPanel: RegexMatchNode,
    category: "transform",
    description: "Test, capture and replace with regular expressions",
  },
  template_renderer: {
    label: "Template Renderer",
    icon: AlignLeft,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: TemplateRendererNode,
    category: "transform",
  },
  set_fields: {
    label: "Set Fields",
    icon: Edit2,
    colorClass: "text-white",
    accentColor: "52,211,153",
    ConfigPanel: SetFieldsNode,
    category: "transform",
  },
  filter_array: {
    label: "Filter Array",
    icon: Filter,
    colorClass: "text-white",
    accentColor: "244,114,182",
    ConfigPanel: FilterArrayNode,
    category: "transform",
  },

  // ── Flow Control ──────────────────────────────────────────────────────────────
  condition: {
    label: "Condition",
    icon: CheckCheck,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: ConditionNode,
    category: "flow",
    description: "Branch into True or False path based on a condition",
  },
  loop: {
    label: "Loop",
    icon: Repeat,
    colorClass: "text-white",
    accentColor: "251,191,36",
    ConfigPanel: LoopNode,
    category: "flow",
  },
  merge: {
    label: "Merge",
    icon: Merge,
    colorClass: "text-white",
    accentColor: "45,212,191",
    ConfigPanel: MergeNode,
    category: "flow",
  },
  delay: {
    label: "Delay",
    icon: Hourglass,
    colorClass: "text-white",
    accentColor: "251,146,60",
    ConfigPanel: DelayNode,
    category: "flow",
  },
  switch: {
    label: "Switch",
    icon: GitFork,
    colorClass: "text-pink-400",
    accentColor: "244,114,182",
    ConfigPanel: SwitchNode,
    category: "flow",
  },
  stop_error: {
    label: "Stop & Error",
    icon: XCircle,
    colorClass: "text-red-400",
    accentColor: "239,68,68",
    ConfigPanel: StopErrorNode,
    category: "flow",
    description: "Halt the workflow and throw a custom error",
  },
  variable_set_get: {
    label: "Variable Set / Get",
    icon: ToggleLeft,
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: VariableSetGetNode,
    category: "automation",
    description:
      "Store and retrieve values across nodes with execution/workflow/global scope",
  },

  // ── Code ──────────────────────────────────────────────────────────────────────
  code: {
    label: "Run Code",
    icon: Code2,
    colorClass: "text-white",
    accentColor: "163,230,53",
    logoUrl: imgCode,
    ConfigPanel: CodeNode,
    category: "code",
  },

  // ── Communication / Integrations ─────────────────────────────────────────────
  slack: {
    label: "Slack",
    icon: Brain,
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    logoUrl: imgSlack,
    ConfigPanel: SlackNode,
    category: "integration",
  },
  gmail: {
    label: "Gmail",
    icon: Brain,
    colorClass: "text-[#EA4335]",
    accentColor: "234,67,53",
    logoUrl: imgGmail,
    ConfigPanel: GmailNode,
    category: "integration",
  },
  email: {
    label: "Email (Webhook)",
    icon: Mail,
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    ConfigPanel: EmailTriggerNode,
    category: "integration",
    description:
      "Receive inbound emails via Mailgun, SendGrid or Postmark webhook",
  },
  telegram: {
    label: "Telegram",
    icon: Brain,
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    logoUrl: imgTelegram,
    ConfigPanel: TelegramNode,
    category: "integration",
  },
  discord: {
    label: "Discord",
    icon: Brain,
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    logoUrl: imgDiscord,
    ConfigPanel: DiscordNode,
    category: "integration",
  },
  twilio: {
    label: "Twilio",
    icon: Brain,
    colorClass: "text-[#F22F46]",
    accentColor: "242,47,70",
    logoUrl: imgTwilio,
    ConfigPanel: TwilioNode,
    category: "integration",
  },

  // ── Productivity ──────────────────────────────────────────────────────────────
  notion: {
    label: "Notion",
    icon: Brain,
    colorClass: "text-white",
    accentColor: "255,255,255",
    logoUrl: imgNotion,
    ConfigPanel: NotionNode,
    category: "integration",
  },
  airtable: {
    label: "Airtable",
    icon: Brain,
    colorClass: "text-[#F65858]",
    accentColor: "246,88,88",
    logoUrl: imgAirtable,
    ConfigPanel: AirtableNode,
    category: "integration",
  },
  google_sheets: {
    label: "Google Sheets",
    icon: Brain,
    colorClass: "text-[#0F9D58]",
    accentColor: "15,157,88",
    logoUrl: imgGoogleSheets,
    ConfigPanel: GoogleSheetsNode,
    category: "integration",
  },
  google_drive: {
    label: "Google Drive",
    icon: Database,
    colorClass: "text-[#FBBC04]",
    accentColor: "251,188,4",
    logoUrl: imgGoogleDrive,
    ConfigPanel: GoogleDriveNode,
    category: "integration",
  },
  github: {
    label: "GitHub",
    icon: Github,
    colorClass: "text-zinc-200",
    accentColor: "244,244,245",
    logoUrl: imgGitHub,
    ConfigPanel: GithubNode,
    category: "devtools",
  },
  jira: {
    label: "Jira",
    icon: Ticket,
    colorClass: "text-[#2684FF]",
    accentColor: "38,132,255",
    logoUrl: imgJira,
    ConfigPanel: JiraNode,
    category: "devtools",
  },
  linear: {
    label: "Linear",
    icon: Circle,
    colorClass: "text-[#5E6AD2]",
    accentColor: "94,106,210",
    logoUrl: imgLinear,
    ConfigPanel: LinearNode,
    category: "devtools",
  },
  trello: {
    label: "Trello",
    icon: Ticket,
    colorClass: "text-[#0052CC]",
    accentColor: "0,82,204",
    logoUrl: imgTrello,
    ConfigPanel: TrelloNode,
    category: "devtools",
    description:
      "Create cards, move to lists, add comments and manage Trello boards",
  },

  // ── CRM & Commerce ────────────────────────────────────────────────────────────
  hubspot: {
    label: "HubSpot",
    icon: Users,
    colorClass: "text-[#FF7A59]",
    accentColor: "255,122,89",
    logoUrl: imgHubSpot,
    ConfigPanel: HubSpotNode,
    category: "crm",
  },
  stripe: {
    label: "Stripe",
    icon: CreditCard,
    colorClass: "text-[#635BFF]",
    accentColor: "99,91,255",
    logoUrl: imgStripe,
    ConfigPanel: StripeNode,
    category: "payments",
  },
  shopify: {
    label: "Shopify",
    icon: ShoppingBag,
    colorClass: "text-[#95BF47]",
    accentColor: "149,191,71",
    logoUrl: imgShopify,
    ConfigPanel: ShopifyNode,
    category: "crm",
  },
  typeform: {
    label: "Typeform",
    icon: FileText,
    colorClass: "text-white",
    accentColor: "161,161,170",
    logoUrl: imgTypeform,
    ConfigPanel: TypeformNode,
    category: "integration",
    description: "Create forms, fetch responses and manage Typeform workspaces",
  },

  // ── Utility ───────────────────────────────────────────────────────────────────
  web_scraper: {
    label: "Web Scraper",
    icon: Search,
    colorClass: "text-white",
    accentColor: "168,85,247",
    logoUrl: imgComputer,
    imgFilter: "brightness(0) invert(1)",
    ConfigPanel: InformerNode,
    category: "research",
  },
  zip_files: {
    label: "Zip / Unzip",
    icon: Archive,
    colorClass: "text-white",
    accentColor: "161,161,170",
    ConfigPanel: ZipFilesNode,
    category: "automation",
    description:
      "Compress or extract ZIP, TAR and TAR.GZ archives with password support",
  },
  webhook_response: {
    label: "Webhook Response",
    icon: Send,
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    ConfigPanel: WebhookResponseNode,
    category: "devtools",
    description: "Send a custom HTTP response to the webhook caller",
  },
};
