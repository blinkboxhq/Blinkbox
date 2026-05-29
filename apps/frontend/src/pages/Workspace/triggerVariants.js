import {
  MousePointerClick,
  Clock,
  Webhook,
  AlertTriangle,
  Github,
  CreditCard,
  ShoppingBag,
  FileText,
  MessageSquare,
  Mail,
  Database,
} from "lucide-react";

import TriggerNode         from "@triggers/manual/ConfigPanel.jsx";
import WebhookTriggerNode  from "@triggers/webhook/ConfigPanel.jsx";
import ScheduleTriggerNode from "@triggers/cron/ConfigPanel.jsx";
import FormTriggerNode     from "@triggers/form/ConfigPanel.jsx";
import ErrorTriggerNode    from "@triggers/error_trigger/ConfigPanel.jsx";
import GitHubTriggerNode   from "@triggers/github/ConfigPanel.jsx";
import StripeTriggerNode   from "@triggers/stripe/ConfigPanel.jsx";
import TelegramTriggerNode from "@triggers/telegram/ConfigPanel.jsx";
import SlackTriggerNode    from "@triggers/slack/ConfigPanel.jsx";
import DiscordTriggerNode  from "@triggers/discord/ConfigPanel.jsx";
import GmailTriggerNode    from "@triggers/gmail/ConfigPanel.jsx";
import AirtableTriggerNode from "@triggers/airtable/ConfigPanel.jsx";
import NotionTriggerNode   from "@triggers/notion/ConfigPanel.jsx";
import ShopifyTriggerNode  from "@triggers/shopify/ConfigPanel.jsx";

import imgWebhookTrigger from "@triggers/webhook/logo.png";
import imgFormTrigger    from "@triggers/form/logo.png";
import imgGitHub         from "@triggers/github/logo.svg";
import imgStripe         from "@triggers/stripe/logo.svg";
import imgTelegram       from "@triggers/telegram/logo.png";
import imgSlack          from "@triggers/slack/logo.png";
import imgDiscord        from "@triggers/discord/logo.png";
import imgGmail          from "@triggers/gmail/logo.png";
import imgAirtable       from "@triggers/airtable/logo.svg";
import imgNotion         from "@triggers/notion/logo.svg";
import imgShopify        from "@triggers/shopify/logo.svg";

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
    logoUrl: imgWebhookTrigger,
    label: "On Webhook Call",
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: WebhookTriggerNode,
  },
  form: {
    backendType: "form_trigger",
    icon: FileText,
    logoUrl: imgFormTrigger,
    label: "On Form Submission",
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    ConfigPanel: FormTriggerNode,
  },
  error: {
    backendType: "error_trigger",
    icon: AlertTriangle,
    label: "On Workflow Error",
    colorClass: "text-red-400",
    accentColor: "239,68,68",
    ConfigPanel: ErrorTriggerNode,
  },
  github: {
    backendType: "github_trigger",
    icon: Github,
    logoUrl: imgGitHub,
    label: "On GitHub Event",
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    ConfigPanel: GitHubTriggerNode,
  },
  stripe: {
    backendType: "stripe_trigger",
    icon: CreditCard,
    logoUrl: imgStripe,
    label: "On Stripe Event",
    colorClass: "text-indigo-400",
    accentColor: "99,102,241",
    ConfigPanel: StripeTriggerNode,
  },
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
  shopify: {
    backendType: "shopify_trigger",
    icon: ShoppingBag,
    logoUrl: imgShopify,
    label: "On Shopify Event",
    colorClass: "text-[#95BF47]",
    accentColor: "149,191,71",
    ConfigPanel: ShopifyTriggerNode,
  },
};
