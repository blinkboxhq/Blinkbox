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
  Youtube,
  TrendingUp,
  MessageSquarePlus,
  Calendar,
  ClipboardList,
} from "lucide-react";

import TriggerNode         from "@triggers/manual/ConfigPanel.jsx";
import WebhookTriggerNode  from "@triggers/webhook/ConfigPanel.jsx";
import ScheduleTriggerNode from "@triggers/cron/ConfigPanel.jsx";
import ChatTriggerNode     from "@triggers/chat/ConfigPanel.jsx";
import EmailTriggerNode    from "@triggers/imap/ConfigPanel.jsx";
import RssTriggerNode      from "@triggers/rss/ConfigPanel.jsx";
import ImapTriggerNode     from "@triggers/imap/ConfigPanel.jsx";
import DatabaseTriggerNode from "@triggers/db/ConfigPanel.jsx";
import GitHubTriggerNode   from "@triggers/github/ConfigPanel.jsx";
import StripeTriggerNode   from "@triggers/stripe/ConfigPanel.jsx";

// Integration triggers
import TelegramTriggerNode from "@triggers/telegram/ConfigPanel.jsx";
import SlackTriggerNode    from "@triggers/slack/ConfigPanel.jsx";
import DiscordTriggerNode  from "@triggers/discord/ConfigPanel.jsx";
import GmailTriggerNode    from "@triggers/gmail/ConfigPanel.jsx";
import AirtableTriggerNode from "@triggers/airtable/ConfigPanel.jsx";
import NotionTriggerNode   from "@triggers/notion/ConfigPanel.jsx";
import HubSpotTriggerNode  from "@triggers/hubspot/ConfigPanel.jsx";
import ShopifyTriggerNode  from "@triggers/shopify/ConfigPanel.jsx";
import LinearTriggerNode   from "@triggers/linear/ConfigPanel.jsx";
import TypeformTriggerNode from "@triggers/typeform/ConfigPanel.jsx";
import JotformTriggerNode  from "@triggers/jotform/ConfigPanel.jsx";
import WhatsAppTriggerNode from "@triggers/whatsapp/ConfigPanel.jsx";
import YouTubeTriggerNode        from "@triggers/youtube/ConfigPanel.jsx";
import PriceAlertTriggerNode     from "@triggers/price_alert/ConfigPanel.jsx";
import RedditTriggerNode         from "@triggers/reddit/ConfigPanel.jsx";
import GoogleCalendarTriggerNode from "@triggers/google_calendar/ConfigPanel.jsx";
import GitHubIssueTriggerNode    from "@triggers/github_issue/ConfigPanel.jsx";
import SshTriggerNode              from "@triggers/ssh/ConfigPanel.jsx";
import DockerTriggerNode           from "@triggers/docker/ConfigPanel.jsx";
import JiraTriggerNode             from "@triggers/jira/ConfigPanel.jsx";
import TrelloTriggerNode           from "@triggers/trello/ConfigPanel.jsx";
import GoogleSheetsTriggerNode     from "@triggers/google_sheets/ConfigPanel.jsx";
import OutlookTriggerNode          from "@triggers/outlook/ConfigPanel.jsx";
import TeamsTriggerNode            from "@triggers/teams/ConfigPanel.jsx";
import HttpMonitorTriggerNode      from "@triggers/http_monitor/ConfigPanel.jsx";
import GitLabTriggerNode           from "@triggers/gitlab/ConfigPanel.jsx";
import SslTriggerNode              from "@triggers/ssl/ConfigPanel.jsx";
import DnsTriggerNode              from "@triggers/dns/ConfigPanel.jsx";
import PortMonitorTriggerNode      from "@triggers/port_monitor/ConfigPanel.jsx";
import HackerNewsTriggerNode       from "@triggers/hackernews/ConfigPanel.jsx";
import PipedriveTriggerNode        from "@triggers/pipedrive/ConfigPanel.jsx";
import AsanaTriggerNode            from "@triggers/asana/ConfigPanel.jsx";

import imgTelegram       from "@triggers/telegram/logo.png";
import imgSlack          from "@triggers/slack/logo.png";
import imgDiscord        from "@triggers/discord/logo.png";
import imgGmail          from "@triggers/gmail/logo.png";
import imgWhatsApp       from "@triggers/whatsapp/logo.png";
import imgAirtable       from "@triggers/airtable/logo.svg";
import imgNotion         from "@triggers/notion/logo.svg";
import imgGitHub         from "@triggers/github/logo.svg";
import imgStripe         from "@triggers/stripe/logo.svg";
import imgHubSpot        from "@triggers/hubspot/logo.svg";
import imgShopify        from "@triggers/shopify/logo.svg";
import imgLinear         from "@triggers/linear/logo.svg";
import imgTypeform       from "@triggers/typeform/logo.svg";
import imgJotform        from "@triggers/jotform/logo.svg";
import imgYouTube        from "@triggers/youtube/logo.png";
import imgReddit         from "@triggers/reddit/logo.svg";
import imgGoogleCalendar from "@triggers/google_calendar/logo.svg";
import imgRss            from "@triggers/rss/logo.svg";
import imgPostgres       from "@triggers/db/logo.svg";
import imgBitcoin        from "@triggers/price_alert/logo.svg";
import imgSsh            from "@triggers/ssh/logo.svg";
import imgDocker         from "@triggers/docker/logo.svg";
import imgJira           from "@triggers/jira/logo.svg";
import imgTrello         from "@triggers/trello/logo.svg";
import imgGoogleSheets   from "@triggers/google_sheets/logo.svg";
import imgOutlook        from "@triggers/outlook/logo.svg";
import imgTeams          from "@triggers/teams/logo.svg";
import imgVercel         from "@triggers/vercel/logo.svg";
import imgGitLab         from "@triggers/gitlab/logo.svg";
import imgLetsEncrypt    from "@triggers/ssl/logo.svg";
import imgHackerNews     from "@triggers/hackernews/logo.svg";
import imgPipedrive      from "@triggers/pipedrive/logo.svg";
import imgAsana          from "@triggers/asana/logo.svg";
import imgDns            from "@triggers/dns/logo.svg";
import imgPortMonitor    from "@triggers/port_monitor/logo.svg";
import imgGoogleDrive    from "@triggers/google_drive/logo.svg";
import imgGoogleDocs     from "@triggers/google_docs/logo.svg";
import imgGoogleForms    from "@triggers/google_forms/logo.svg";
import imgOneDrive       from "@triggers/onedrive/logo.svg";
import imgSharePoint     from "@triggers/sharepoint/logo.svg";
import imgAzureDevOps    from "@triggers/azure_devops/logo.svg";
import imgSentry         from "@triggers/sentry/logo.svg";
import imgNetlify        from "@triggers/netlify/logo.svg";
import imgPagerDuty      from "@triggers/pagerduty/logo.svg";
import imgDatadog        from "@triggers/datadog/logo.svg";
import imgZendesk        from "@triggers/zendesk/logo.svg";
import imgCalendly       from "@triggers/calendly/logo.svg";
import imgMailchimp      from "@triggers/mailchimp/logo.svg";
import imgClickUp        from "@triggers/clickup/logo.svg";
import imgMonday         from "@triggers/monday/logo.svg";
import imgFigma          from "@triggers/figma/logo.svg";
import imgInstagram      from "@triggers/instagram/logo.svg";
import imgTikTok         from "@triggers/tiktok/logo.svg";
import imgMastodon       from "@triggers/mastodon/logo.svg";
import imgProductHunt    from "@triggers/producthunt/logo.svg";
import imgIntercom       from "@triggers/intercom/logo.svg";
import imgWooCommerce    from "@triggers/woocommerce/logo.svg";
import imgVirusTotal     from "@triggers/virustotal/logo.svg";
import imgWebhook       from "@triggers/webhook/logo.png";
import imgImap          from "@triggers/imap/logo.svg";
import imgHttpMonitor   from "@triggers/http_monitor/logo.svg";

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
    logoUrl: imgWebhook,
    imgFilter: "invert(1)",
    label: "On Webhook Call",
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    ConfigPanel: WebhookTriggerNode,
  },
  chat: {
    backendType: "chat_trigger",
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
  rss: {
    backendType: "rss_trigger",
    icon: Rss,
    logoUrl: imgRss,
    label: "On RSS / Atom Update",
    colorClass: "text-orange-400",
    accentColor: "249,115,22",
    ConfigPanel: RssTriggerNode,
  },
  imap: {
    backendType: "imap_trigger",
    icon: Inbox,
    logoUrl: imgImap,
    label: "On Email in Inbox",
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: ImapTriggerNode,
  },
  database: {
    backendType: "db_trigger",
    icon: Database,
    logoUrl: imgPostgres,
    label: "On Database Row",
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: DatabaseTriggerNode,
  },
  github: {
    backendType: "github_trigger",
    instant: true,
    icon: Github,
    logoUrl: imgGitHub,
    label: "On GitHub Event",
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    ConfigPanel: GitHubTriggerNode,
  },
  stripe: {
    backendType: "stripe_trigger",
    instant: true,
    icon: CreditCard,
    logoUrl: imgStripe,
    label: "On Stripe Event",
    colorClass: "text-indigo-400",
    accentColor: "99,102,241",
    ConfigPanel: StripeTriggerNode,
  },

  // ── Integration triggers ────────────────────────────────────────────────────
  telegram: {
    backendType: "telegram_trigger",
    instant: true,
    icon: MessageSquare,
    logoUrl: imgTelegram,
    label: "On Telegram Message",
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    ConfigPanel: TelegramTriggerNode,
  },
  slack: {
    backendType: "slack_trigger",
    instant: true,
    icon: MessageSquare,
    logoUrl: imgSlack,
    label: "On Slack Event",
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    ConfigPanel: SlackTriggerNode,
  },
  discord: {
    backendType: "discord_trigger",
    instant: true,
    icon: MessageSquare,
    logoUrl: imgDiscord,
    label: "On Discord Event",
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    ConfigPanel: DiscordTriggerNode,
  },
  whatsapp: {
    backendType: "whatsapp_trigger",
    instant: true,
    icon: MessageSquare,
    logoUrl: imgWhatsApp,
    label: "On WhatsApp Message",
    colorClass: "text-[#25D366]",
    accentColor: "37,211,102",
    ConfigPanel: WhatsAppTriggerNode,
  },
  gmail: {
    backendType: "gmail_trigger",
    instant: true,
    icon: Mail,
    logoUrl: imgGmail,
    label: "On Gmail Email",
    colorClass: "text-[#EA4335]",
    accentColor: "234,67,53",
    ConfigPanel: GmailTriggerNode,
  },
  airtable: {
    backendType: "airtable_trigger",
    instant: true,
    icon: Database,
    logoUrl: imgAirtable,
    label: "On Airtable Record",
    colorClass: "text-[#F65858]",
    accentColor: "246,88,88",
    ConfigPanel: AirtableTriggerNode,
  },
  notion: {
    backendType: "notion_trigger",
    instant: true,
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
    logoUrl: imgHubSpot,
    label: "On HubSpot CRM Event",
    colorClass: "text-[#FF7A59]",
    accentColor: "255,122,89",
    ConfigPanel: HubSpotTriggerNode,
  },
  shopify: {
    backendType: "shopify_trigger",
    instant: true,
    icon: ShoppingBag,
    logoUrl: imgShopify,
    label: "On Shopify Event",
    colorClass: "text-[#95BF47]",
    accentColor: "149,191,71",
    ConfigPanel: ShopifyTriggerNode,
  },
  linear: {
    backendType: "linear_trigger",
    icon: Circle,
    logoUrl: imgLinear,
    label: "On Linear Event",
    colorClass: "text-[#5E6AD2]",
    accentColor: "94,106,210",
    ConfigPanel: LinearTriggerNode,
  },
  typeform: {
    backendType: "typeform_trigger",
    instant: true,
    icon: FileText,
    logoUrl: imgTypeform,
    label: "On Typeform Submission",
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    ConfigPanel: TypeformTriggerNode,
  },
  jotform: {
    backendType: "jotform_trigger",
    instant: true,
    icon: ClipboardList,
    logoUrl: imgJotform,
    label: "On Jotform Submission",
    colorClass: "text-[#FF6100]",
    accentColor: "255,97,0",
    ConfigPanel: JotformTriggerNode,
  },

  // ── New triggers ────────────────────────────────────────────────────────────
  youtube: {
    backendType: "youtube_trigger",
    icon: Youtube,
    logoUrl: imgYouTube,
    label: "On YouTube Video",
    colorClass: "text-red-400",
    accentColor: "248,113,113",
    ConfigPanel: YouTubeTriggerNode,
  },
  price_alert: {
    backendType: "price_alert_trigger",
    icon: TrendingUp,
    logoUrl: imgBitcoin,
    label: "On Crypto Price Alert",
    colorClass: "text-yellow-400",
    accentColor: "250,204,21",
    ConfigPanel: PriceAlertTriggerNode,
  },
  reddit: {
    backendType: "reddit_trigger",
    icon: MessageSquarePlus,
    logoUrl: imgReddit,
    label: "On Reddit Post",
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    ConfigPanel: RedditTriggerNode,
  },
  google_calendar: {
    backendType: "google_calendar_trigger",
    icon: Calendar,
    logoUrl: imgGoogleCalendar,
    label: "On Calendar Event",
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    ConfigPanel: GoogleCalendarTriggerNode,
  },
  github_issue: {
    backendType: "github_issue_trigger",
    icon: Github,
    logoUrl: imgGitHub,
    label: "On GitHub Issue / PR",
    colorClass: "text-zinc-200",
    accentColor: "244,244,245",
    ConfigPanel: GitHubIssueTriggerNode,
  },
  ssh: {
    backendType: "ssh_trigger",
    icon: Github,
    logoUrl: imgSsh,
    label: "On SSH Command Output",
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    ConfigPanel: SshTriggerNode,
  },
  docker: {
    backendType: "docker_trigger",
    icon: Github,
    logoUrl: imgDocker,
    label: "On Docker Event",
    colorClass: "text-[#2496ED]",
    accentColor: "36,150,237",
    ConfigPanel: DockerTriggerNode,
  },
  jira: {
    backendType: "jira_trigger",
    instant: true,
    icon: Github,
    logoUrl: imgJira,
    label: "On Jira Issue",
    colorClass: "text-[#0052CC]",
    accentColor: "0,82,204",
    ConfigPanel: JiraTriggerNode,
  },
  trello: {
    backendType: "trello_trigger",
    instant: true,
    icon: Github,
    logoUrl: imgTrello,
    label: "On Trello Card",
    colorClass: "text-[#0052CC]",
    accentColor: "0,82,204",
    ConfigPanel: TrelloTriggerNode,
  },
  google_sheets: {
    backendType: "google_sheets_trigger",
    instant: true,
    icon: Github,
    logoUrl: imgGoogleSheets,
    label: "On Google Sheets Row",
    colorClass: "text-[#34A853]",
    accentColor: "52,168,83",
    ConfigPanel: GoogleSheetsTriggerNode,
  },
  outlook: {
    backendType: "outlook_trigger",
    instant: true,
    icon: Github,
    logoUrl: imgOutlook,
    label: "On Outlook Email",
    colorClass: "text-[#0078D4]",
    accentColor: "0,120,212",
    ConfigPanel: OutlookTriggerNode,
  },
  teams: {
    backendType: "teams_trigger",
    icon: Github,
    logoUrl: imgTeams,
    label: "On Teams Message",
    colorClass: "text-[#6264A7]",
    accentColor: "98,100,167",
    ConfigPanel: TeamsTriggerNode,
  },
  http_monitor: {
    backendType: "http_monitor_trigger",
    icon: Github,
    logoUrl: imgHttpMonitor,
    label: "HTTP Monitor",
    colorClass: "text-red-400",
    accentColor: "248,113,113",
    ConfigPanel: HttpMonitorTriggerNode,
  },
  gitlab: {
    backendType: "gitlab_trigger",
    icon: Github,
    logoUrl: imgGitLab,
    label: "On GitLab Event",
    colorClass: "text-[#FC6D26]",
    accentColor: "252,109,38",
    ConfigPanel: GitLabTriggerNode,
  },
  ssl: {
    backendType: "ssl_trigger",
    icon: AlertTriangle,
    logoUrl: imgLetsEncrypt,
    label: "On SSL Cert Expiry",
    colorClass: "text-green-400",
    accentColor: "74,222,128",
    ConfigPanel: SslTriggerNode,
  },
  dns: {
    backendType: "dns_trigger",
    icon: Database,
    logoUrl: imgDns,
    label: "On DNS Record Change",
    colorClass: "text-sky-400",
    accentColor: "56,189,248",
    ConfigPanel: DnsTriggerNode,
  },
  port_monitor: {
    backendType: "port_monitor_trigger",
    icon: Webhook,
    logoUrl: imgPortMonitor,
    label: "On Port State Change",
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    ConfigPanel: PortMonitorTriggerNode,
  },
  hackernews: {
    backendType: "hackernews_trigger",
    icon: Rss,
    logoUrl: imgHackerNews,
    label: "On Hacker News Post",
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    ConfigPanel: HackerNewsTriggerNode,
  },
  pipedrive: {
    backendType: "pipedrive_trigger",
    icon: Users,
    logoUrl: imgPipedrive,
    label: "On Pipedrive Event",
    colorClass: "text-[#F55137]",
    accentColor: "245,81,55",
    ConfigPanel: PipedriveTriggerNode,
  },
  asana: {
    backendType: "asana_trigger",
    instant: true,
    icon: Circle,
    logoUrl: imgAsana,
    label: "On Asana Task",
    colorClass: "text-[#F06A6A]",
    accentColor: "240,106,106",
    ConfigPanel: AsanaTriggerNode,
  },

  // Google
  google_drive: {
    backendType: "google_drive_trigger",
    icon: Webhook,
    logoUrl: imgGoogleDrive,
    label: "On Google Drive Event",
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    ConfigPanel: GoogleDriveTriggerNode,
  },
  google_docs: {
    backendType: "google_docs_trigger",
    icon: Webhook,
    logoUrl: imgGoogleDocs,
    label: "On Google Docs Edit",
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    ConfigPanel: GoogleDocsTriggerNode,
  },
  google_forms: {
    backendType: "google_forms_trigger",
    instant: true,
    icon: Webhook,
    logoUrl: imgGoogleForms,
    label: "On Google Forms Response",
    colorClass: "text-[#673AB7]",
    accentColor: "103,58,183",
    ConfigPanel: GoogleFormsTriggerNode,
  },

  // Microsoft
  onedrive: {
    backendType: "onedrive_trigger",
    icon: Webhook,
    logoUrl: imgOneDrive,
    label: "On OneDrive Event",
    colorClass: "text-[#0078D4]",
    accentColor: "0,120,212",
    ConfigPanel: OneDriveTriggerNode,
  },
  sharepoint: {
    backendType: "sharepoint_trigger",
    icon: Webhook,
    logoUrl: imgSharePoint,
    label: "On SharePoint Event",
    colorClass: "text-[#0078D4]",
    accentColor: "0,120,212",
    ConfigPanel: SharePointTriggerNode,
  },
  azure_devops: {
    backendType: "azure_devops_trigger",
    icon: Webhook,
    logoUrl: imgAzureDevOps,
    label: "On Azure DevOps Event",
    colorClass: "text-[#0078D4]",
    accentColor: "0,120,212",
    ConfigPanel: AzureDevOpsTriggerNode,
  },

  // DevOps / Monitoring
  sentry: {
    backendType: "sentry_trigger",
    icon: Webhook,
    logoUrl: imgSentry,
    label: "On Sentry Alert",
    colorClass: "text-[#362D59]",
    accentColor: "84,70,138",
    ConfigPanel: SentryTriggerNode,
  },
  vercel: {
    backendType: "vercel_trigger",
    icon: Webhook,
    logoUrl: imgVercel,
    label: "On Vercel Deploy",
    colorClass: "text-zinc-100",
    accentColor: "228,228,231",
    ConfigPanel: VercelTriggerNode,
  },
  netlify: {
    backendType: "netlify_trigger",
    icon: Webhook,
    logoUrl: imgNetlify,
    label: "On Netlify Build",
    colorClass: "text-[#00C7B7]",
    accentColor: "0,199,183",
    ConfigPanel: NetlifyTriggerNode,
  },
  pagerduty: {
    backendType: "pagerduty_trigger",
    icon: Webhook,
    logoUrl: imgPagerDuty,
    label: "On PagerDuty Alert",
    colorClass: "text-[#06AC38]",
    accentColor: "6,172,56",
    ConfigPanel: PagerDutyTriggerNode,
  },
  datadog: {
    backendType: "datadog_trigger",
    icon: Webhook,
    logoUrl: imgDatadog,
    label: "On Datadog Monitor Alert",
    colorClass: "text-[#632CA6]",
    accentColor: "99,44,166",
    ConfigPanel: DatadogTriggerNode,
  },

  // Business / PM
  zendesk: {
    backendType: "zendesk_trigger",
    icon: Webhook,
    logoUrl: imgZendesk,
    label: "On Zendesk Ticket",
    colorClass: "text-[#00BFAD]",
    accentColor: "3,54,61",
    ConfigPanel: ZendeskTriggerNode,
  },
  calendly: {
    backendType: "calendly_trigger",
    icon: Webhook,
    logoUrl: imgCalendly,
    label: "On Calendly Booking",
    colorClass: "text-[#006BFF]",
    accentColor: "0,107,255",
    ConfigPanel: CalendlyTriggerNode,
  },
  mailchimp: {
    backendType: "mailchimp_trigger",
    icon: Webhook,
    logoUrl: imgMailchimp,
    label: "On Mailchimp Event",
    colorClass: "text-[#FFE01B]",
    accentColor: "255,224,27",
    ConfigPanel: MailchimpTriggerNode,
  },
  clickup: {
    backendType: "clickup_trigger",
    icon: Webhook,
    logoUrl: imgClickUp,
    label: "On ClickUp Task Event",
    colorClass: "text-[#7B68EE]",
    accentColor: "123,104,238",
    ConfigPanel: ClickUpTriggerNode,
  },
  monday: {
    backendType: "monday_trigger",
    icon: Webhook,
    logoUrl: imgMonday,
    label: "On Monday.com Item",
    colorClass: "text-[#FF3D57]",
    accentColor: "255,61,87",
    ConfigPanel: MondayTriggerNode,
  },

  // Design
  figma: {
    backendType: "figma_trigger",
    icon: Webhook,
    logoUrl: imgFigma,
    label: "On Figma Event",
    colorClass: "text-[#F24E1E]",
    accentColor: "242,78,30",
    ConfigPanel: FigmaTriggerNode,
  },

  // Social
  instagram: {
    backendType: "instagram_trigger",
    icon: Webhook,
    logoUrl: imgInstagram,
    label: "On Instagram Event",
    colorClass: "text-[#E4405F]",
    accentColor: "228,64,95",
    ConfigPanel: InstagramTriggerNode,
  },
  tiktok: {
    backendType: "tiktok_trigger",
    icon: Webhook,
    logoUrl: imgTikTok,
    label: "On TikTok Event",
    colorClass: "text-[#FF0050]",
    accentColor: "255,0,80",
    ConfigPanel: TikTokTriggerNode,
  },
  mastodon: {
    backendType: "mastodon_trigger",
    icon: Webhook,
    logoUrl: imgMastodon,
    label: "On Mastodon Event",
    colorClass: "text-[#6364FF]",
    accentColor: "99,100,255",
    ConfigPanel: MastodonTriggerNode,
  },
  producthunt: {
    backendType: "producthunt_trigger",
    icon: Webhook,
    logoUrl: imgProductHunt,
    label: "On Product Hunt Launch",
    colorClass: "text-[#DA552F]",
    accentColor: "218,85,47",
    ConfigPanel: ProductHuntTriggerNode,
  },

  // CRM / Sales
  intercom: {
    backendType: "intercom_trigger",
    icon: Webhook,
    logoUrl: imgIntercom,
    label: "On Intercom Event",
    colorClass: "text-[#1F8DED]",
    accentColor: "31,141,237",
    ConfigPanel: IntercomTriggerNode,
  },
  woocommerce: {
    backendType: "woocommerce_trigger",
    icon: Webhook,
    logoUrl: imgWooCommerce,
    label: "On WooCommerce Order",
    colorClass: "text-[#7F54B3]",
    accentColor: "127,84,179",
    ConfigPanel: WooCommerceTriggerNode,
  },

  // Infra / Security
  virustotal: {
    backendType: "virustotal_trigger",
    icon: Webhook,
    logoUrl: imgVirusTotal,
    label: "On VirusTotal Scan",
    colorClass: "text-[#394EFF]",
    accentColor: "57,78,255",
    ConfigPanel: VirusTotalTriggerNode,
  },
};

// New trigger ConfigPanels (previously using WebhookTriggerNode stub)
import AzureDevOpsTriggerNode from "@triggers/azure_devops/ConfigPanel.jsx";
import CalendlyTriggerNode    from "@triggers/calendly/ConfigPanel.jsx";
import ClickUpTriggerNode     from "@triggers/clickup/ConfigPanel.jsx";
import DatadogTriggerNode     from "@triggers/datadog/ConfigPanel.jsx";
import FigmaTriggerNode       from "@triggers/figma/ConfigPanel.jsx";
import GoogleDocsTriggerNode  from "@triggers/google_docs/ConfigPanel.jsx";
import GoogleDriveTriggerNode from "@triggers/google_drive/ConfigPanel.jsx";
import GoogleFormsTriggerNode from "@triggers/google_forms/ConfigPanel.jsx";
import InstagramTriggerNode   from "@triggers/instagram/ConfigPanel.jsx";
import IntercomTriggerNode    from "@triggers/intercom/ConfigPanel.jsx";
import MailchimpTriggerNode   from "@triggers/mailchimp/ConfigPanel.jsx";
import MastodonTriggerNode    from "@triggers/mastodon/ConfigPanel.jsx";
import MondayTriggerNode      from "@triggers/monday/ConfigPanel.jsx";
import NetlifyTriggerNode     from "@triggers/netlify/ConfigPanel.jsx";
import OneDriveTriggerNode    from "@triggers/onedrive/ConfigPanel.jsx";
import PagerDutyTriggerNode   from "@triggers/pagerduty/ConfigPanel.jsx";
import ProductHuntTriggerNode from "@triggers/producthunt/ConfigPanel.jsx";
import SentryTriggerNode      from "@triggers/sentry/ConfigPanel.jsx";
import SharePointTriggerNode  from "@triggers/sharepoint/ConfigPanel.jsx";
import TikTokTriggerNode      from "@triggers/tiktok/ConfigPanel.jsx";
import VercelTriggerNode      from "@triggers/vercel/ConfigPanel.jsx";
import VirusTotalTriggerNode  from "@triggers/virustotal/ConfigPanel.jsx";
import WooCommerceTriggerNode from "@triggers/woocommerce/ConfigPanel.jsx";
import ZendeskTriggerNode     from "@triggers/zendesk/ConfigPanel.jsx";
