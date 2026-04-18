import {
  Zap, Globe, Hourglass, Search, Database, Bot, GitBranch, Code2, Repeat,
  Sparkles, MousePointerClick, Webhook, Clock, Brain, Filter, ArrowUpDown,
  Layers, LayoutGrid, FileText, Calendar, Shield, Tags, Scissors, Wand2,
  Github, CreditCard, Ticket, Circle, ShoppingBag, Twitter, Users, Merge,
  CheckSquare, Server,
} from "lucide-react";

// Local asset icons
import imgOpenAI     from "../../assets/openai.svg";
import imgAnthropic  from "../../assets/anthropic.svg";
import imgGemini     from "../../assets/gemini-color.svg";
import imgPerplexity from "../../assets/perplexity-color.svg";
import imgDeepSeek   from "../../assets/deepseek-color.svg";
import imgGrok       from "../../assets/grok-color.svg";
import imgComputer   from "../../assets/computer.png";
import imgHTTP       from "../../assets/Globe--Streamline-Unicons.svg";
import imgCode       from "../../assets/Brackets-Curly--Streamline-Unicons.svg";
import imgAirtable   from "../../assets/Airtable--Streamline-Svg-Logos.svg";
import imgNotion     from "../../assets/Notion-Logo--Streamline-Radix.svg";
import imgSendGrid   from "../../assets/Sendgrid-Icon--Streamline-Svg-Logos.svg";
import imgTwilio     from "../../assets/Twilio-Icon--Streamline-Svg-Logos.svg";
import imgSlack      from "../../assets/slack.png";
import imgDiscord    from "../../assets/discord.png";
import imgTelegram   from "../../assets/telegram.png";
import imgWhatsApp   from "../../assets/whatsapp.png";
import imgGmail      from "../../assets/gmail.png";

// Config Panels — existing
import TriggerNode          from "./components/nodes/TriggerNode";
import WebhookTriggerNode   from "./components/nodes/WebhookTriggerNode";
import ScheduleTriggerNode  from "./components/nodes/ScheduleTriggerNode";
import GitHubTriggerNode    from "./components/nodes/GitHubTriggerNode";
import StripeTriggerNode    from "./components/nodes/StripeTriggerNode";

// Config Panels — integration triggers (new)
import TelegramTriggerNode  from "./components/nodes/TelegramTriggerNode";
import SlackTriggerNode     from "./components/nodes/SlackTriggerNode";
import DiscordTriggerNode   from "./components/nodes/DiscordTriggerNode";
import GmailTriggerNode     from "./components/nodes/GmailTriggerNode";
import AirtableTriggerNode  from "./components/nodes/AirtableTriggerNode";
import NotionTriggerNode    from "./components/nodes/NotionTriggerNode";
import HubSpotTriggerNode   from "./components/nodes/HubSpotTriggerNode";
import ShopifyTriggerNode   from "./components/nodes/ShopifyTriggerNode";
import LinearTriggerNode    from "./components/nodes/LinearTriggerNode";
import TypeformTriggerNode  from "./components/nodes/TypeformTriggerNode";
import WhatsAppTriggerNode  from "./components/nodes/WhatsAppTriggerNode";
import HttpRequestNode     from "./components/nodes/HttpRequestNode";
import DelayNode           from "./components/nodes/Delaynode";
import InformerNode        from "./components/nodes/InformerNode";
import AIAgentNode         from "./components/nodes/AIAgentNode";
import DataMapperNode      from "./components/nodes/DataMapperNode";
import LogicRouterNode     from "./components/nodes/LogicRouterNode";
import CodeNode            from "./components/nodes/CodeNode";
import LoopNode            from "./components/nodes/LoopNode";
import SlackNode           from "./components/nodes/SlackNode";
import DiscordNode         from "./components/nodes/DiscordNode";
import OpenAINode          from "./components/nodes/OpenAINode";
import AnthropicNode       from "./components/nodes/AnthropicNode";
import GeminiNode          from "./components/nodes/GeminiNode";
import TelegramNode        from "./components/nodes/TelegramNode";
import WhatsAppNode        from "./components/nodes/WhatsAppNode";
import AirtableNode        from "./components/nodes/AirtableNode";
import WebSearchNode       from "./components/nodes/WebSearchNode";
import makeOpenAICompatNode from "./components/nodes/OpenAICompatNode";
import DeepSeekNode        from "./components/nodes/DeepSeekNode";
import GoogleSheetsNode    from "./components/nodes/GoogleSheetsNode";
import GmailNode           from "./components/nodes/GmailNode";
import NotionNode          from "./components/nodes/NotionNode";
import TwilioNode          from "./components/nodes/TwilioNode";
import SendGridNode        from "./components/nodes/SendGridNode";
import MergeNode           from "./components/nodes/MergeNode";
import ApprovalNode        from "./components/nodes/ApprovalNode";

// Config Panels — new utility nodes
import FilterArrayNode  from "./components/nodes/FilterArrayNode";
import SortArrayNode    from "./components/nodes/SortArrayNode";
import DeduplicateNode  from "./components/nodes/DeduplicateNode";
import BatchSplitNode   from "./components/nodes/BatchSplitNode";
import CSVParserNode    from "./components/nodes/CSVParserNode";
import DateTimeNode     from "./components/nodes/DateTimeNode";
import CryptoUtilsNode  from "./components/nodes/CryptoUtilsNode";

// Config Panels — new AI specialty nodes
import AIClassifyNode   from "./components/nodes/AIClassifyNode";
import AIExtractNode    from "./components/nodes/AIExtractNode";
import AITransformNode  from "./components/nodes/AITransformNode";

// Config Panels — new integrations
import GithubNode          from "./components/nodes/GithubNode";
import StripeNode          from "./components/nodes/StripeNode";
import PostgresNode        from "./components/nodes/PostgresNode";
import JiraNode            from "./components/nodes/JiraNode";
import LinearNode          from "./components/nodes/LinearNode";
import GoogleCalendarNode  from "./components/nodes/GoogleCalendarNode";
import GoogleDriveNode     from "./components/nodes/GoogleDriveNode";
import HubSpotNode         from "./components/nodes/HubSpotNode";
import ShopifyNode         from "./components/nodes/ShopifyNode";
import TwitterNode         from "./components/nodes/TwitterNode";

// OpenAI-compatible providers
const PerplexityNode = makeOpenAICompatNode({
  label: "Perplexity", accent: "cyan", subtitle: "Search-augmented AI",
  models: [
    { value: "llama-3-sonar-large-32k-online", label: "Sonar Large 32K" },
    { value: "llama-3-sonar-small-32k-chat",   label: "Sonar Small 32K" },
  ],
  defaultModel: "llama-3-sonar-large-32k-online",
});
const XAINode = makeOpenAICompatNode({
  label: "xAI (Grok)", accent: "zinc", subtitle: "Grok models by xAI",
  models: [
    { value: "grok-beta", label: "Grok Beta" },
    { value: "grok-2",    label: "Grok 2" },
  ],
  defaultModel: "grok-beta",
});

// Category Definitions (ordered for sidebar)
export const CATEGORIES = [
  { id: "trigger",     label: "Triggers",      icon: Zap },
  { id: "ai",          label: "AI Models",     icon: Bot },
  { id: "ai_tools",    label: "AI Tools",      icon: Wand2 },
  { id: "data",        label: "Data & APIs",   icon: Globe },
  { id: "transform",   label: "Transform",     icon: Filter },
  { id: "research",    label: "Research",      icon: Search },
  { id: "flow",        label: "Logic & Flow",  icon: GitBranch },
  { id: "code",        label: "Code",          icon: Code2 },
  { id: "integration", label: "Integrations",  icon: Database },
  { id: "devtools",    label: "Dev Tools",     icon: Github },
  { id: "payments",    label: "Payments",      icon: CreditCard },
  { id: "crm",         label: "CRM & Commerce",icon: Users },
  { id: "social",      label: "Social Media",  icon: Twitter },
];

export const NodeRegistry = {
  // Triggers
  manual: {
    label: "Manual Trigger", icon: MousePointerClick, colorClass: "text-green-400",
    accentColor: "34,197,94", ConfigPanel: TriggerNode, category: "trigger",
  },
  webhook: {
    label: "Webhook Trigger", icon: Webhook, colorClass: "text-blue-400",
    accentColor: "59,130,246", ConfigPanel: WebhookTriggerNode, category: "trigger",
  },
  cron_trigger: {
    label: "Schedule Trigger", icon: Clock, colorClass: "text-amber-400",
    accentColor: "251,191,36", ConfigPanel: ScheduleTriggerNode, category: "trigger",
  },
  github_trigger: {
    label: "GitHub Trigger", icon: Github, colorClass: "text-zinc-200", accentColor: "244,244,245",
    ConfigPanel: GitHubTriggerNode, category: "trigger",
  },
  stripe_trigger: {
    label: "Stripe Trigger", icon: CreditCard, colorClass: "text-[#635BFF]", accentColor: "99,91,255",
    ConfigPanel: StripeTriggerNode, category: "trigger",
  },
  telegram_trigger: {
    label: "Telegram Trigger", icon: Brain, colorClass: "text-[#26A5E4]", accentColor: "38,165,228",
    logoUrl: imgTelegram, ConfigPanel: TelegramTriggerNode, category: "trigger",
  },
  slack_trigger: {
    label: "Slack Trigger", icon: Brain, colorClass: "text-[#E01E5A]", accentColor: "224,30,90",
    logoUrl: imgSlack, ConfigPanel: SlackTriggerNode, category: "trigger",
  },
  discord_trigger: {
    label: "Discord Trigger", icon: Brain, colorClass: "text-[#5865F2]", accentColor: "88,101,242",
    logoUrl: imgDiscord, ConfigPanel: DiscordTriggerNode, category: "trigger",
  },
  gmail_trigger: {
    label: "Gmail Trigger", icon: Brain, colorClass: "text-[#EA4335]", accentColor: "234,67,53",
    logoUrl: imgGmail, ConfigPanel: GmailTriggerNode, category: "trigger",
  },
  airtable_trigger: {
    label: "Airtable Trigger", icon: Brain, colorClass: "text-[#F65858]", accentColor: "246,88,88",
    logoUrl: imgAirtable, ConfigPanel: AirtableTriggerNode, category: "trigger",
  },
  notion_trigger: {
    label: "Notion Trigger", icon: Brain, colorClass: "text-white", accentColor: "255,255,255",
    logoUrl: imgNotion, ConfigPanel: NotionTriggerNode, category: "trigger",
  },
  hubspot_trigger: {
    label: "HubSpot Trigger", icon: Users, colorClass: "text-[#FF7A59]", accentColor: "255,122,89",
    ConfigPanel: HubSpotTriggerNode, category: "trigger",
  },
  shopify_trigger: {
    label: "Shopify Trigger", icon: ShoppingBag, colorClass: "text-[#95BF47]", accentColor: "149,191,71",
    ConfigPanel: ShopifyTriggerNode, category: "trigger",
  },
  linear_trigger: {
    label: "Linear Trigger", icon: Circle, colorClass: "text-[#5E6AD2]", accentColor: "94,106,210",
    ConfigPanel: LinearTriggerNode, category: "trigger",
  },
  typeform_trigger: {
    label: "Typeform Trigger", icon: FileText, colorClass: "text-zinc-300", accentColor: "212,212,216",
    ConfigPanel: TypeformTriggerNode, category: "trigger",
  },
  whatsapp_trigger: {
    label: "WhatsApp Trigger", icon: Brain, colorClass: "text-[#25D366]", accentColor: "37,211,102",
    logoUrl: imgWhatsApp, ConfigPanel: WhatsAppTriggerNode, category: "trigger",
  },

  // AI Models
  openai: {
    label: "OpenAI", icon: Brain, colorClass: "text-[#10A37F]", accentColor: "16,163,127",
    logoUrl: imgOpenAI, ConfigPanel: OpenAINode, category: "ai",
  },
  anthropic: {
    label: "Anthropic", icon: Brain, colorClass: "text-[#D4C1B3]", accentColor: "212,193,179",
    logoUrl: imgAnthropic, ConfigPanel: AnthropicNode, category: "ai",
  },
  gemini: {
    label: "Google Gemini", icon: Brain, colorClass: "text-[#4285F4]", accentColor: "66,133,244",
    logoUrl: imgGemini, ConfigPanel: GeminiNode, category: "ai",
  },
  perplexity: {
    label: "Perplexity", icon: Brain, colorClass: "text-[#22d3ee]", accentColor: "34,211,238",
    logoUrl: imgPerplexity, ConfigPanel: PerplexityNode, category: "ai",
  },
  xai: {
    label: "xAI (Grok)", icon: Sparkles, colorClass: "text-zinc-100", accentColor: "244,244,245",
    logoUrl: imgGrok, ConfigPanel: XAINode, category: "ai",
  },
  deepseek: {
    label: "DeepSeek", icon: Brain, colorClass: "text-[#4D9BF8]", accentColor: "77,155,248",
    logoUrl: imgDeepSeek, ConfigPanel: DeepSeekNode, category: "ai",
  },
  ai_agent: {
    label: "AI Agent", icon: Bot, colorClass: "text-violet-400", accentColor: "139,92,246",
    ConfigPanel: AIAgentNode, category: "ai",
  },

  // AI Tools (specialty)
  ai_classify: {
    label: "AI Classify", icon: Tags, colorClass: "text-violet-400", accentColor: "139,92,246",
    ConfigPanel: AIClassifyNode, category: "ai_tools",
  },
  ai_extract: {
    label: "AI Extract", icon: Scissors, colorClass: "text-sky-400", accentColor: "56,189,248",
    ConfigPanel: AIExtractNode, category: "ai_tools",
  },
  ai_transform: {
    label: "AI Transform", icon: Wand2, colorClass: "text-fuchsia-400", accentColor: "232,121,249",
    ConfigPanel: AITransformNode, category: "ai_tools",
  },

  // Data & APIs
  http_request: {
    label: "HTTP Request", icon: Globe, colorClass: "text-blue-400", accentColor: "59,130,246",
    logoUrl: imgHTTP, ConfigPanel: HttpRequestNode, category: "data",
  },
  postgres: {
    label: "PostgreSQL", icon: Server, colorClass: "text-[#5B9BD5]", accentColor: "91,155,213",
    ConfigPanel: PostgresNode, category: "data",
  },

  // Transform (array/data manipulation)
  filter_array: {
    label: "Filter Array", icon: Filter, colorClass: "text-pink-400", accentColor: "244,114,182",
    ConfigPanel: FilterArrayNode, category: "transform",
  },
  sort_array: {
    label: "Sort Array", icon: ArrowUpDown, colorClass: "text-cyan-400", accentColor: "34,211,238",
    ConfigPanel: SortArrayNode, category: "transform",
  },
  deduplicate: {
    label: "Deduplicate", icon: Layers, colorClass: "text-violet-400", accentColor: "139,92,246",
    ConfigPanel: DeduplicateNode, category: "transform",
  },
  batch_split: {
    label: "Batch Split", icon: LayoutGrid, colorClass: "text-orange-400", accentColor: "251,146,60",
    ConfigPanel: BatchSplitNode, category: "transform",
  },
  csv_parser: {
    label: "CSV Parser", icon: FileText, colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: CSVParserNode, category: "transform",
  },
  date_time: {
    label: "Date / Time", icon: Calendar, colorClass: "text-amber-400", accentColor: "251,191,36",
    ConfigPanel: DateTimeNode, category: "transform",
  },
  crypto_utils: {
    label: "Crypto Utils", icon: Shield, colorClass: "text-red-400", accentColor: "248,113,113",
    ConfigPanel: CryptoUtilsNode, category: "transform",
  },
  data_mapper: {
    label: "Data Mapper", icon: Database, colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: DataMapperNode, category: "transform",
  },

  // Research
  web_scraper: {
    label: "Web Scraper", icon: Search, colorClass: "text-purple-400", accentColor: "168,85,247",
    logoUrl: imgComputer, imgFilter: "brightness(0) invert(1)", ConfigPanel: InformerNode, category: "research",
  },
  web_search: {
    label: "Web Search", icon: Globe, colorClass: "text-indigo-400", accentColor: "129,140,248",
    ConfigPanel: WebSearchNode, category: "research",
  },

  // Logic & Flow
  logic_router: {
    label: "Logic Router", icon: GitBranch, colorClass: "text-pink-400", accentColor: "236,72,153",
    ConfigPanel: LogicRouterNode, category: "flow",
  },
  delay: {
    label: "Delay", icon: Hourglass, colorClass: "text-orange-400", accentColor: "251,146,60",
    ConfigPanel: DelayNode, category: "flow",
  },
  loop: {
    label: "Loop", icon: Repeat, colorClass: "text-amber-400", accentColor: "251,191,36",
    ConfigPanel: LoopNode, category: "flow",
  },
  merge: {
    label: "Merge", icon: Merge, colorClass: "text-teal-400", accentColor: "45,212,191",
    ConfigPanel: MergeNode, category: "flow",
  },
  approval: {
    label: "Approval Gate", icon: CheckSquare, colorClass: "text-yellow-400", accentColor: "250,204,21",
    ConfigPanel: ApprovalNode, category: "flow",
  },

  // Code
  code: {
    label: "Run Code", icon: Code2, colorClass: "text-lime-400", accentColor: "163,230,53",
    logoUrl: imgCode, ConfigPanel: CodeNode, category: "code",
  },

  // Integrations (comms)
  telegram: {
    label: "Telegram", icon: Brain, colorClass: "text-[#26A5E4]", accentColor: "38,165,228",
    logoUrl: imgTelegram, ConfigPanel: TelegramNode, category: "integration",
  },
  whatsapp: {
    label: "WhatsApp", icon: Brain, colorClass: "text-[#25D366]", accentColor: "37,211,102",
    logoUrl: imgWhatsApp, ConfigPanel: WhatsAppNode, category: "integration",
  },
  slack: {
    label: "Slack", icon: Brain, colorClass: "text-[#E01E5A]", accentColor: "224,30,90",
    logoUrl: imgSlack, ConfigPanel: SlackNode, category: "integration",
  },
  discord: {
    label: "Discord", icon: Brain, colorClass: "text-[#5865F2]", accentColor: "88,101,242",
    logoUrl: imgDiscord, ConfigPanel: DiscordNode, category: "integration",
  },
  gmail: {
    label: "Gmail", icon: Brain, colorClass: "text-[#EA4335]", accentColor: "234,67,53",
    logoUrl: imgGmail, ConfigPanel: GmailNode, category: "integration",
  },
  twilio: {
    label: "Twilio", icon: Brain, colorClass: "text-[#F22F46]", accentColor: "242,47,70",
    logoUrl: imgTwilio, ConfigPanel: TwilioNode, category: "integration",
  },
  sendgrid: {
    label: "SendGrid", icon: Brain, colorClass: "text-[#1A82E2]", accentColor: "26,130,226",
    logoUrl: imgSendGrid, ConfigPanel: SendGridNode, category: "integration",
  },
  airtable: {
    label: "Airtable", icon: Brain, colorClass: "text-[#F65858]", accentColor: "246,88,88",
    logoUrl: imgAirtable, ConfigPanel: AirtableNode, category: "integration",
  },
  google_sheets: {
    label: "Google Sheets", icon: Brain, colorClass: "text-[#0F9D58]", accentColor: "15,157,88",
    ConfigPanel: GoogleSheetsNode, category: "integration",
  },
  notion: {
    label: "Notion", icon: Brain, colorClass: "text-white", accentColor: "255,255,255",
    logoUrl: imgNotion, ConfigPanel: NotionNode, category: "integration",
  },

  // Google Workspace
  google_calendar: {
    label: "Google Calendar", icon: Calendar, colorClass: "text-[#4285F4]", accentColor: "66,133,244",
    ConfigPanel: GoogleCalendarNode, category: "integration",
  },
  google_drive: {
    label: "Google Drive", icon: Database, colorClass: "text-[#FBBC04]", accentColor: "251,188,4",
    ConfigPanel: GoogleDriveNode, category: "integration",
  },

  // Developer Tools
  github: {
    label: "GitHub", icon: Github, colorClass: "text-zinc-200", accentColor: "244,244,245",
    ConfigPanel: GithubNode, category: "devtools",
  },
  jira: {
    label: "Jira", icon: Ticket, colorClass: "text-[#2684FF]", accentColor: "38,132,255",
    ConfigPanel: JiraNode, category: "devtools",
  },
  linear: {
    label: "Linear", icon: Circle, colorClass: "text-[#5E6AD2]", accentColor: "94,106,210",
    ConfigPanel: LinearNode, category: "devtools",
  },

  // Payments
  stripe: {
    label: "Stripe", icon: CreditCard, colorClass: "text-[#635BFF]", accentColor: "99,91,255",
    ConfigPanel: StripeNode, category: "payments",
  },

  // CRM & E-commerce
  hubspot: {
    label: "HubSpot", icon: Users, colorClass: "text-[#FF7A59]", accentColor: "255,122,89",
    ConfigPanel: HubSpotNode, category: "crm",
  },
  shopify: {
    label: "Shopify", icon: ShoppingBag, colorClass: "text-[#95BF47]", accentColor: "149,191,71",
    ConfigPanel: ShopifyNode, category: "crm",
  },

  // Social Media
  twitter: {
    label: "Twitter / X", icon: Twitter, colorClass: "text-[#1DA1F2]", accentColor: "29,161,242",
    ConfigPanel: TwitterNode, category: "social",
  },
};
