import {
  Zap,
  Globe,
  Hourglass,
  Mail,
  Search,
  Database,
  Merge,
  SendHorizonal,
  Bot,
  GitBranch,
} from "lucide-react";

// ── UI Components ─────────────────────────────────────────────────────────
import TriggerNode from "./components/nodes/TriggerNode";
import HttpRequestNode from "./components/nodes/HttpRequestNode";
import DelayNode from "./components/nodes/Delaynode";
import SendEmailNode from "./components/nodes/SendEmailNode";
import InformerNode from "./components/nodes/InformerNode";
import AIAgentNode from "./components/nodes/AIAgentNode";
import DataMapperNode from "./components/nodes/DataMapperNode";
import LogicRouterNode from "./components/nodes/LogicRouterNode";
import MergeNode from "./components/nodes/MergeNode";
import RespondWebhookNode from "./components/nodes/RespondWebhookNode";

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
  advanced_scraper: {
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
  merge: {
    label: "Merge Branches",
    icon: Merge,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-teal-400",
    accentColor: "45,212,191",
    ConfigPanel: MergeNode,
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

  // ── Action ─────────────────────────────────────────────────────────
  send_email: {
    label: "Send Email",
    icon: Mail,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: SendEmailNode,
    category: "action",
  },
  respond_webhook: {
    label: "Respond to Webhook",
    icon: SendHorizonal,
    bgClass: "bg-zinc-800/60",
    colorClass: "text-sky-400",
    accentColor: "56,189,248",
    ConfigPanel: RespondWebhookNode,
    category: "action",
  },
};
