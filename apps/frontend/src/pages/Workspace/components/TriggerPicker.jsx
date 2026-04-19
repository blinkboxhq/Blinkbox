import { useState } from "react";
import {
  Search,
  MousePointerClick,
  Webhook,
  Clock,
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
  X,
  Youtube,
  TrendingUp,
  MessageSquarePlus,
  Calendar,
} from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

import imgTelegram  from "../../../assets/telegram.png";
import imgSlack     from "../../../assets/slack.png";
import imgDiscord   from "../../../assets/discord.png";
import imgGmail     from "../../../assets/gmail.png";
import imgWhatsApp  from "../../../assets/whatsapp.png";
import imgAirtable  from "../../../assets/Airtable--Streamline-Svg-Logos.svg";
import imgNotion    from "../../../assets/Notion-Logo--Streamline-Radix.svg";

const TRIGGER_OPTIONS = [
  // ── Core ────────────────────────────────────────────────────────────────────
  {
    id: "manual",
    backendType: "manual",
    icon: MousePointerClick,
    label: "Trigger manually",
    description: "Run on demand by clicking a button. Great for testing and one-off tasks.",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    id: "cron",
    backendType: "cron_trigger",
    icon: Clock,
    label: "On a schedule",
    description: "Run every minute, hour, day, or on a custom cron expression.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    id: "webhook",
    backendType: "webhook",
    icon: Webhook,
    label: "On webhook call",
    description: "Run when your URL receives an HTTP request. Works with any app that can POST.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    id: "chat",
    backendType: "webhook",
    icon: MessageSquare,
    label: "On chat message",
    description: "Run when a user sends a message. Wire into AI nodes to build chatbots.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
  // ── Email ───────────────────────────────────────────────────────────────────
  {
    id: "email",
    backendType: "webhook",
    icon: Mail,
    label: "On email received (webhook)",
    description: "Run when an email arrives via Mailgun, SendGrid, Postmark, or Forward Email.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    id: "imap",
    backendType: "imap_trigger",
    icon: Inbox,
    label: "On email in inbox (IMAP)",
    description: "Poll Gmail, Outlook, or any IMAP inbox directly. No external webhook setup.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  // ── Data ────────────────────────────────────────────────────────────────────
  {
    id: "rss",
    backendType: "rss_trigger",
    icon: Rss,
    label: "On RSS / Atom update",
    description: "Poll any RSS or Atom feed. Triggers once per new article or item.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    id: "database",
    backendType: "db_trigger",
    icon: Database,
    label: "On database row",
    description: "Watch a PostgreSQL or MySQL table for new or updated rows.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  // ── Messaging ───────────────────────────────────────────────────────────────
  {
    id: "telegram",
    backendType: "telegram_trigger",
    logoUrl: imgTelegram,
    label: "On Telegram message",
    description: "Fires when your bot receives a message, button press, or other update.",
    color: "text-[#26A5E4]",
    bg: "bg-[#26A5E4]/10",
    border: "border-[#26A5E4]/20",
  },
  {
    id: "slack",
    backendType: "slack_trigger",
    logoUrl: imgSlack,
    label: "On Slack event",
    description: "Message posted, reaction added, user joined channel — any Slack Event API event.",
    color: "text-[#E01E5A]",
    bg: "bg-[#E01E5A]/10",
    border: "border-[#E01E5A]/20",
  },
  {
    id: "discord",
    backendType: "discord_trigger",
    logoUrl: imgDiscord,
    label: "On Discord event",
    description: "Message sent, member joined, reaction added — via Discord webhook or bot gateway.",
    color: "text-[#5865F2]",
    bg: "bg-[#5865F2]/10",
    border: "border-[#5865F2]/20",
  },
  {
    id: "whatsapp",
    backendType: "whatsapp_trigger",
    logoUrl: imgWhatsApp,
    label: "On WhatsApp message",
    description: "Fires when a message arrives on your WhatsApp Business number (Twilio or Meta).",
    color: "text-[#25D366]",
    bg: "bg-[#25D366]/10",
    border: "border-[#25D366]/20",
  },
  // ── Productivity ─────────────────────────────────────────────────────────────
  {
    id: "gmail",
    backendType: "gmail_trigger",
    logoUrl: imgGmail,
    label: "On Gmail email",
    description: "Polls your Gmail inbox for new emails matching an optional query filter.",
    color: "text-[#EA4335]",
    bg: "bg-[#EA4335]/10",
    border: "border-[#EA4335]/20",
  },
  {
    id: "airtable",
    backendType: "airtable_trigger",
    logoUrl: imgAirtable,
    label: "On Airtable record",
    description: "Fires when a new record is created or updated in an Airtable base.",
    color: "text-[#F65858]",
    bg: "bg-[#F65858]/10",
    border: "border-[#F65858]/20",
    imgFilter: "brightness(0) invert(1)",
  },
  {
    id: "notion",
    backendType: "notion_trigger",
    logoUrl: imgNotion,
    label: "On Notion page",
    description: "Polls a Notion database for new or edited pages.",
    color: "text-zinc-200",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    imgFilter: "brightness(0) invert(1)",
  },
  {
    id: "hubspot",
    backendType: "hubspot_trigger",
    icon: Users,
    label: "On HubSpot CRM event",
    description: "New or updated contacts, deals, companies, or tickets in HubSpot CRM.",
    color: "text-[#FF7A59]",
    bg: "bg-[#FF7A59]/10",
    border: "border-[#FF7A59]/20",
  },
  // ── Commerce ─────────────────────────────────────────────────────────────────
  {
    id: "shopify",
    backendType: "shopify_trigger",
    icon: ShoppingBag,
    label: "On Shopify event",
    description: "Order placed, fulfillment shipped, product updated — any Shopify webhook topic.",
    color: "text-[#95BF47]",
    bg: "bg-[#95BF47]/10",
    border: "border-[#95BF47]/20",
  },
  {
    id: "stripe",
    backendType: "stripe_trigger",
    icon: CreditCard,
    label: "On Stripe event",
    description: "Payment succeeded, subscription cancelled — auto-registered on your Stripe account.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
  // ── Dev Tools ────────────────────────────────────────────────────────────────
  {
    id: "github",
    backendType: "github_trigger",
    icon: Github,
    label: "On GitHub event",
    description: "Push, PR, issue, release — BlinkBox registers the webhook for you.",
    color: "text-zinc-300",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
  },
  {
    id: "linear",
    backendType: "linear_trigger",
    icon: Circle,
    label: "On Linear event",
    description: "Issue created, status changed, cycle updated — any Linear webhook event.",
    color: "text-[#5E6AD2]",
    bg: "bg-[#5E6AD2]/10",
    border: "border-[#5E6AD2]/20",
  },
  {
    id: "typeform",
    backendType: "typeform_trigger",
    icon: FileText,
    label: "On Typeform submission",
    description: "Fires every time a respondent submits your Typeform.",
    color: "text-zinc-300",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
  },
  // ── Polling ──────────────────────────────────────────────────────────────────
  {
    id: "youtube",
    backendType: "youtube_trigger",
    icon: Youtube,
    label: "On YouTube video",
    description: "Fires when a channel publishes a new video. Uses YouTube Data API v3.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    id: "price_alert",
    backendType: "price_alert_trigger",
    icon: TrendingUp,
    label: "On crypto price alert",
    description: "Fires when a coin price crosses your threshold (above or below). Powered by CoinGecko.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    id: "reddit",
    backendType: "reddit_trigger",
    icon: MessageSquarePlus,
    label: "On Reddit post",
    description: "Polls a subreddit for new posts. Optional keyword filter. No API key needed.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    id: "google_calendar",
    backendType: "google_calendar_trigger",
    icon: Calendar,
    label: "On Google Calendar event",
    description: "Fires when a calendar event is about to start. Configure minutes-before to get an advance warning.",
    color: "text-[#4285F4]",
    bg: "bg-[#4285F4]/10",
    border: "border-[#4285F4]/20",
  },
  {
    id: "github_issue",
    backendType: "github_issue_trigger",
    icon: Github,
    label: "On GitHub issue / PR",
    description: "Polls a repo for new issues or pull requests. Filter by label or type.",
    color: "text-zinc-300",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
  },
  // ── System ──────────────────────────────────────────────────────────────────
  {
    id: "error",
    backendType: "error_trigger",
    icon: AlertTriangle,
    label: "On workflow error",
    description: "Fires when any workflow in your workspace fails. Build alert & recovery automations.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
];

const GROUPS = [
  { label: "Core",         ids: ["manual", "cron", "webhook", "chat"] },
  { label: "Email",        ids: ["email", "imap"] },
  { label: "Data",         ids: ["rss", "database", "youtube", "price_alert", "reddit"] },
  { label: "Messaging",    ids: ["telegram", "slack", "discord", "whatsapp"] },
  { label: "Productivity", ids: ["gmail", "airtable", "notion", "hubspot", "google_calendar"] },
  { label: "Commerce",     ids: ["shopify", "stripe"] },
  { label: "Dev Tools",    ids: ["github", "linear", "typeform", "github_issue"] },
  { label: "System",       ids: ["error"] },
];

export default function TriggerPicker() {
  const [search, setSearch] = useState("");
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  const filtered = search
    ? TRIGGER_OPTIONS.filter(
        (t) =>
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()),
      )
    : null;

  const handleSelect = (trigger) => {
    const newId = `${trigger.id}-${crypto.randomUUID()}`;
    addNode({
      id: newId,
      type: "custom",
      position: { x: 400, y: 300 },
      data: {
        backendType: trigger.backendType,
        label: trigger.label,
        type: "trigger",
        config: { triggerVariant: trigger.id },
      },
    });
    setTriggerPickerOpen(false);
    setSelectedNodeId(newId);
  };

  const renderTrigger = (trigger) => {
    const Icon = trigger.icon;
    return (
      <button
        key={trigger.id}
        onClick={() => handleSelect(trigger)}
        className="flex items-start gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-800/60 transition-all duration-150 text-left group border border-transparent hover:border-zinc-700/40"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${trigger.bg} ${trigger.border}`}>
          {trigger.logoUrl ? (
            <img
              src={trigger.logoUrl}
              alt={trigger.label}
              className="w-5 h-5 object-contain"
              style={trigger.imgFilter ? { filter: trigger.imgFilter } : undefined}
            />
          ) : (
            <Icon className={`w-4 h-4 ${trigger.color}`} strokeWidth={1.75} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
            {trigger.label}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed group-hover:text-zinc-400 transition-colors">
            {trigger.description}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            What triggers this workflow?
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Choose how this workflow starts
          </p>
        </div>
        <button
          onClick={() => setTriggerPickerOpen(false)}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-6 pb-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-xl focus-within:border-zinc-500 transition-colors">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search triggers..."
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            autoFocus
          />
        </div>
      </div>

      {/* Trigger list */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {filtered !== null ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-600">No triggers found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map(renderTrigger)}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {GROUPS.map(({ label, ids }) => {
              const triggers = ids.map((id) => TRIGGER_OPTIONS.find((t) => t.id === id)).filter(Boolean);
              return (
                <div key={label}>
                  <div className="px-4 pb-1">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {triggers.map(renderTrigger)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
