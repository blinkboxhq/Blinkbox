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
    bgClass: "bg-green-500/10",
    colorClass: "text-green-400",
    ConfigPanel: TriggerNode,
    category: "trigger",
  },
  webhook: {
    label: "Webhook Trigger",
    icon: Zap,
    bgClass: "bg-green-500/10",
    colorClass: "text-green-400",
    ConfigPanel: TriggerNode,
    category: "trigger",
  },
  cron_trigger: {
    label: "Schedule (Cron)",
    icon: Hourglass,
    bgClass: "bg-green-500/10",
    colorClass: "text-green-400",
    ConfigPanel: null,
    category: "trigger",
  },

  // ── Data & AI ────────────────────────────────────────────────────────────
  http_request: {
    label: "HTTP Request",
    icon: Globe,
    bgClass: "bg-blue-500/10",
    colorClass: "text-blue-400",
    ConfigPanel: HttpRequestNode,
    category: "data",
  },
  ai_agent: {
    label: "AI Agent",
    icon: Bot,
    bgClass: "bg-blue-500/10",
    colorClass: "text-blue-400",
    ConfigPanel: AIAgentNode,
    category: "data",
  },
  advanced_scraper: {
    label: "Web Scraper",
    icon: Search,
    bgClass: "bg-purple-500/10",
    colorClass: "text-purple-400",
    ConfigPanel: InformerNode,
    category: "research",
  },

  // ── Logic & Flow ──────────────────────────────────────────────────────────
  logic_router: {
    label: "Logic Router",
    icon: GitBranch,
    bgClass: "bg-pink-500/10",
    colorClass: "text-pink-400",
    ConfigPanel: LogicRouterNode,
    category: "flow",
  },
  data_mapper: {
    label: "Data Mapper",
    icon: Database,
    bgClass: "bg-emerald-500/10",
    colorClass: "text-emerald-400",
    ConfigPanel: DataMapperNode,
    category: "flow",
  },
  merge: {
    label: "Merge Branches",
    icon: Merge,
    bgClass: "bg-teal-500/10",
    colorClass: "text-teal-400",
    ConfigPanel: MergeNode,
    category: "flow",
  },
  delay: {
    label: "Delay",
    icon: Hourglass,
    bgClass: "bg-orange-500/10",
    colorClass: "text-orange-400",
    ConfigPanel: DelayNode,
    category: "flow",
  },

  // ── Action ─────────────────────────────────────────────────────────
  send_email: {
    label: "Send Email",
    icon: Mail,
    bgClass: "bg-cyan-500/10",
    colorClass: "text-cyan-400",
    ConfigPanel: SendEmailNode,
    category: "action",
  },
  respond_webhook: {
    label: "Respond to Webhook",
    icon: SendHorizonal,
    bgClass: "bg-sky-500/10",
    colorClass: "text-sky-400",
    ConfigPanel: RespondWebhookNode,
    category: "action",
  },
};
