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
  MessageSquare,
  DollarSign,
} from "lucide-react";

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

  // ── Data & AI ────────────────────────────────────────────────────────────
  http_request: {
    label: "HTTP Request",
    icon: Globe,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: HttpRequestNode,
    category: "data",
  },
  ai_agent: {
    label: "AI Agent",
    icon: Bot,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    ConfigPanel: AIAgentNode,
    category: "data",
  },
  web_scraper: {
    label: "Web Scraper",
    icon: Search,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-purple-400",
    accentColor: "168,85,247",
    ConfigPanel: InformerNode,
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

  // ── Integrations (serialize as http_request under the hood) ─────────────
  slack: {
    label: "Slack",
    icon: MessageSquare,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    ConfigPanel: SlackNode,
    category: "integration",
  },
  discord: {
    label: "Discord",
    icon: MessageSquare,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    ConfigPanel: DiscordNode,
    category: "integration",
  },
  stripe: {
    label: "Stripe",
    icon: DollarSign,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-[#635BFF]",
    accentColor: "99,91,255",
    ConfigPanel: StripeNode,
    category: "integration",
  },
};
