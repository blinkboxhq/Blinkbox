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
  ChevronRight,
  Zap,
} from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

import imgTelegram from "../../../assets/telegram.png";
import imgSlack    from "../../../assets/slack.png";
import imgDiscord  from "../../../assets/discord.png";
import imgGmail    from "../../../assets/gmail.png";
import imgWhatsApp from "../../../assets/whatsapp.png";
import imgAirtable from "../../../assets/Airtable--Streamline-Svg-Logos.svg";
import imgNotion   from "../../../assets/Notion-Logo--Streamline-Radix.svg";

// ── Core triggers (always greyscale) ────────────────────────────────────────
const CORE_TRIGGERS = [
  {
    id: "manual",
    backendType: "manual",
    icon: MousePointerClick,
    label: "Trigger manually",
    description: "Run on demand by clicking a button.",
  },
  {
    id: "cron",
    backendType: "cron_trigger",
    icon: Clock,
    label: "On a schedule",
    description: "Run every minute, hour, day, or on a custom cron.",
  },
  {
    id: "webhook",
    backendType: "webhook",
    icon: Webhook,
    label: "On webhook call",
    description: "Run when your URL receives an HTTP request.",
  },
  {
    id: "chat",
    backendType: "webhook",
    icon: MessageSquare,
    label: "On chat message",
    description: "Run when a user sends a message to your chat endpoint.",
  },
  {
    id: "email",
    backendType: "webhook",
    icon: Mail,
    label: "On email received",
    description: "Via Mailgun, SendGrid, Postmark, or Forward Email.",
  },
  {
    id: "imap",
    backendType: "imap_trigger",
    icon: Inbox,
    label: "On email in inbox (IMAP)",
    description: "Poll Gmail, Outlook, or any IMAP inbox directly.",
  },
  {
    id: "error",
    backendType: "error_trigger",
    icon: AlertTriangle,
    label: "On workflow error",
    description: "Fires when any workflow in your workspace fails.",
  },
];

// ── App triggers (colored logos) ─────────────────────────────────────────────
const APP_TRIGGERS = [
  {
    id: "telegram",
    backendType: "telegram_trigger",
    logoUrl: imgTelegram,
    label: "Telegram",
    description: "Message, button press, or any bot update.",
    color: "#26A5E4",
  },
  {
    id: "slack",
    backendType: "slack_trigger",
    logoUrl: imgSlack,
    label: "Slack",
    description: "Message posted, reaction added, member joined.",
    color: "#E01E5A",
  },
  {
    id: "discord",
    backendType: "discord_trigger",
    logoUrl: imgDiscord,
    label: "Discord",
    description: "Message sent, member joined, reaction added.",
    color: "#5865F2",
  },
  {
    id: "whatsapp",
    backendType: "whatsapp_trigger",
    logoUrl: imgWhatsApp,
    label: "WhatsApp",
    description: "Message arrives on your WhatsApp Business number.",
    color: "#25D366",
  },
  {
    id: "gmail",
    backendType: "gmail_trigger",
    logoUrl: imgGmail,
    label: "Gmail",
    description: "New email matching an optional query filter.",
    color: "#EA4335",
  },
  {
    id: "airtable",
    backendType: "airtable_trigger",
    logoUrl: imgAirtable,
    imgFilter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(500%) hue-rotate(330deg)",
    label: "Airtable",
    description: "New or updated record in an Airtable base.",
    color: "#F65858",
  },
  {
    id: "notion",
    backendType: "notion_trigger",
    logoUrl: imgNotion,
    imgFilter: "brightness(0) invert(1)",
    label: "Notion",
    description: "New or edited page in a Notion database.",
    color: "#ffffff",
  },
  {
    id: "hubspot",
    backendType: "hubspot_trigger",
    icon: Users,
    label: "HubSpot",
    description: "New or updated contacts, deals, companies.",
    color: "#FF7A59",
  },
  {
    id: "google_calendar",
    backendType: "google_calendar_trigger",
    icon: Calendar,
    label: "Google Calendar",
    description: "Calendar event about to start.",
    color: "#4285F4",
  },
  {
    id: "shopify",
    backendType: "shopify_trigger",
    icon: ShoppingBag,
    label: "Shopify",
    description: "Order placed, fulfillment shipped, product updated.",
    color: "#95BF47",
  },
  {
    id: "stripe",
    backendType: "stripe_trigger",
    icon: CreditCard,
    label: "Stripe",
    description: "Payment succeeded, subscription cancelled.",
    color: "#635BFF",
  },
  {
    id: "github",
    backendType: "github_trigger",
    icon: Github,
    label: "GitHub",
    description: "Push, PR, issue, release — webhook auto-registered.",
    color: "#e4e4e7",
  },
  {
    id: "linear",
    backendType: "linear_trigger",
    icon: Circle,
    label: "Linear",
    description: "Issue created, status changed, cycle updated.",
    color: "#5E6AD2",
  },
  {
    id: "typeform",
    backendType: "typeform_trigger",
    icon: FileText,
    label: "Typeform",
    description: "Respondent submits your Typeform.",
    color: "#e4e4e7",
  },
  {
    id: "github_issue",
    backendType: "github_issue_trigger",
    icon: Github,
    label: "GitHub Issues / PRs",
    description: "New issues or pull requests. Filter by label or type.",
    color: "#e4e4e7",
  },
  {
    id: "rss",
    backendType: "rss_trigger",
    icon: Rss,
    label: "RSS / Atom",
    description: "New article or item in any RSS or Atom feed.",
    color: "#F97316",
  },
  {
    id: "database",
    backendType: "db_trigger",
    icon: Database,
    label: "Database",
    description: "New or updated row in PostgreSQL or MySQL.",
    color: "#10B981",
  },
  {
    id: "youtube",
    backendType: "youtube_trigger",
    icon: Youtube,
    label: "YouTube",
    description: "Channel publishes a new video.",
    color: "#FF0000",
  },
  {
    id: "price_alert",
    backendType: "price_alert_trigger",
    icon: TrendingUp,
    label: "Crypto Price Alert",
    description: "Coin price crosses your threshold. Powered by CoinGecko.",
    color: "#EAB308",
  },
  {
    id: "reddit",
    backendType: "reddit_trigger",
    icon: MessageSquarePlus,
    label: "Reddit",
    description: "New post in a subreddit. Optional keyword filter.",
    color: "#FF4500",
  },
];

// ── Top-level category rows ───────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "manual",
    icon: MousePointerClick,
    label: "Run manually",
    description: "Start yourself, no automation needed",
    triggers: CORE_TRIGGERS.filter((t) => t.id === "manual"),
  },
  {
    id: "schedule",
    icon: Clock,
    label: "On a schedule",
    description: "Time-based or recurring",
    triggers: CORE_TRIGGERS.filter((t) => t.id === "cron"),
  },
  {
    id: "incoming",
    icon: Webhook,
    label: "On incoming event",
    description: "Webhook, chat, email, IMAP, errors",
    triggers: CORE_TRIGGERS.filter((t) => ["webhook", "chat", "email", "imap", "error"].includes(t.id)),
  },
  {
    id: "app_events",
    icon: Zap,
    label: "App Events",
    description: "Connected integrations",
    triggers: APP_TRIGGERS,
    isApps: true,
  },
];

export default function TriggerPicker() {
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState(null);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  const allTriggers = [...CORE_TRIGGERS, ...APP_TRIGGERS];
  const filtered = search
    ? allTriggers.filter(
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

  const toggleCategory = (id) => {
    setOpenCategory((prev) => (prev === id ? null : id));
  };

  // ── Greyscale trigger row (core triggers) ────────────────────────────────
  const renderCoreTrigger = (trigger) => {
    const Icon = trigger.icon;
    return (
      <button
        key={trigger.id}
        onClick={() => handleSelect(trigger)}
        className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-zinc-800/50 transition-all duration-150 text-left group w-full border border-transparent hover:border-zinc-700/30"
      >
        <Icon className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-zinc-200 group-hover:text-white transition-colors leading-tight">
            {trigger.label}
          </div>
          <div className="text-[11px] text-zinc-600 mt-0.5 group-hover:text-zinc-500 transition-colors truncate">
            {trigger.description}
          </div>
        </div>
      </button>
    );
  };

  // ── Colored app trigger row ───────────────────────────────────────────────
  const renderAppTrigger = (trigger) => {
    const Icon = trigger.icon;
    return (
      <button
        key={trigger.id}
        onClick={() => handleSelect(trigger)}
        className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-zinc-800/50 transition-all duration-150 text-left group w-full border border-transparent hover:border-zinc-700/30"
      >
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {trigger.logoUrl ? (
            <img
              src={trigger.logoUrl}
              alt={trigger.label}
              className="w-5 h-5 object-contain"
              style={trigger.imgFilter ? { filter: trigger.imgFilter } : undefined}
            />
          ) : (
            <Icon className="w-5 h-5 shrink-0" style={{ color: trigger.color }} strokeWidth={1.75} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-zinc-200 group-hover:text-white transition-colors leading-tight">
            {trigger.label}
          </div>
          <div className="text-[11px] text-zinc-600 mt-0.5 group-hover:text-zinc-500 transition-colors truncate">
            {trigger.description}
          </div>
        </div>
      </button>
    );
  };

  // ── Search result row (greyscale icon, colored for apps) ─────────────────
  const renderSearchResult = (trigger) => {
    const isApp = APP_TRIGGERS.some((a) => a.id === trigger.id);
    return isApp ? renderAppTrigger(trigger) : renderCoreTrigger(trigger);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            What triggers this workflow?
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Choose how this workflow starts</p>
        </div>
        <button
          onClick={() => setTriggerPickerOpen(false)}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-6 pb-4">
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">

        {/* ── Search results ── */}
        {filtered !== null ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-600">No triggers found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map(renderSearchResult)}
            </div>
          )

        ) : (
          /* ── Category accordion ── */
          <div className="flex flex-col gap-1">
            {CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              const isOpen = openCategory === cat.id;
              return (
                <div key={cat.id} className="rounded-xl overflow-hidden">

                  {/* Category row */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-3.5 w-full px-4 py-3.5 text-left transition-all duration-150 rounded-xl
                      ${isOpen
                        ? "bg-zinc-800/70 border border-zinc-700/40"
                        : "hover:bg-zinc-800/40 border border-transparent hover:border-zinc-700/20"
                      }`}
                  >
                    <CatIcon className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-zinc-200 leading-tight">
                        {cat.label}
                      </div>
                      <div className="text-[11px] text-zinc-600 mt-0.5">{cat.description}</div>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-zinc-600 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* Expanded triggers */}
                  {isOpen && (
                    <div className="mt-0.5 ml-3 border-l border-zinc-800/60 pl-2 flex flex-col gap-0.5 pb-1">
                      {cat.triggers.map((t) =>
                        cat.isApps ? renderAppTrigger(t) : renderCoreTrigger(t)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
