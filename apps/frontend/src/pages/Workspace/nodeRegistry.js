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
  Router,
  Cpu,
  Flame,
  Bolt,
  Server,
  Cloud,
  CircuitBoard,
  Sparkles,
  Brain,
  MousePointerClick,
  Webhook,
  Clock,
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
  SiPerplexity,
  SiOllama,
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
import StripeNode from "./components/nodes/StripeNode";
import OpenAINode from "./components/nodes/OpenAINode";
import AnthropicNode from "./components/nodes/AnthropicNode";
import GeminiNode from "./components/nodes/GeminiNode";
import DeepSeekNode from "./components/nodes/DeepSeekNode";
import TelegramNode from "./components/nodes/TelegramNode";
import WhatsAppNode from "./components/nodes/WhatsAppNode";
import AirtableNode from "./components/nodes/AirtableNode";
import WebSearchNode from "./components/nodes/WebSearchNode";
import makeOpenAICompatNode from "./components/nodes/OpenAICompatNode";

// ── Memory Nodes ─────────────────────────────────────────────────────────
import WindowBufferMemoryNode from "./components/nodes/WindowBufferMemoryNode";
import RedisMemoryNode from "./components/nodes/RedisMemoryNode";
import PostgresMemoryNode from "./components/nodes/PostgresMemoryNode";
import VectorMemoryNode from "./components/nodes/VectorMemoryNode";
import Mem0Node from "./components/nodes/Mem0Node";

// ── Generated Config Panels for OpenAI-Compatible Providers ─────────────
const OpenRouterNode = makeOpenAICompatNode({
  label: "OpenRouter", accent: "blue", subtitle: "100+ models via unified API",
  models: [
    { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
    { value: "liquid/lfm-40b", label: "LFM 40B" },
  ],
  defaultModel: "anthropic/claude-3.5-sonnet",
});
const TogetherNode = makeOpenAICompatNode({
  label: "Together AI", accent: "sky", subtitle: "Fast open-source inference",
  models: [
    { value: "meta-llama/Llama-3-70b-chat-hf", label: "Llama 3 70B" },
    { value: "mistralai/Mixtral-8x7B-Instruct-v0.1", label: "Mixtral 8x7B" },
  ],
  defaultModel: "meta-llama/Llama-3-70b-chat-hf",
});
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
const FireworksNode = makeOpenAICompatNode({
  label: "Fireworks AI", accent: "rose", subtitle: "Blazing-fast inference",
  models: [
    { value: "accounts/fireworks/models/firefunction-v2", label: "FireFunction v2" },
    { value: "accounts/fireworks/models/llama-v3-70b-instruct", label: "Llama 3 70B" },
  ],
  defaultModel: "accounts/fireworks/models/firefunction-v2",
});
const CerebrasNode = makeOpenAICompatNode({
  label: "Cerebras", accent: "orange", subtitle: "Ultra-fast wafer-scale inference",
  models: [
    { value: "llama3.1-70b", label: "Llama 3.1 70B" },
    { value: "llama3.1-8b", label: "Llama 3.1 8B" },
  ],
  defaultModel: "llama3.1-70b",
});
const OllamaNode = makeOpenAICompatNode({
  label: "Ollama (Local)", accent: "slate", subtitle: "Local models — no API key",
  models: [
    { value: "llama3", label: "Llama 3" },
    { value: "mistral", label: "Mistral" },
    { value: "gemma", label: "Gemma" },
  ],
  defaultModel: "llama3",
});
const NovitaNode = makeOpenAICompatNode({
  label: "Novita AI", accent: "violet", subtitle: "Affordable GPU inference",
  models: [
    { value: "meta-llama/llama-3-70b-instruct", label: "Llama 3 70B" },
  ],
  defaultModel: "meta-llama/llama-3-70b-instruct",
});
const DeepInfraNode = makeOpenAICompatNode({
  label: "DeepInfra", accent: "emerald", subtitle: "Serverless open models",
  models: [
    { value: "meta-llama/Meta-Llama-3-70B-Instruct", label: "Llama 3 70B" },
  ],
  defaultModel: "meta-llama/Meta-Llama-3-70B-Instruct",
});
const HyperbolicNode = makeOpenAICompatNode({
  label: "Hyperbolic", accent: "amber", subtitle: "Decentralized GPU inference",
  models: [
    { value: "meta-llama/Meta-Llama-3-70B-Instruct", label: "Llama 3 70B" },
  ],
  defaultModel: "meta-llama/Meta-Llama-3-70B-Instruct",
});

// ── Category Definitions (ordered for sidebar) ───────────────────────────
export const CATEGORIES = [
  { id: "trigger", label: "Triggers", icon: Zap },
  { id: "ai", label: "AI Models", icon: Bot },
  { id: "data", label: "Data & APIs", icon: Globe },
  { id: "research", label: "Research", icon: Search },
  { id: "flow", label: "Logic & Flow", icon: GitBranch },
  { id: "code", label: "Code", icon: Code2 },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "integration", label: "Integrations", icon: Database },
];

// ── Logo URL helper (Simple Icons CDN) ─────────────────────────────────
const siLogo = (slug, color) =>
  `https://cdn.simpleicons.org/${slug}/${color || "white"}`;

export const NodeRegistry = {
  // ── Triggers ─────────────────────────────────────────────────────────────
  manual: {
    label: "Manual Trigger",
    icon: MousePointerClick,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    ConfigPanel: TriggerNode,
    category: "trigger",
  },
  webhook: {
    label: "Webhook Trigger",
    icon: Webhook,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: WebhookTriggerNode,
    category: "trigger",
  },
  cron_trigger: {
    label: "Schedule Trigger",
    icon: Clock,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: ScheduleTriggerNode,
    category: "trigger",
  },

  // ── AI Hub ───────────────────────────────────────────────────────────────
  openai: {
    label: "OpenAI",
    icon: SiOpenai,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#10A37F]",
    accentColor: "16,163,127",
    logoUrl: siLogo("openai", "10A37F"),
    ConfigPanel: OpenAINode,
    category: "ai",
  },
  anthropic: {
    label: "Anthropic",
    icon: SiAnthropic,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#D4C1B3]",
    accentColor: "212,193,179",
    logoUrl: siLogo("anthropic", "D4C1B3"),
    ConfigPanel: AnthropicNode,
    category: "ai",
  },
  gemini: {
    label: "Google Gemini",
    icon: SiGooglegemini,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    logoUrl: siLogo("googlegemini", "4285F4"),
    ConfigPanel: GeminiNode,
    category: "ai",
  },
  deepseek: {
    label: "DeepSeek",
    icon: Compass,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    logoUrl: siLogo("deepseek", "22D3EE"),
    ConfigPanel: DeepSeekNode,
    category: "ai",
  },
  openrouter: {
    label: "OpenRouter",
    icon: Router,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#3b82f6]",
    accentColor: "59,130,246",
    ConfigPanel: OpenRouterNode,
    category: "ai",
  },
  together: {
    label: "Together AI",
    icon: Cpu,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#0ea5e9]",
    accentColor: "14,165,233",
    ConfigPanel: TogetherNode,
    category: "ai",
  },
  perplexity: {
    label: "Perplexity",
    icon: SiPerplexity,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#22d3ee]",
    accentColor: "34,211,238",
    logoUrl: siLogo("perplexity", "22D3EE"),
    ConfigPanel: PerplexityNode,
    category: "ai",
  },
  xai: {
    label: "xAI (Grok)",
    icon: Sparkles,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-zinc-100",
    accentColor: "244,244,245",
    ConfigPanel: XAINode,
    category: "ai",
  },
  fireworks: {
    label: "Fireworks AI",
    icon: Flame,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#f43f5e]",
    accentColor: "244,63,94",
    ConfigPanel: FireworksNode,
    category: "ai",
  },
  cerebras: {
    label: "Cerebras",
    icon: CircuitBoard,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#f97316]",
    accentColor: "249,115,22",
    ConfigPanel: CerebrasNode,
    category: "ai",
  },
  ollama: {
    label: "Ollama (Local)",
    icon: SiOllama,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#94a3b8]",
    accentColor: "148,163,184",
    logoUrl: siLogo("ollama", "94A3B8"),
    ConfigPanel: OllamaNode,
    category: "ai",
  },
  novita: {
    label: "Novita AI",
    icon: Cloud,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#8b5cf6]",
    accentColor: "139,92,246",
    ConfigPanel: NovitaNode,
    category: "ai",
  },
  deepinfra: {
    label: "DeepInfra",
    icon: Server,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#10b981]",
    accentColor: "16,185,129",
    ConfigPanel: DeepInfraNode,
    category: "ai",
  },
  hyperbolic: {
    label: "Hyperbolic",
    icon: Bolt,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#fbbf24]",
    accentColor: "251,191,36",
    ConfigPanel: HyperbolicNode,
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

  // ── Memory ───────────────────────────────────────────────────────────────
  window_buffer_memory: {
    label: "Window Buffer",
    icon: Brain,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-purple-400",
    accentColor: "168,85,247",
    ConfigPanel: WindowBufferMemoryNode,
    category: "memory",
  },
  redis_memory: {
    label: "Redis Memory",
    icon: Brain,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-purple-400",
    accentColor: "168,85,247",
    ConfigPanel: RedisMemoryNode,
    category: "memory",
  },
  postgres_memory: {
    label: "Postgres Memory",
    icon: Brain,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-purple-400",
    accentColor: "168,85,247",
    ConfigPanel: PostgresMemoryNode,
    category: "memory",
  },
  vector_memory: {
    label: "Vector Memory",
    icon: Brain,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-purple-400",
    accentColor: "168,85,247",
    ConfigPanel: VectorMemoryNode,
    category: "memory",
  },
  mem0: {
    label: "Mem0",
    icon: Brain,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-purple-400",
    accentColor: "168,85,247",
    ConfigPanel: Mem0Node,
    category: "memory",
  },

  // ── Integrations ──────────────────────────────────────────────────────────
  telegram: {
    label: "Telegram",
    icon: SiTelegram,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    logoUrl: siLogo("telegram", "26A5E4"),
    ConfigPanel: TelegramNode,
    category: "integration",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: SiWhatsapp,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#25D366]",
    accentColor: "37,211,102",
    logoUrl: siLogo("whatsapp", "25D366"),
    ConfigPanel: WhatsAppNode,
    category: "integration",
  },
  slack: {
    label: "Slack",
    icon: SiSlack,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    logoUrl: siLogo("slack", "E01E5A"),
    ConfigPanel: SlackNode,
    category: "integration",
  },
  discord: {
    label: "Discord",
    icon: SiDiscord,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    logoUrl: siLogo("discord", "5865F2"),
    ConfigPanel: DiscordNode,
    category: "integration",
  },
  stripe: {
    label: "Stripe",
    icon: SiStripe,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#635BFF]",
    accentColor: "99,91,255",
    logoUrl: siLogo("stripe", "635BFF"),
    ConfigPanel: StripeNode,
    category: "integration",
  },
  airtable: {
    label: "Airtable",
    icon: SiAirtable,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#F65858]",
    accentColor: "246,88,88",
    logoUrl: siLogo("airtable", "F65858"),
    ConfigPanel: AirtableNode,
    category: "integration",
  },
};
