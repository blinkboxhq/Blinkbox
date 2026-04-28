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
  X,
  Zap,
  ArrowLeft,
} from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

import imgTelegram       from "../../../assets/telegram.png";
import imgSlack          from "../../../assets/slack.png";
import imgDiscord        from "../../../assets/discord.png";
import imgGmail          from "../../../assets/gmail.png";
import imgWhatsApp       from "../../../assets/whatsapp.png";
import imgAirtable       from "../../../assets/Airtable--Streamline-Svg-Logos.svg";
import imgNotion         from "../../../assets/notion.svg";
import imgHubSpot        from "../../../assets/hubspot.svg";
import imgGoogleCalendar from "../../../assets/google-calendar.svg";
import imgShopify        from "../../../assets/shopify.svg";
import imgStripe         from "../../../assets/stripe.svg";
import imgGitHub         from "../../../assets/github.svg";
import imgLinear         from "../../../assets/linear.svg";
import imgTypeform       from "../../../assets/typeform.svg";
import imgYouTube        from "../../../assets/youtube.png";
import imgReddit         from "../../../assets/reddit.svg";
import imgRss            from "../../../assets/rss.svg";
import imgPostgres       from "../../../assets/postgresql.svg";
import imgBitcoin        from "../../../assets/bitcoin.svg";
import imgSsh            from "../../../assets/ssh.svg";
import imgDocker         from "../../../assets/docker.svg";
import imgJira           from "../../../assets/jira.svg";
import imgTrello         from "../../../assets/trello.svg";
import imgGoogleSheets   from "../../../assets/google-sheets.svg";
import imgGoogleDrive    from "../../../assets/google-drive.svg";
import imgGoogleDocs     from "../../../assets/google-docs.svg";
import imgGoogleForms    from "../../../assets/google-forms.svg";
import imgOutlook        from "../../../assets/outlook.svg";
import imgTeams          from "../../../assets/microsoft-teams.svg";
import imgOneDrive       from "../../../assets/onedrive.svg";
import imgSharePoint     from "../../../assets/sharepoint.svg";
import imgAzureDevOps    from "../../../assets/azure-devops.svg";
import imgGitLab         from "../../../assets/gitlab.svg";
import imgSentry         from "../../../assets/sentry.svg";
import imgVercel         from "../../../assets/vercel.svg";
import imgNetlify        from "../../../assets/netlify.svg";
import imgCalendly       from "../../../assets/calendly.svg";
import imgZendesk        from "../../../assets/zendesk.svg";
import imgMailchimp      from "../../../assets/mailchimp.svg";
import imgAsana          from "../../../assets/asana.svg";
import imgClickUp        from "../../../assets/clickup.svg";
import imgMonday         from "../../../assets/monday.svg";
import imgFigma          from "../../../assets/figma.svg";
import imgPagerDuty      from "../../../assets/pagerduty.svg";
import imgDatadog        from "../../../assets/datadog.svg";
import imgLetsEncrypt    from "../../../assets/letsencrypt.svg";
import imgHackerNews     from "../../../assets/hackernews.svg";
import imgPipedrive      from "../../../assets/pipedrive.svg";
import imgDns            from "../../../assets/dns.svg";
import imgPortMonitor    from "../../../assets/port-monitor.svg";
import imgInstagram      from "../../../assets/instagram.svg";
import imgTikTok         from "../../../assets/tiktok.svg";
import imgMastodon       from "../../../assets/mastodon.svg";
import imgProductHunt    from "../../../assets/producthunt.svg";
import imgIntercom       from "../../../assets/intercom.svg";
import imgWooCommerce    from "../../../assets/woocommerce.svg";
import imgVirusTotal     from "../../../assets/virustotal.svg";

const APP_TRIGGERS = [
  { id: "telegram",        backendType: "telegram_trigger",        logoUrl: imgTelegram,       label: "Telegram",            description: "Message, button press, or any bot update." },
  { id: "slack",           backendType: "slack_trigger",           logoUrl: imgSlack,          label: "Slack",               description: "Message posted, reaction added, member joined." },
  { id: "discord",         backendType: "discord_trigger",         logoUrl: imgDiscord,        label: "Discord",             description: "Message sent, member joined, reaction added." },
  { id: "whatsapp",        backendType: "whatsapp_trigger",        logoUrl: imgWhatsApp,       label: "WhatsApp",            description: "Message on your WhatsApp Business number." },
  { id: "gmail",           backendType: "gmail_trigger",           logoUrl: imgGmail,          label: "Gmail",               description: "New email matching an optional query filter." },
  { id: "airtable",        backendType: "airtable_trigger",        logoUrl: imgAirtable,       label: "Airtable",            description: "New or updated record in an Airtable base." },
  { id: "notion",          backendType: "notion_trigger",          logoUrl: imgNotion,         label: "Notion",              description: "New or edited page in a Notion database." },
  { id: "hubspot",         backendType: "hubspot_trigger",         logoUrl: imgHubSpot,        label: "HubSpot",             description: "New or updated contacts, deals, companies." },
  { id: "google_calendar", backendType: "google_calendar_trigger", logoUrl: imgGoogleCalendar, label: "Google Calendar",     description: "Calendar event about to start." },
  { id: "shopify",         backendType: "shopify_trigger",         logoUrl: imgShopify,        label: "Shopify",             description: "Order placed, fulfillment shipped, product updated." },
  { id: "stripe",          backendType: "stripe_trigger",          logoUrl: imgStripe,         label: "Stripe",              description: "Payment succeeded, subscription cancelled." },
  { id: "github",          backendType: "github_trigger",          logoUrl: imgGitHub,         label: "GitHub",              description: "Push, PR, issue, release — webhook auto-registered." },
  { id: "github_issue",    backendType: "github_issue_trigger",    logoUrl: imgGitHub,         label: "GitHub Issues / PRs", description: "New issues or pull requests. Filter by label." },
  { id: "linear",          backendType: "linear_trigger",          logoUrl: imgLinear,         label: "Linear",              description: "Issue created, status changed, cycle updated." },
  { id: "typeform",        backendType: "typeform_trigger",        logoUrl: imgTypeform,       label: "Typeform",            description: "Respondent submits your Typeform." },
  { id: "youtube",         backendType: "youtube_trigger",         logoUrl: imgYouTube,        label: "YouTube",             description: "Channel publishes a new video." },
  { id: "reddit",          backendType: "reddit_trigger",          logoUrl: imgReddit,         label: "Reddit",              description: "New post in a subreddit. Optional keyword filter." },
  { id: "rss",             backendType: "rss_trigger",             logoUrl: imgRss,            label: "RSS / Atom",          description: "New article or item in any feed." },
  { id: "database",        backendType: "db_trigger",              logoUrl: imgPostgres,       label: "Database",            description: "New or updated row in PostgreSQL or MySQL." },
  { id: "price_alert",     backendType: "price_alert_trigger",     logoUrl: imgBitcoin,        label: "Crypto Price Alert",  description: "Coin price crosses your threshold. Powered by CoinGecko." },
  { id: "ssh",             backendType: "ssh_trigger",             logoUrl: imgSsh,            label: "SSH Command",         description: "Run a command on a remote server and trigger on output." },
  { id: "docker",          backendType: "docker_trigger",          logoUrl: imgDocker,         label: "Docker Event",        description: "Container started, stopped, image pulled — any Docker event." },
  { id: "jira",            backendType: "jira_trigger",            logoUrl: imgJira,           label: "Jira",                description: "New issue matching a JQL filter in your Jira project." },
  { id: "trello",          backendType: "trello_trigger",          logoUrl: imgTrello,         label: "Trello",              description: "Card created or moved to a list on your board." },

  // Google
  { id: "google_sheets",  backendType: "google_sheets_trigger",   logoUrl: imgGoogleSheets,   label: "Google Sheets",       description: "New row added to a spreadsheet." },
  { id: "google_drive",   backendType: "webhook",                  logoUrl: imgGoogleDrive,    label: "Google Drive",        description: "File uploaded, shared, or modified." },
  { id: "google_docs",    backendType: "webhook",                  logoUrl: imgGoogleDocs,     label: "Google Docs",         description: "Document edited or commented on." },
  { id: "google_forms",   backendType: "webhook",                  logoUrl: imgGoogleForms,    label: "Google Forms",        description: "Form response submitted." },

  // Microsoft
  { id: "outlook",        backendType: "outlook_trigger",          logoUrl: imgOutlook,        label: "Outlook",             description: "New email in your Microsoft 365 inbox." },
  { id: "teams",          backendType: "teams_trigger",            logoUrl: imgTeams,          label: "Microsoft Teams",     description: "Message posted in a channel." },
  { id: "onedrive",       backendType: "webhook",                  logoUrl: imgOneDrive,       label: "OneDrive",            description: "File created or modified in OneDrive." },
  { id: "sharepoint",     backendType: "webhook",                  logoUrl: imgSharePoint,     label: "SharePoint",          description: "List item created or updated." },
  { id: "azure_devops",   backendType: "webhook",                  logoUrl: imgAzureDevOps,    label: "Azure DevOps",        description: "Work item created, PR opened, pipeline triggered." },

  // DevOps / Security
  { id: "gitlab",         backendType: "gitlab_trigger",           logoUrl: imgGitLab,         label: "GitLab",              description: "Merge request, issue, or pipeline event." },
  { id: "sentry",         backendType: "webhook",                  logoUrl: imgSentry,         label: "Sentry",              description: "New error or issue created in your project." },
  { id: "vercel",         backendType: "webhook",                  logoUrl: imgVercel,         label: "Vercel",              description: "Deployment succeeded, failed, or cancelled." },
  { id: "netlify",        backendType: "webhook",                  logoUrl: imgNetlify,        label: "Netlify",             description: "Build or deploy event on your site." },
  { id: "pagerduty",      backendType: "webhook",                  logoUrl: imgPagerDuty,      label: "PagerDuty",           description: "Alert triggered or resolved." },
  { id: "datadog",        backendType: "webhook",                  logoUrl: imgDatadog,        label: "Datadog",             description: "Monitor alert fired." },
  { id: "http_monitor",   backendType: "http_monitor_trigger",     logoUrl: imgVercel,         label: "HTTP Monitor",        description: "URL goes down, comes back up, or responds slowly." },

  // Business / PM
  { id: "zendesk",        backendType: "webhook",                  logoUrl: imgZendesk,        label: "Zendesk",             description: "New ticket or ticket status changed." },
  { id: "calendly",       backendType: "webhook",                  logoUrl: imgCalendly,       label: "Calendly",            description: "Meeting booked or cancelled." },
  { id: "mailchimp",      backendType: "webhook",                  logoUrl: imgMailchimp,      label: "Mailchimp",           description: "Subscriber added, unsubscribed, or campaign sent." },
  { id: "asana",          backendType: "asana_trigger",            logoUrl: imgAsana,          label: "Asana",               description: "Task created or completed in a project." },
  { id: "clickup",        backendType: "webhook",                  logoUrl: imgClickUp,        label: "ClickUp",             description: "Task event in a space or list." },
  { id: "monday",         backendType: "webhook",                  logoUrl: imgMonday,         label: "Monday.com",          description: "Item status changed on a board." },

  // Design
  { id: "figma",          backendType: "webhook",                  logoUrl: imgFigma,          label: "Figma",               description: "Comment added or file version published." },

  // Social
  { id: "instagram",      backendType: "webhook",                  logoUrl: imgInstagram,      label: "Instagram",           description: "New post, story, or mention via webhook." },
  { id: "tiktok",         backendType: "webhook",                  logoUrl: imgTikTok,         label: "TikTok",              description: "New video published on your account." },
  { id: "mastodon",       backendType: "webhook",                  logoUrl: imgMastodon,       label: "Mastodon",            description: "New toot or mention on your Mastodon account." },
  { id: "producthunt",    backendType: "hackernews_trigger",       logoUrl: imgProductHunt,    label: "Product Hunt",        description: "New product launch or comment." },
  { id: "hackernews",     backendType: "hackernews_trigger",       logoUrl: imgHackerNews,     label: "Hacker News",         description: "New post matching a keyword or reaching min score." },

  // CRM / Sales
  { id: "pipedrive",      backendType: "pipedrive_trigger",        logoUrl: imgPipedrive,      label: "Pipedrive",           description: "New or updated deal, person, or organization." },
  { id: "intercom",       backendType: "webhook",                  logoUrl: imgIntercom,       label: "Intercom",            description: "New conversation or user event." },
  { id: "woocommerce",    backendType: "webhook",                  logoUrl: imgWooCommerce,    label: "WooCommerce",         description: "Order placed, status changed, or product updated." },

  // Infra / Security
  { id: "ssl",            backendType: "ssl_trigger",              logoUrl: imgLetsEncrypt,    label: "SSL Cert Expiry",     description: "Certificate expiring within your chosen window." },
  { id: "dns",            backendType: "dns_trigger",              logoUrl: imgDns,            label: "DNS Record Change",   description: "DNS A, MX, TXT or other record changes." },
  { id: "port_monitor",   backendType: "port_monitor_trigger",     logoUrl: imgPortMonitor,    label: "Port Monitor",        description: "TCP port opens or closes on your server." },
  { id: "virustotal",     backendType: "webhook",                  logoUrl: imgVirusTotal,     label: "VirusTotal",          description: "Scan result returned for a file or URL." },
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
  const nodes = useWorkspaceStore((s) => s.nodes);
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
    const existingTriggers = nodes.filter((n) => n.data?.type === "trigger");
    const position = existingTriggers.length > 0
      ? { x: existingTriggers[existingTriggers.length - 1].position.x, y: existingTriggers[existingTriggers.length - 1].position.y + 220 }
      : { x: 400, y: 300 };
    addNode({
      id: newId,
      type: "custom",
      position,
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

  const dragStart = (e, trigger) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify({
      backendType: trigger.backendType,
      label: trigger.label,
      type: "trigger",
      config: { triggerVariant: trigger.id },
    }));
  };

  const CoreRow = ({ trigger, icon: Icon }) => (
    <button
      draggable
      onDragStart={(e) => dragStart(e, trigger)}
      onClick={() => handleSelect(trigger)}
      className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group cursor-grab active:cursor-grabbing"
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

  const AppRow = ({ trigger }) => (
    <button
      draggable
      onDragStart={(e) => dragStart(e, trigger)}
      onClick={() => handleSelect(trigger)}
      className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group cursor-grab active:cursor-grabbing"
    >
      <img
        src={trigger.logoUrl}
        alt={trigger.label}
        className="w-5 h-5 object-contain shrink-0"
        style={trigger.imgFilter ? { filter: trigger.imgFilter } : undefined}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{trigger.label}</div>
        <div className="text-[12px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 truncate">{trigger.description}</div>
      </div>
    </button>
  );

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
              const coreDef = [...CATEGORIES.filter(c => c.direct).map(c => ({ ...c.trigger, icon: c.icon, description: c.description })),
                { id: "email", icon: Mail, backendType: "webhook", label: "Email via webhook", description: "Mailgun, SendGrid, Postmark." },
                { id: "imap",  icon: Inbox, backendType: "imap_trigger", label: "Email via IMAP", description: "Poll any IMAP inbox." },
              ].find(c => c.id === t.id);
              return isApp
                ? <AppRow key={t.id} trigger={t} />
                : <CoreRow key={t.id} trigger={t} icon={coreDef?.icon || MousePointerClick} />;
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
