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
  Compass,
} from "lucide-react";

// ── Brand Logos (react-icons/si = Simple Icons) ──────────────────────────
import {
  SiSlack,
  SiDiscord,
  SiStripe,
  SiOpenai,
  SiTelegram,
  SiWhatsapp,
  SiAirtable,
  SiGooglegemini,
  SiAnthropic,
} from "react-icons/si";

// ── UI Components ─────────────────────────────────────────────────────────
import TriggerNode from "./components/nodes/TriggerNode";
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
import StripeNode from "./components/nodes/StripeNode";
import OpenAINode from "./components/nodes/OpenAINode";
import AnthropicNode from "./components/nodes/AnthropicNode";
import GeminiNode from "./components/nodes/GeminiNode";
import DeepSeekNode from "./components/nodes/DeepSeekNode";
import TelegramNode from "./components/nodes/TelegramNode";
import WhatsAppNode from "./components/nodes/WhatsAppNode";
import AirtableNode from "./components/nodes/AirtableNode";
import WebSearchNode from "./components/nodes/WebSearchNode";

// ── Category Definitions (ordered for sidebar) ───────────────────────────
export const CATEGORIES = [
  { id: "trigger", label: "Triggers", icon: Zap },
  { id: "ai", label: "AI Models", icon: Bot },
  { id: "data", label: "Data & APIs", icon: Globe },
  { id: "research", label: "Research", icon: Search },
  { id: "flow", label: "Logic & Flow", icon: GitBranch },
  { id: "code", label: "Code", icon: Code2 },
  { id: "integration", label: "Integrations", icon: Database },
];

export const NodeRegistry = {
  // ── Triggers ─────────────────────────────────────────────────────────────
  manual: {
    label: "Manual Trigger",
    icon: Zap,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    ConfigPanel: TriggerNode,
    category: "trigger",
  },
  webhook: {
    label: "Webhook Trigger",
    icon: Zap,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    ConfigPanel: TriggerNode,
    category: "trigger",
  },
  cron_trigger: {
    label: "Schedule (Cron)",
    icon: Hourglass,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    ConfigPanel: null,
    category: "trigger",
  },

  // ── AI Hub ───────────────────────────────────────────────────────────────
  openai: {
    label: "OpenAI",
    icon: SiOpenai,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: OpenAINode,
    category: "ai",
  },
  anthropic: {
    label: "Anthropic",
    icon: SiAnthropic,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    ConfigPanel: AnthropicNode,
    category: "ai",
  },
  gemini: {
    label: "Google Gemini",
    icon: SiGooglegemini,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-blue-400",
    accentColor: "96,165,250",
    ConfigPanel: GeminiNode,
    category: "ai",
  },
  deepseek: {
    label: "DeepSeek",
    icon: Compass,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: DeepSeekNode,
    category: "ai",
  },
  ai_agent: {
    label: "AI Agent",
    icon: Bot,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    ConfigPanel: AIAgentNode,
    category: "ai",
  },

  // ── Data & APIs ──────────────────────────────────────────────────────────
  http_request: {
    label: "HTTP Request",
    icon: Globe,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: HttpRequestNode,
    category: "data",
  },

  // ── Research ─────────────────────────────────────────────────────────────
  web_scraper: {
    label: "Web Scraper",
    icon: Search,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-purple-400",
    accentColor: "168,85,247",
    ConfigPanel: InformerNode,
    category: "research",
  },
  web_search: {
    label: "Web Search",
    icon: Globe,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-indigo-400",
    accentColor: "129,140,248",
    ConfigPanel: WebSearchNode,
    category: "research",
  },

  // ── Logic & Flow ──────────────────────────────────────────────────────────
  logic_router: {
    label: "Logic Router",
    icon: GitBranch,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-pink-400",
    accentColor: "236,72,153",
    ConfigPanel: LogicRouterNode,
    category: "flow",
  },
  data_mapper: {
    label: "Data Mapper",
    icon: Database,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: DataMapperNode,
    category: "flow",
  },
  delay: {
    label: "Delay",
    icon: Hourglass,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    ConfigPanel: DelayNode,
    category: "flow",
  },
  loop: {
    label: "Loop",
    icon: Repeat,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: LoopNode,
    category: "flow",
  },

  // ── Code ──────────────────────────────────────────────────────────────────
  code: {
    label: "Run Code",
    icon: Code2,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-lime-400",
    accentColor: "163,230,53",
    ConfigPanel: CodeNode,
    category: "code",
  },

  // ── Integrations ──────────────────────────────────────────────────────────
  telegram: {
    label: "Telegram",
    icon: SiTelegram,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    ConfigPanel: TelegramNode,
    category: "integration",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: SiWhatsapp,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#25D366]",
    accentColor: "37,211,102",
    ConfigPanel: WhatsAppNode,
    category: "integration",
  },
  slack: {
    label: "Slack",
    icon: SiSlack,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    ConfigPanel: SlackNode,
    category: "integration",
  },
  discord: {
    label: "Discord",
    icon: SiDiscord,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    ConfigPanel: DiscordNode,
    category: "integration",
  },
  stripe: {
    label: "Stripe",
    icon: SiStripe,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#635BFF]",
    accentColor: "99,91,255",
    ConfigPanel: StripeNode,
    category: "integration",
  },
  airtable: {
    label: "Airtable",
    icon: SiAirtable,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#18BFFF]",
    accentColor: "24,191,255",
    ConfigPanel: AirtableNode,
    category: "integration",
  },
};
