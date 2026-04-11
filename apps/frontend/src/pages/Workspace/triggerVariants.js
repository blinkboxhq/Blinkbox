import {
  MousePointerClick,
  Clock,
  Webhook,
  MessageSquare,
  Mail,
  AlertTriangle,
  Rss,
  Inbox,
  Database,
  Github,
  CreditCard,
} from "lucide-react";

import TriggerNode from "./components/nodes/TriggerNode";
import WebhookTriggerNode from "./components/nodes/WebhookTriggerNode";
import ScheduleTriggerNode from "./components/nodes/ScheduleTriggerNode";
import ChatTriggerNode from "./components/nodes/ChatTriggerNode";
import EmailTriggerNode from "./components/nodes/EmailTriggerNode";
import ErrorTriggerNode from "./components/nodes/ErrorTriggerNode";
import RssTriggerNode from "./components/nodes/RssTriggerNode";
import ImapTriggerNode from "./components/nodes/ImapTriggerNode";
import DatabaseTriggerNode from "./components/nodes/DatabaseTriggerNode";
import GitHubTriggerNode from "./components/nodes/GitHubTriggerNode";
import StripeTriggerNode from "./components/nodes/StripeTriggerNode";

export const TRIGGER_VARIANTS = {
  manual: {
    backendType: "manual",
    icon: MousePointerClick,
    label: "Trigger Manually",
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    ConfigPanel: TriggerNode,
  },
  cron: {
    backendType: "cron_trigger",
    icon: Clock,
    label: "On a Schedule",
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: ScheduleTriggerNode,
  },
  webhook: {
    backendType: "webhook",
    icon: Webhook,
    label: "On Webhook Call",
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: WebhookTriggerNode,
  },
  chat: {
    backendType: "webhook",
    icon: MessageSquare,
    label: "On Chat Message",
    colorClass: "text-pink-400",
    accentColor: "236,72,153",
    ConfigPanel: ChatTriggerNode,
  },
  email: {
    backendType: "webhook",
    icon: Mail,
    label: "On Email Received",
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    ConfigPanel: EmailTriggerNode,
  },
  error: {
    backendType: "error_trigger",
    icon: AlertTriangle,
    label: "On Workflow Error",
    colorClass: "text-red-400",
    accentColor: "239,68,68",
    ConfigPanel: ErrorTriggerNode,
  },
  rss: {
    backendType: "rss_trigger",
    icon: Rss,
    label: "On RSS / Atom Update",
    colorClass: "text-orange-400",
    accentColor: "249,115,22",
    ConfigPanel: RssTriggerNode,
  },
  imap: {
    backendType: "imap_trigger",
    icon: Inbox,
    label: "On Email in Inbox",
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: ImapTriggerNode,
  },
  database: {
    backendType: "db_trigger",
    icon: Database,
    label: "On Database Row",
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: DatabaseTriggerNode,
  },
  github: {
    backendType: "github_trigger",
    icon: Github,
    label: "On GitHub Event",
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    ConfigPanel: GitHubTriggerNode,
  },
  stripe: {
    backendType: "stripe_trigger",
    icon: CreditCard,
    label: "On Stripe Event",
    colorClass: "text-indigo-400",
    accentColor: "99,102,241",
    ConfigPanel: StripeTriggerNode,
  },
};
