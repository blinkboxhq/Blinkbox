import { useState } from "react";
import {
  Search,
  MousePointerClick,
  Webhook,
  Clock,
  MessageSquare,
  Mail,
  AlertTriangle,
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
  Zap,
  ArrowLeft,
  Rss,
} from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

import imgTelegram from "../../../assets/telegram.png";
import imgSlack    from "../../../assets/slack.png";
import imgDiscord  from "../../../assets/discord.png";
import imgGmail    from "../../../assets/gmail.png";
import imgWhatsApp from "../../../assets/whatsapp.png";
import imgAirtable from "../../../assets/Airtable--Streamline-Svg-Logos.svg";
import imgNotion   from "../../../assets/Notion-Logo--Streamline-Radix.svg";

const APP_TRIGGERS = [
  { id: "telegram",       backendType: "telegram_trigger",        logoUrl: imgTelegram, label: "Telegram",            description: "Message, button press, or any bot update.", color: "#26A5E4" },
  { id: "slack",          backendType: "slack_trigger",           logoUrl: imgSlack,    label: "Slack",               description: "Message posted, reaction added, member joined.", color: "#E01E5A" },
  { id: "discord",        backendType: "discord_trigger",         logoUrl: imgDiscord,  label: "Discord",             description: "Message sent, member joined, reaction added.", color: "#5865F2" },
  { id: "whatsapp",       backendType: "whatsapp_trigger",        logoUrl: imgWhatsApp, label: "WhatsApp",            description: "Message on your WhatsApp Business number.", color: "#25D366" },
  { id: "gmail",          backendType: "gmail_trigger",           logoUrl: imgGmail,    label: "Gmail",               description: "New email matching an optional query filter.", color: "#EA4335" },
  { id: "airtable",       backendType: "airtable_trigger",        logoUrl: imgAirtable, label: "Airtable",            description: "New or updated record in an Airtable base.", color: "#F65858", imgFilter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(500%) hue-rotate(330deg)" },
  { id: "notion",         backendType: "notion_trigger",          logoUrl: imgNotion,   label: "Notion",              description: "New or edited page in a Notion database.", color: "#ffffff", imgFilter: "brightness(0) invert(1)" },
  { id: "hubspot",        backendType: "hubspot_trigger",         icon: Users,          label: "HubSpot",             description: "New or updated contacts, deals, companies.", color: "#FF7A59" },
  { id: "google_calendar",backendType: "google_calendar_trigger", icon: Calendar,       label: "Google Calendar",     description: "Calendar event about to start.", color: "#4285F4" },
  { id: "shopify",        backendType: "shopify_trigger",         icon: ShoppingBag,    label: "Shopify",             description: "Order placed, fulfillment shipped, product updated.", color: "#95BF47" },
  { id: "stripe",         backendType: "stripe_trigger",          icon: CreditCard,     label: "Stripe",              description: "Payment succeeded, subscription cancelled.", color: "#635BFF" },
  { id: "github",         backendType: "github_trigger",          icon: Github,         label: "GitHub",              description: "Push, PR, issue, release — webhook auto-registered.", color: "#e4e4e7" },
  { id: "linear",         backendType: "linear_trigger",          icon: Circle,         label: "Linear",              description: "Issue created, status changed, cycle updated.", color: "#5E6AD2" },
  { id: "typeform",       backendType: "typeform_trigger",        icon: FileText,       label: "Typeform",            description: "Respondent submits your Typeform.", color: "#e4e4e7" },
  { id: "github_issue",   backendType: "github_issue_trigger",    icon: Github,         label: "GitHub Issues / PRs", description: "New issues or pull requests. Filter by label.", color: "#e4e4e7" },
  { id: "rss",            backendType: "rss_trigger",             icon: Rss,            label: "RSS / Atom",          description: "New article or item in any feed.", color: "#F97316" },
  { id: "database",       backendType: "db_trigger",              icon: Database,       label: "Database",            description: "New or updated row in PostgreSQL or MySQL.", color: "#10B981" },
  { id: "youtube",        backendType: "youtube_trigger",         icon: Youtube,        label: "YouTube",             description: "Channel publishes a new video.", color: "#FF0000" },
  { id: "price_alert",    backendType: "price_alert_trigger",     icon: TrendingUp,     label: "Crypto Price Alert",  description: "Coin price crosses your threshold.", color: "#EAB308" },
  { id: "reddit",         backendType: "reddit_trigger",          icon: MessageSquarePlus, label: "Reddit",           description: "New post in a subreddit. Optional keyword filter.", color: "#FF4500" },
];

// Category rows on the home screen
const CATEGORIES = [
  {
    id: "manual",
    icon: MousePointerClick,
    label: "Run manually",
    description: "Start yourself, on demand",
    trigger: { id: "manual", backendType: "manual", label: "Run manually" },
    direct: true, // clicking selects the trigger directly, no sub-page
  },
  {
    id: "schedule",
    icon: Clock,
    label: "On a schedule",
    description: "Time-based or recurring runs",
    trigger: { id: "cron", backendType: "cron_trigger", label: "On a schedule" },
    direct: true,
  },
  {
    id: "webhook",
    icon: Webhook,
    label: "On webhook call",
    description: "HTTP request hits your URL",
    trigger: { id: "webhook", backendType: "webhook", label: "On webhook call" },
    direct: true,
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: "On chat message",
    description: "User sends a message to your endpoint",
    trigger: { id: "chat", backendType: "webhook", label: "On chat message" },
    direct: true,
  },
  {
    id: "email",
    icon: Mail,
    label: "On email received",
    description: "Via webhook or IMAP inbox",
    subTriggers: [
      { id: "email", backendType: "webhook",      label: "Email via webhook", description: "Mailgun, SendGrid, Postmark, Forward Email." },
      { id: "imap",  backendType: "imap_trigger", label: "Email via IMAP",    description: "Poll Gmail, Outlook, or any IMAP inbox directly." },
    ],
  },
  {
    id: "app_events",
    icon: Zap,
    label: "App Events",
    description: "Connected integrations",
    isApps: true,
  },
  {
    id: "error",
    icon: AlertTriangle,
    label: "On workflow error",
    description: "Any workflow in your workspace fails",
    trigger: { id: "error", backendType: "error_trigger", label: "On workflow error" },
    direct: true,
  },
];

export default function TriggerPicker() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState("home"); // "home" | category.id
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  const allSearchable = [
    ...CATEGORIES.filter((c) => c.direct).map((c) => ({ ...c.trigger, label: c.label, description: c.description })),
    { id: "email", backendType: "webhook",      label: "Email via webhook", description: "Mailgun, SendGrid, Postmark." },
    { id: "imap",  backendType: "imap_trigger", label: "Email via IMAP",    description: "Poll any IMAP inbox." },
    ...APP_TRIGGERS,
  ];

  const filtered = search
    ? allSearchable.filter(
        (t) =>
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          (t.description || "").toLowerCase().includes(search.toLowerCase()),
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

  const handleCategoryClick = (cat) => {
    if (cat.direct) { handleSelect(cat.trigger); return; }
    setPage(cat.id);
  };

  // ── Row renderers ────────────────────────────────────────────────────────────

  const CoreRow = ({ trigger, icon: Icon }) => (
    <button
      onClick={() => handleSelect(trigger)}
      className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group"
    >
      <Icon className="w-5 h-5 text-zinc-400 shrink-0" strokeWidth={1.6} />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{trigger.label}</div>
        {trigger.description && (
          <div className="text-[12px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 truncate">{trigger.description}</div>
        )}
      </div>
    </button>
  );

  const AppRow = ({ trigger }) => {
    const Icon = trigger.icon;
    return (
      <button
        onClick={() => handleSelect(trigger)}
        className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group"
      >
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {trigger.logoUrl ? (
            <img src={trigger.logoUrl} alt={trigger.label} className="w-5 h-5 object-contain" style={trigger.imgFilter ? { filter: trigger.imgFilter } : undefined} />
          ) : (
            <Icon className="w-5 h-5 shrink-0" style={{ color: trigger.color }} strokeWidth={1.6} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{trigger.label}</div>
          <div className="text-[12px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 truncate">{trigger.description}</div>
        </div>
      </button>
    );
  };

  // ── Sub-page content ─────────────────────────────────────────────────────────
  const currentCat = CATEGORIES.find((c) => c.id === page);

  const renderSubPage = () => {
    if (!currentCat) return null;

    const CatIcon = currentCat.icon;

    return (
      <div className="flex flex-col h-full">
        {/* Sub-page header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <button
            onClick={() => setPage("home")}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <CatIcon className="w-5 h-5 text-zinc-400 shrink-0" strokeWidth={1.6} />
          <div>
            <div className="text-[15px] font-bold text-zinc-100 leading-tight">{currentCat.label}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{currentCat.description}</div>
          </div>
          <button
            onClick={() => setTriggerPickerOpen(false)}
            className="ml-auto p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
          {currentCat.isApps &&
            APP_TRIGGERS.map((t) => <AppRow key={t.id} trigger={t} />)
          }
          {currentCat.subTriggers &&
            currentCat.subTriggers.map((t) => {
              const icon = t.id === "email" ? Mail : Inbox;
              return <CoreRow key={t.id} trigger={t} icon={icon} />;
            })
          }
        </div>
      </div>
    );
  };

  // ── Home page ────────────────────────────────────────────────────────────────

  const renderHome = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-zinc-100 tracking-tight">What triggers this workflow?</h2>
          <p className="text-[13px] text-zinc-500 mt-1">Choose how this workflow starts</p>
        </div>
        <button
          onClick={() => setTriggerPickerOpen(false)}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-900 border border-zinc-700/60 rounded-xl focus-within:border-zinc-600 transition-colors">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search triggers..."
            className="flex-1 bg-transparent text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600"
            autoFocus
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">

        {/* Search results */}
        {filtered !== null ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-[13px] text-zinc-600">No triggers found</p>
            </div>
          ) : (
            filtered.map((t) => {
              const isApp = APP_TRIGGERS.some((a) => a.id === t.id);
              return isApp
                ? <AppRow key={t.id} trigger={t} />
                : <CoreRow key={t.id} trigger={t} icon={t.icon || MousePointerClick} />;
            })
          )
        ) : (
          /* Category rows */
          CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const isNav = !cat.direct; // has sub-page
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group"
              >
                <CatIcon className="w-5 h-5 text-zinc-400 shrink-0" strokeWidth={1.6} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{cat.label}</div>
                  <div className="text-[12px] text-zinc-500 mt-0.5 group-hover:text-zinc-400">{cat.description}</div>
                </div>
                {isNav && (
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-600 shrink-0 rotate-180 group-hover:text-zinc-400 transition-colors" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {page === "home" ? renderHome() : renderSubPage()}
    </div>
  );
}
