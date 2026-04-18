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
  ShoppingBag,
  Circle,
  FileText,
  Users,
} from "lucide-react";

import TriggerNode         from "./components/nodes/TriggerNode";
import WebhookTriggerNode  from "./components/nodes/WebhookTriggerNode";
import ScheduleTriggerNode from "./components/nodes/ScheduleTriggerNode";
import ChatTriggerNode     from "./components/nodes/ChatTriggerNode";
import EmailTriggerNode    from "./components/nodes/EmailTriggerNode";
import ErrorTriggerNode    from "./components/nodes/ErrorTriggerNode";
import RssTriggerNode      from "./components/nodes/RssTriggerNode";
import ImapTriggerNode     from "./components/nodes/ImapTriggerNode";
import DatabaseTriggerNode from "./components/nodes/DatabaseTriggerNode";
import GitHubTriggerNode   from "./components/nodes/GitHubTriggerNode";
import StripeTriggerNode   from "./components/nodes/StripeTriggerNode";

// Integration triggers
import TelegramTriggerNode from "./components/nodes/TelegramTriggerNode";
import SlackTriggerNode    from "./components/nodes/SlackTriggerNode";
import DiscordTriggerNode  from "./components/nodes/DiscordTriggerNode";
import GmailTriggerNode    from "./components/nodes/GmailTriggerNode";
import AirtableTriggerNode from "./components/nodes/AirtableTriggerNode";
import NotionTriggerNode   from "./components/nodes/NotionTriggerNode";
import HubSpotTriggerNode  from "./components/nodes/HubSpotTriggerNode";
import ShopifyTriggerNode  from "./components/nodes/ShopifyTriggerNode";
import LinearTriggerNode   from "./components/nodes/LinearTriggerNode";
import TypeformTriggerNode from "./components/nodes/TypeformTriggerNode";
import WhatsAppTriggerNode from "./components/nodes/WhatsAppTriggerNode";

import imgTelegram from "../../assets/telegram.png";
import imgSlack    from "../../assets/slack.png";
import imgDiscord  from "../../assets/discord.png";
import imgGmail    from "../../assets/gmail.png";
import imgWhatsApp from "../../assets/whatsapp.png";
import imgAirtable from "../../assets/Airtable--Streamline-Svg-Logos.svg";
import imgNotion   from "../../assets/Notion-Logo--Streamline-Radix.svg";

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

  // ── Integration triggers ────────────────────────────────────────────────────
  telegram: {
    backendType: "telegram_trigger",
    icon: MessageSquare,
    logoUrl: imgTelegram,
    label: "On Telegram Message",
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    ConfigPanel: TelegramTriggerNode,
  },
  slack: {
    backendType: "slack_trigger",
    icon: MessageSquare,
    logoUrl: imgSlack,
    label: "On Slack Event",
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    ConfigPanel: SlackTriggerNode,
  },
  discord: {
    backendType: "discord_trigger",
    icon: MessageSquare,
    logoUrl: imgDiscord,
    label: "On Discord Event",
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    ConfigPanel: DiscordTriggerNode,
  },
  whatsapp: {
    backendType: "whatsapp_trigger",
    icon: MessageSquare,
    logoUrl: imgWhatsApp,
    label: "On WhatsApp Message",
    colorClass: "text-[#25D366]",
    accentColor: "37,211,102",
    ConfigPanel: WhatsAppTriggerNode,
  },
  gmail: {
    backendType: "gmail_trigger",
    icon: Mail,
    logoUrl: imgGmail,
    label: "On Gmail Email",
    colorClass: "text-[#EA4335]",
    accentColor: "234,67,53",
    ConfigPanel: GmailTriggerNode,
  },
  airtable: {
    backendType: "airtable_trigger",
    icon: Database,
    logoUrl: imgAirtable,
    label: "On Airtable Record",
    colorClass: "text-[#F65858]",
    accentColor: "246,88,88",
    ConfigPanel: AirtableTriggerNode,
  },
  notion: {
    backendType: "notion_trigger",
    icon: Database,
    logoUrl: imgNotion,
    label: "On Notion Page",
    colorClass: "text-zinc-200",
    accentColor: "228,228,231",
    ConfigPanel: NotionTriggerNode,
  },
  hubspot: {
    backendType: "hubspot_trigger",
    icon: Users,
    label: "On HubSpot CRM Event",
    colorClass: "text-[#FF7A59]",
    accentColor: "255,122,89",
    ConfigPanel: HubSpotTriggerNode,
  },
  shopify: {
    backendType: "shopify_trigger",
    icon: ShoppingBag,
    label: "On Shopify Event",
    colorClass: "text-[#95BF47]",
    accentColor: "149,191,71",
    ConfigPanel: ShopifyTriggerNode,
  },
  linear: {
    backendType: "linear_trigger",
    icon: Circle,
    label: "On Linear Event",
    colorClass: "text-[#5E6AD2]",
    accentColor: "94,106,210",
    ConfigPanel: LinearTriggerNode,
  },
  typeform: {
    backendType: "typeform_trigger",
    icon: FileText,
    label: "On Typeform Submission",
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    ConfigPanel: TypeformTriggerNode,
  },
};
