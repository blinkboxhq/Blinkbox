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
} from "lucide-react";

// ── Brand Icons (react-icons/si = Simple Icons) ───────────────────────────
import {
  SiSlack,
  SiDiscord,
  SiOpenai,
  SiTelegram,
  SiWhatsapp,
  SiAirtable,
  SiGooglegemini,
  SiAnthropic,
  SiPerplexity,
  SiGooglesheets,
  SiGmail,
  SiNotion,
  SiTwilio,
  SiSendgrid,
} from "react-icons/si";

// ── UI Components ─────────────────────────────────────────────────────────
import TriggerNode from "./components/nodes/TriggerNode";
import WebhookTriggerNode from "./components/nodes/WebhookTriggerNode";
import ScheduleTriggerNode from "./components/nodes/ScheduleTriggerNode";
import HttpRequestNode from "./components/nodes/HttpRequestNode";
import DelayNode from "./components/nodes/Delaynode";
import InformerNode from "./components/nodes/InformerNode";
import AIAgentNode from "./components/nodes/AIAgentNode";
import DataMapperNode from "./components/nodes/DataMapperNode";
import LogicRouterNode from "./components/nodes/LogicRouterNode";
import CodeNode from "./components/nodes/CodeNode";
import LoopNode from "./components/nodes/LoopNode";
import SlackNode from "./components/nodes/SlackNode";
import DiscordNode from "./components/nodes/DiscordNode";
import OpenAINode from "./components/nodes/OpenAINode";
import AnthropicNode from "./components/nodes/AnthropicNode";
import GeminiNode from "./components/nodes/GeminiNode";
import TelegramNode from "./components/nodes/TelegramNode";
import WhatsAppNode from "./components/nodes/WhatsAppNode";
import AirtableNode from "./components/nodes/AirtableNode";
import WebSearchNode from "./components/nodes/WebSearchNode";
import makeOpenAICompatNode from "./components/nodes/OpenAICompatNode";
import DeepSeekNode from "./components/nodes/DeepSeekNode";
import GoogleSheetsNode from "./components/nodes/GoogleSheetsNode";
import GmailNode from "./components/nodes/GmailNode";
import NotionNode from "./components/nodes/NotionNode";
import TwilioNode from "./components/nodes/TwilioNode";
import SendGridNode from "./components/nodes/SendGridNode";

// ── Generated Config Panels for OpenAI-Compatible Providers ─────────────
const PerplexityNode = makeOpenAICompatNode({
  label: "Perplexity", accent: "cyan", subtitle: "Search-augmented AI",
  models: [
    { value: "llama-3-sonar-large-32k-online", label: "Sonar Large 32K" },
    { value: "llama-3-sonar-small-32k-chat", label: "Sonar Small 32K" },
  ],
  defaultModel: "llama-3-sonar-large-32k-online",
});
const XAINode = makeOpenAICompatNode({
  label: "xAI (Grok)", accent: "zinc", subtitle: "Grok models by xAI",
  models: [
    { value: "grok-beta", label: "Grok Beta" },
    { value: "grok-2", label: "Grok 2" },
  ],
  defaultModel: "grok-beta",
});

// ── Category Definitions (ordered for sidebar) ───────────────────────────
export const CATEGORIES = [
  { id: "trigger",     label: "Triggers",      icon: Zap },
  { id: "ai",          label: "AI Models",     icon: Bot },
  { id: "data",        label: "Data & APIs",   icon: Globe },
  { id: "research",    label: "Research",      icon: Search },
  { id: "flow",        label: "Logic & Flow",  icon: GitBranch },
  { id: "code",        label: "Code",          icon: Code2 },
  { id: "integration", label: "Integrations",  icon: Database },
];

export const NodeRegistry = {
  // ── Triggers ─────────────────────────────────────────────────────────────
  manual: {
    label: "Manual Trigger",
    icon: MousePointerClick,
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    ConfigPanel: TriggerNode,
    category: "trigger",
  },
  webhook: {
    label: "Webhook Trigger",
    icon: Webhook,
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: WebhookTriggerNode,
    category: "trigger",
  },
  cron_trigger: {
    label: "Schedule Trigger",
    icon: Clock,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: ScheduleTriggerNode,
    category: "trigger",
  },

  // ── AI Models ────────────────────────────────────────────────────────────
  openai: {
    label: "OpenAI",
    icon: SiOpenai,
    colorClass: "text-[#10A37F]",
    accentColor: "16,163,127",
    ConfigPanel: OpenAINode,
    category: "ai",
  },
  anthropic: {
    label: "Anthropic",
    icon: SiAnthropic,
    colorClass: "text-[#D4C1B3]",
    accentColor: "212,193,179",
    ConfigPanel: AnthropicNode,
    category: "ai",
  },
  gemini: {
    label: "Google Gemini",
    icon: SiGooglegemini,
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    ConfigPanel: GeminiNode,
    category: "ai",
  },
  perplexity: {
    label: "Perplexity",
    icon: SiPerplexity,
    colorClass: "text-[#22d3ee]",
    accentColor: "34,211,238",
    ConfigPanel: PerplexityNode,
    category: "ai",
  },
  xai: {
    label: "xAI (Grok)",
    icon: Sparkles,
    colorClass: "text-zinc-100",
    accentColor: "244,244,245",
    ConfigPanel: XAINode,
    category: "ai",
  },
  deepseek: {
    label: "DeepSeek",
    icon: Brain,
    colorClass: "text-[#4D9BF8]",
    accentColor: "77,155,248",
    ConfigPanel: DeepSeekNode,
    category: "ai",
  },
  ai_agent: {
    label: "AI Agent",
    icon: Bot,
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    ConfigPanel: AIAgentNode,
    category: "ai",
  },

  // ── Data & APIs ──────────────────────────────────────────────────────────
  http_request: {
    label: "HTTP Request",
    icon: Globe,
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: HttpRequestNode,
    category: "data",
  },

  // ── Research ─────────────────────────────────────────────────────────────
  web_scraper: {
    label: "Web Scraper",
    icon: Search,
    colorClass: "text-purple-400",
    accentColor: "168,85,247",
    ConfigPanel: InformerNode,
    category: "research",
  },
  web_search: {
    label: "Web Search",
    icon: Globe,
    colorClass: "text-indigo-400",
    accentColor: "129,140,248",
    ConfigPanel: WebSearchNode,
    category: "research",
  },

  // ── Logic & Flow ──────────────────────────────────────────────────────────
  logic_router: {
    label: "Logic Router",
    icon: GitBranch,
    colorClass: "text-pink-400",
    accentColor: "236,72,153",
    ConfigPanel: LogicRouterNode,
    category: "flow",
  },
  data_mapper: {
    label: "Data Mapper",
    icon: Database,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: DataMapperNode,
    category: "flow",
  },
  delay: {
    label: "Delay",
    icon: Hourglass,
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    ConfigPanel: DelayNode,
    category: "flow",
  },
  loop: {
    label: "Loop",
    icon: Repeat,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: LoopNode,
    category: "flow",
  },

  // ── Code ──────────────────────────────────────────────────────────────────
  code: {
    label: "Run Code",
    icon: Code2,
    colorClass: "text-lime-400",
    accentColor: "163,230,53",
    ConfigPanel: CodeNode,
    category: "code",
  },

  // ── Integrations ──────────────────────────────────────────────────────────
  telegram: {
    label: "Telegram",
    icon: SiTelegram,
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    ConfigPanel: TelegramNode,
    category: "integration",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: SiWhatsapp,
    colorClass: "text-[#25D366]",
    accentColor: "37,211,102",
    ConfigPanel: WhatsAppNode,
    category: "integration",
  },
  slack: {
    label: "Slack",
    icon: SiSlack,
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    ConfigPanel: SlackNode,
    category: "integration",
  },
  discord: {
    label: "Discord",
    icon: SiDiscord,
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    ConfigPanel: DiscordNode,
    category: "integration",
  },
  airtable: {
    label: "Airtable",
    icon: SiAirtable,
    colorClass: "text-[#F65858]",
    accentColor: "246,88,88",
    ConfigPanel: AirtableNode,
    category: "integration",
  },
  google_sheets: {
    label: "Google Sheets",
    icon: SiGooglesheets,
    colorClass: "text-[#0F9D58]",
    accentColor: "15,157,88",
    ConfigPanel: GoogleSheetsNode,
    category: "integration",
  },
  notion: {
    label: "Notion",
    icon: SiNotion,
    colorClass: "text-white",
    accentColor: "255,255,255",
    ConfigPanel: NotionNode,
    category: "integration",
  },
  gmail: {
    label: "Gmail",
    icon: SiGmail,
    colorClass: "text-[#EA4335]",
    accentColor: "234,67,53",
    ConfigPanel: GmailNode,
    category: "integration",
  },
  twilio: {
    label: "Twilio",
    icon: SiTwilio,
    colorClass: "text-[#F22F46]",
    accentColor: "242,47,70",
    ConfigPanel: TwilioNode,
    category: "integration",
  },
  sendgrid: {
    label: "SendGrid",
    icon: SiSendgrid,
    colorClass: "text-[#1A82E2]",
    accentColor: "26,130,226",
    ConfigPanel: SendGridNode,
    category: "integration",
  },
};
