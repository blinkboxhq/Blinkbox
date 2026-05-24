import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
  CheckCircle2,
  Plus,
} from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { TRIGGER_ACTIONS } from "../triggerActions";
import { playNodeLand } from "../../../lib/sounds";

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
  { id: "price_alert",     backendType: "price_alert_trigger",     logoUrl: imgBitcoin,        label: "Crypto Price Alert",  description: "Coin price crosses your threshold." },
  { id: "ssh",             backendType: "ssh_trigger",             logoUrl: imgSsh,            label: "SSH Command",         description: "Run a command on a remote server and trigger on output." },
  { id: "docker",          backendType: "docker_trigger",          logoUrl: imgDocker,         label: "Docker Event",        description: "Container started, stopped, image pulled." },
  { id: "jira",            backendType: "jira_trigger",            logoUrl: imgJira,           label: "Jira",                description: "New issue matching a JQL filter in your Jira project." },
  { id: "trello",          backendType: "trello_trigger",          logoUrl: imgTrello,         label: "Trello",              description: "Card created or moved to a list on your board." },
  { id: "google_sheets",   backendType: "google_sheets_trigger",   logoUrl: imgGoogleSheets,   label: "Google Sheets",       description: "New row added to a spreadsheet." },
  { id: "google_drive",    backendType: "webhook",                  logoUrl: imgGoogleDrive,    label: "Google Drive",        description: "File uploaded, shared, or modified." },
  { id: "google_docs",     backendType: "webhook",                  logoUrl: imgGoogleDocs,     label: "Google Docs",         description: "Document edited or commented on." },
  { id: "google_forms",    backendType: "webhook",                  logoUrl: imgGoogleForms,    label: "Google Forms",        description: "Form response submitted." },
  { id: "outlook",         backendType: "outlook_trigger",          logoUrl: imgOutlook,        label: "Outlook",             description: "New email in your Microsoft 365 inbox." },
  { id: "teams",           backendType: "teams_trigger",            logoUrl: imgTeams,          label: "Microsoft Teams",     description: "Message posted in a channel." },
  { id: "onedrive",        backendType: "webhook",                  logoUrl: imgOneDrive,       label: "OneDrive",            description: "File created or modified in OneDrive." },
  { id: "sharepoint",      backendType: "webhook",                  logoUrl: imgSharePoint,     label: "SharePoint",          description: "List item created or updated." },
  { id: "azure_devops",    backendType: "webhook",                  logoUrl: imgAzureDevOps,    label: "Azure DevOps",        description: "Work item created, PR opened, pipeline triggered." },
  { id: "gitlab",          backendType: "gitlab_trigger",           logoUrl: imgGitLab,         label: "GitLab",              description: "Merge request, issue, or pipeline event." },
  { id: "sentry",          backendType: "webhook",                  logoUrl: imgSentry,         label: "Sentry",              description: "New error or issue created in your project." },
  { id: "vercel",          backendType: "webhook",                  logoUrl: imgVercel,         label: "Vercel",              description: "Deployment succeeded, failed, or cancelled." },
  { id: "netlify",         backendType: "webhook",                  logoUrl: imgNetlify,        label: "Netlify",             description: "Build or deploy event on your site." },
  { id: "pagerduty",       backendType: "webhook",                  logoUrl: imgPagerDuty,      label: "PagerDuty",           description: "Alert triggered or resolved." },
  { id: "datadog",         backendType: "webhook",                  logoUrl: imgDatadog,        label: "Datadog",             description: "Monitor alert fired." },
  { id: "http_monitor",    backendType: "http_monitor_trigger",     logoUrl: imgVercel,         label: "HTTP Monitor",        description: "URL goes down, comes back up, or responds slowly." },
  { id: "zendesk",         backendType: "webhook",                  logoUrl: imgZendesk,        label: "Zendesk",             description: "New ticket or ticket status changed." },
  { id: "calendly",        backendType: "webhook",                  logoUrl: imgCalendly,       label: "Calendly",            description: "Meeting booked or cancelled." },
  { id: "mailchimp",       backendType: "webhook",                  logoUrl: imgMailchimp,      label: "Mailchimp",           description: "Subscriber added, unsubscribed, or campaign sent." },
  { id: "asana",           backendType: "asana_trigger",            logoUrl: imgAsana,          label: "Asana",               description: "Task created or completed in a project." },
  { id: "clickup",         backendType: "webhook",                  logoUrl: imgClickUp,        label: "ClickUp",             description: "Task event in a space or list." },
  { id: "monday",          backendType: "webhook",                  logoUrl: imgMonday,         label: "Monday.com",          description: "Item status changed on a board." },
  { id: "figma",           backendType: "webhook",                  logoUrl: imgFigma,          label: "Figma",               description: "Comment added or file version published." },
  { id: "instagram",       backendType: "webhook",                  logoUrl: imgInstagram,      label: "Instagram",           description: "New post, story, or mention via webhook." },
  { id: "tiktok",          backendType: "webhook",                  logoUrl: imgTikTok,         label: "TikTok",              description: "New video published on your account." },
  { id: "mastodon",        backendType: "webhook",                  logoUrl: imgMastodon,       label: "Mastodon",            description: "New toot or mention on your Mastodon account." },
  { id: "producthunt",     backendType: "hackernews_trigger",       logoUrl: imgProductHunt,    label: "Product Hunt",        description: "New product launch or comment." },
  { id: "hackernews",      backendType: "hackernews_trigger",       logoUrl: imgHackerNews,     label: "Hacker News",         description: "New post matching a keyword or reaching min score." },
  { id: "pipedrive",       backendType: "pipedrive_trigger",        logoUrl: imgPipedrive,      label: "Pipedrive",           description: "New or updated deal, person, or organization." },
  { id: "intercom",        backendType: "webhook",                  logoUrl: imgIntercom,       label: "Intercom",            description: "New conversation or user event." },
  { id: "woocommerce",     backendType: "webhook",                  logoUrl: imgWooCommerce,    label: "WooCommerce",         description: "Order placed, status changed, or product updated." },
  { id: "ssl",             backendType: "ssl_trigger",              logoUrl: imgLetsEncrypt,    label: "SSL Cert Expiry",     description: "Certificate expiring within your chosen window." },
  { id: "dns",             backendType: "dns_trigger",              logoUrl: imgDns,            label: "DNS Record Change",   description: "DNS A, MX, TXT or other record changes." },
  { id: "port_monitor",    backendType: "port_monitor_trigger",     logoUrl: imgPortMonitor,    label: "Port Monitor",        description: "TCP port opens or closes on your server." },
  { id: "virustotal",      backendType: "webhook",                  logoUrl: imgVirusTotal,     label: "VirusTotal",          description: "Scan result returned for a file or URL." },
];

const CATEGORIES = [
  {
    id: "manual",
    icon: MousePointerClick,
    label: "Run manually",
    description: "Start yourself, on demand",
    color: "#a78bfa",
    trigger: { id: "manual", backendType: "manual", label: "Run manually" },
    direct: true,
  },
  {
    id: "schedule",
    icon: Clock,
    label: "On a schedule",
    description: "Time-based or recurring runs",
    color: "#34d399",
    trigger: { id: "cron", backendType: "cron_trigger", label: "On a schedule" },
    direct: true,
  },
  {
    id: "webhook",
    icon: Webhook,
    label: "On webhook call",
    description: "HTTP request hits your URL",
    color: "#60a5fa",
    trigger: { id: "webhook", backendType: "webhook", label: "On webhook call" },
    direct: true,
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: "On chat message",
    description: "User sends a message to your endpoint",
    color: "#fb923c",
    trigger: { id: "chat", backendType: "chat_trigger", label: "On Chat Message" },
    direct: true,
  },
  {
    id: "email",
    icon: Mail,
    label: "On email received",
    description: "Via webhook or IMAP inbox",
    color: "#f472b6",
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
    color: "#fbbf24",
    isApps: true,
  },
  {
    id: "error",
    icon: AlertTriangle,
    label: "On workflow error",
    description: "Any workflow in your workspace fails",
    color: "#f87171",
    trigger: { id: "error", backendType: "error_trigger", label: "On workflow error" },
    direct: true,
  },
];

const ALL_SEARCHABLE = [
  ...CATEGORIES.filter((c) => c.direct).map((c) => ({ ...c.trigger, label: c.label, description: c.description })),
  { id: "email", backendType: "webhook",      label: "Email via webhook", description: "Mailgun, SendGrid, Postmark." },
  { id: "imap",  backendType: "imap_trigger", label: "Email via IMAP",    description: "Poll any IMAP inbox." },
  ...APP_TRIGGERS,
];

export default function TriggerPicker() {
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState("home"); // "home" | "apps" | "email" | "actions"
  const [pendingTrigger, setPendingTrigger] = useState(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [selected, setSelected] = useState([]);
  const searchRef = useRef(null);

  const addNode = useWorkspaceStore((s) => s.addNode);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const setTriggerPickerOpen = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const close = useCallback(() => { setTriggerPickerOpen(false); setSelected([]); }, [setTriggerPickerOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (phase !== "home" || search) {
          setPhase("home");
          setSearch("");
          setPendingTrigger(null);
        } else {
          close();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, search, close]);

  const commitNode = (trigger, selectedAction) => {
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
        config: { triggerVariant: trigger.id, selectedAction },
      },
    });
    playNodeLand();
    setTriggerPickerOpen(false);
    setSelectedNodeId(newId);
  };

  const NO_ACTION_PICKER = ["manual", "chat"];

  const toggleTrigger = (trigger, selectedAction = null) => {
    setSelected(prev => {
      const key = trigger.id + ":" + (selectedAction || "");
      const idx = prev.findIndex(s => s.trigger.id + ":" + (s.selectedAction || "") === key);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { trigger, selectedAction }];
    });
  };

  const commitAll = () => {
    if (selected.length === 0) return;
    const existingTriggers = nodes.filter(n => n.data?.type === "trigger");
    const baseY = existingTriggers.length > 0
      ? Math.max(...existingTriggers.map(n => n.position.y)) + 220
      : 300;
    let lastId = null;
    selected.forEach(({ trigger, selectedAction }, i) => {
      const newId = `${trigger.id}-${crypto.randomUUID()}`;
      addNode({
        id: newId,
        type: "custom",
        position: { x: 400, y: baseY + i * 220 },
        data: {
          backendType: trigger.backendType,
          label: trigger.label,
          type: "trigger",
          config: { triggerVariant: trigger.id, selectedAction },
        },
      });
      lastId = newId;
    });
    playNodeLand();
    setTriggerPickerOpen(false);
    if (lastId) setSelectedNodeId(lastId);
  };

  const handleSelect = (trigger) => {
    if (NO_ACTION_PICKER.includes(trigger.id)) { commitNode(trigger, null); return; }
    const actions = TRIGGER_ACTIONS[trigger.id] || TRIGGER_ACTIONS[trigger.backendType] || [];
    if (actions.length === 0) { toggleTrigger(trigger); return; }
    setPendingTrigger(trigger);
    setPhase("actions");
  };

  const handleCategoryClick = (cat) => {
    if (cat.direct) { handleSelect(cat.trigger); return; }
    if (cat.isApps) { setPhase("apps"); return; }
    if (cat.subTriggers) { setPhase("email"); return; }
  };

  const filtered = search.trim()
    ? ALL_SEARCHABLE.filter(
        (t) =>
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          (t.description || "").toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const dragStart = (e, trigger) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify({
      backendType: trigger.backendType,
      label: trigger.label,
      type: "trigger",
      config: { triggerVariant: trigger.id },
    }));
    setTriggerPickerOpen(false);
  };

  // ── Row renderers ───────────────────────────────────────────────────────────

  const AppRow = ({ trigger }) => {
    const isSel = selected.some(s => s.trigger.id === trigger.id);
    return (
      <button
        draggable
        onDragStart={(e) => dragStart(e, trigger)}
        onClick={() => handleSelect(trigger)}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all duration-150 text-left group cursor-grab active:cursor-grabbing ${isSel ? "bg-violet-500/10 border-violet-500/40" : "hover:bg-white/[0.05] border-transparent hover:border-white/15"}`}
      >
        <img src={trigger.logoUrl} alt={trigger.label} className="w-5 h-5 object-contain shrink-0"
          style={trigger.imgFilter ? { filter: trigger.imgFilter } : undefined} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white leading-tight truncate">{trigger.label}</div>
          <div className="text-[11px] text-white/45 mt-0.5 truncate group-hover:text-white/60">{trigger.description}</div>
        </div>
        {isSel && <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />}
      </button>
    );
  };

  const CoreRow = ({ trigger, icon: Icon, color }) => {
    const isSel = selected.some(s => s.trigger.id === trigger.id);
    return (
      <button
        draggable
        onDragStart={(e) => dragStart(e, trigger)}
        onClick={() => handleSelect(trigger)}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all duration-150 text-left group cursor-grab active:cursor-grabbing ${isSel ? "bg-violet-500/10 border-violet-500/40" : "hover:bg-white/[0.05] border-transparent hover:border-white/15"}`}
      >
        <Icon size={18} strokeWidth={1.7} style={{ color: color || '#a1a1aa' }} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white leading-tight">{trigger.label}</div>
          {trigger.description && (
            <div className="text-[11px] text-white/45 mt-0.5 group-hover:text-white/60 truncate">{trigger.description}</div>
          )}
        </div>
        {isSel && <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />}
      </button>
    );
  };

  // ── Sub-phases ──────────────────────────────────────────────────────────────

  const renderAppsGrid = () => (
    <motion.div
      key="apps"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0">
        <button onClick={() => setPhase("home")}
          className="p-1.5 text-white/50 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors">
          <ArrowLeft size={15} />
        </button>
        <Zap size={16} className="text-amber-400 shrink-0" strokeWidth={2} />
        <div>
          <div className="text-[14px] font-bold text-white leading-tight">App Events</div>
          <div className="text-[11px] text-white/45">Connected integrations</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-5 flex flex-col gap-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
        {APP_TRIGGERS.map((t) => <AppRow key={t.id} trigger={t} />)}
      </div>
    </motion.div>
  );

  const renderEmailPage = () => {
    const emailCat = CATEGORIES.find((c) => c.id === "email");
    return (
      <motion.div
        key="email"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.16 }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0">
          <button onClick={() => setPhase("home")}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors">
            <ArrowLeft size={15} />
          </button>
          <Mail size={16} className="text-pink-400 shrink-0" strokeWidth={2} />
          <div>
            <div className="text-[14px] font-bold text-white leading-tight">On email received</div>
            <div className="text-[11px] text-white/45">Via webhook or IMAP inbox</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-5 flex flex-col gap-0.5">
          <CoreRow trigger={{ id: "email", backendType: "webhook", label: "Email via webhook", description: "Mailgun, SendGrid, Postmark, Forward Email." }} icon={Mail} color="#f472b6" />
          <CoreRow trigger={{ id: "imap", backendType: "imap_trigger", label: "Email via IMAP", description: "Poll Gmail, Outlook, or any IMAP inbox directly." }} icon={Inbox} color="#f472b6" />
        </div>
      </motion.div>
    );
  };

  const renderActionsPage = () => {
    if (!pendingTrigger) return null;
    const actions = TRIGGER_ACTIONS[pendingTrigger.id] || TRIGGER_ACTIONS[pendingTrigger.backendType] || [];
    return (
      <motion.div
        key="actions"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.16 }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0">
          <button onClick={() => { setPendingTrigger(null); setPhase("home"); }}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors">
            <ArrowLeft size={15} />
          </button>
          {pendingTrigger.logoUrl
            ? <img src={pendingTrigger.logoUrl} alt={pendingTrigger.label} className="w-5 h-5 object-contain shrink-0"
                style={pendingTrigger.imgFilter ? { filter: pendingTrigger.imgFilter } : undefined} />
            : <Zap size={16} className="text-white/70 shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-white leading-tight truncate">{pendingTrigger.label}</div>
            <div className="text-[11px] text-white/45">Choose what triggers this node</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-5 flex flex-col gap-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          {actions.map((action) => {
            const isSel = selected.some(s => s.trigger.id === pendingTrigger.id && s.selectedAction === action.name);
            return (
              <button
                key={action.name}
                onClick={() => { toggleTrigger(pendingTrigger, action.name); setPendingTrigger(null); setPhase("home"); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all duration-150 text-left group ${isSel ? "bg-violet-500/10 border-violet-500/40" : "hover:bg-white/[0.05] border-transparent hover:border-white/15"}`}
              >
                {pendingTrigger.logoUrl
                  ? <img src={pendingTrigger.logoUrl} alt="" className="w-5 h-5 object-contain shrink-0"
                      style={pendingTrigger.imgFilter ? { filter: pendingTrigger.imgFilter } : undefined} />
                  : <Zap size={16} className="text-white/60 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white leading-tight">{action.name}</div>
                  <div className="text-[11px] text-white/45 mt-0.5 group-hover:text-white/60 leading-relaxed">{action.description}</div>
                </div>
                {isSel ? (
                  <CheckCircle2 size={13} className="text-violet-400 shrink-0" />
                ) : (
                  <ChevronRight size={13} className="text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // ── Search results list ─────────────────────────────────────────────────────

  const renderSearchResults = () => (
    <motion.div
      key="search-results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="flex-1 overflow-y-auto px-3 pb-5 flex flex-col gap-0.5 mt-1"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
    >
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <Search size={28} className="text-zinc-700" />
          <p className="text-[12px] text-white/35">No triggers found for "{search}"</p>
        </div>
      ) : (
        filtered.map((t) => {
          const isApp = APP_TRIGGERS.some((a) => a.id === t.id);
          if (isApp) return <AppRow key={t.id} trigger={t} />;
          const catDef = CATEGORIES.find((c) => c.direct && c.trigger?.id === t.id);
          const Icon = catDef?.icon || Search;
          return <CoreRow key={t.id} trigger={t} icon={Icon} color={catDef?.color} />;
        })
      )}
    </motion.div>
  );

  // ── Home page ────────────────────────────────────────────────────────────────

  const renderHome = () => (
    <motion.div
      key="home"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16 }}
      className="flex flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          if (cat.isApps) {
            return (
              <button
                key={cat.id}
                onClick={() => setPhase("apps")}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-transparent hover:bg-white/[0.05] hover:border-white/15 transition-all duration-150 text-left group"
              >
                <Icon size={18} strokeWidth={1.7} style={{ color: cat.color }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white leading-tight">{cat.label}</div>
                  <div className="text-[11px] text-white/45 mt-0.5 group-hover:text-white/60">{cat.description}</div>
                </div>
                <ChevronRight size={13} className="text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
              </button>
            );
          }
          if (cat.subTriggers) {
            return (
              <button
                key={cat.id}
                onClick={() => setPhase("email")}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-transparent hover:bg-white/[0.05] hover:border-white/15 transition-all duration-150 text-left group"
              >
                <Icon size={18} strokeWidth={1.7} style={{ color: cat.color }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white leading-tight">{cat.label}</div>
                  <div className="text-[11px] text-white/45 mt-0.5 group-hover:text-white/60">{cat.description}</div>
                </div>
                <ChevronRight size={13} className="text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
              </button>
            );
          }
          return (
            <CoreRow
              key={cat.id}
              trigger={{ ...cat.trigger, description: cat.description }}
              icon={Icon}
              color={cat.color}
            />
          );
        })}
      </div>
    </motion.div>
  );

  // ── Root render ─────────────────────────────────────────────────────────────

  const isListPhase = true;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 pointer-events-none backdrop-blur-md">

      {/* Floating search bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="w-full max-w-[420px] mx-4 pointer-events-auto"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl focus-within:border-white/25 transition-colors">
          <Search size={15} className="text-white/40 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search triggers..."
            className="flex-1 bg-transparent text-[13px] text-neutral-200 outline-none placeholder:text-white/35"
          />
          <kbd className="text-[10px] text-white/25 border border-white/10 rounded px-1.5 py-0.5 font-mono shrink-0">
            ESC
          </kbd>
        </div>
      </motion.div>

      {/* Selection footer */}
      {selected.length > 0 && (
        <div className="w-full max-w-[420px] mx-4 pointer-events-auto order-last">
          <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
            <button onClick={() => setSelected([])} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors shrink-0" title="Clear selection">
              <X className="w-3.5 h-3.5" />
            </button>
            <span className="text-[12px] text-white/50 flex-1">{selected.length} trigger{selected.length !== 1 ? "s" : ""} selected</span>
            <button onClick={commitAll} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-bold transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Add {selected.length}
            </button>
          </div>
        </div>
      )}

      {/* Content panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key="list-panel"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="w-full max-w-[420px] mx-4 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col pointer-events-auto"
          style={{ maxHeight: "55vh" }}
        >
          {filtered !== null ? renderSearchResults() : phase === "apps" ? renderAppsGrid() : phase === "email" ? renderEmailPage() : phase === "actions" ? renderActionsPage() : renderHome()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
