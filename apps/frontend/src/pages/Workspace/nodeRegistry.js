import {
  Zap, Globe, Hourglass, Search, Database, Bot, GitBranch, Code2, Repeat,
  Sparkles, MousePointerClick, Webhook, Clock, Brain, Filter, ArrowUpDown,
  Layers, LayoutGrid, FileText, Calendar, Shield, Tags, Scissors, Wand2,
  Github, CreditCard, Ticket, Circle, ShoppingBag, Twitter, Users, Merge,
  CheckSquare, Server, QrCode, SplitSquareHorizontal, AlignLeft, CheckCircle2,
  GitFork, Image, Package, FileOutput, Mic2, Box, Video, MessageSquarePlus,
  TrendingUp, Youtube, Mail, Edit2,
  // Flow control
  CheckCheck, XCircle, RotateCcw, Timer,
  // New icons
  ToggleLeft, Hash, Sigma, Table2, BookOpen, HeartPulse,
  FlaskConical, GraduationCap, Briefcase, Gamepad2, Camera, Music, DollarSign,
  BarChart2, PieChart, LineChart, MapPin, Languages, Rss, Bell, BellOff,
  UploadCloud, DownloadCloud, FolderOpen, Archive, Trash2, RefreshCw,
  AlarmClock, StickyNote, ListChecks, Clipboard, Send, PhoneCall,
  MessageCircle, UserPlus, UserMinus, Key, Lock, Unlock, Eye, EyeOff,
  Cpu, HardDrive, MemoryStick, Wifi, Activity, Thermometer, Pill,
  Stethoscope, Microscope, Dna, Atom, Calculator, PenTool, Palette,
  Film, Headphones, Radio, Podcast, BookMarked, Newspaper, Trophy,
  Star, Heart, ThumbsUp, Share2, Link2, ExternalLink, Download, Upload,
  Printer, ScanLine, Barcode, CaseSensitive, Replace, Regex,
  Split, Combine, Shuffle, ArrowRightLeft,
} from "lucide-react";

// Local asset icons
import imgOpenAI     from "../../assets/openai.svg";
import imgAnthropic  from "../../assets/anthropic.svg";
import imgGemini     from "../../assets/gemini-color.svg";
import imgPerplexity from "../../assets/perplexity-color.svg";
import imgDeepSeek   from "../../assets/deepseek-color.svg";
import imgGrok       from "../../assets/grok-color.svg";
import imgComputer   from "../../assets/computer.png";
import imgHTTP       from "../../assets/Globe--Streamline-Unicons.svg";
import imgCode       from "../../assets/Brackets-Curly--Streamline-Unicons.svg";
import imgAirtable       from "../../assets/Airtable--Streamline-Svg-Logos.svg";
import imgNotion         from "../../assets/notion.svg";
import imgSendGrid       from "../../assets/Sendgrid-Icon--Streamline-Svg-Logos.svg";
import imgTwilio         from "../../assets/Twilio-Icon--Streamline-Svg-Logos.svg";
import imgSlack          from "../../assets/slack.png";
import imgDiscord        from "../../assets/discord.png";
import imgTelegram       from "../../assets/telegram.png";
import imgWhatsApp       from "../../assets/whatsapp.png";
import imgGmail          from "../../assets/gmail.png";
import imgGitHub         from "../../assets/github.svg";
import imgStripe         from "../../assets/stripe.svg";
import imgHubSpot        from "../../assets/hubspot.svg";
import imgShopify        from "../../assets/shopify.svg";
import imgLinear         from "../../assets/linear.svg";
import imgTypeform       from "../../assets/typeform.svg";
import imgYouTube        from "../../assets/youtube.png";
import imgReddit         from "../../assets/reddit.svg";
import imgGoogleCalendar from "../../assets/google-calendar.svg";
import imgRss            from "../../assets/rss.svg";
import imgPostgres       from "../../assets/postgresql.svg";
import imgBitcoin        from "../../assets/bitcoin.svg";
import imgSsh            from "../../assets/ssh.svg";
import imgDocker         from "../../assets/docker.svg";
import imgJira           from "../../assets/jira.svg";
import imgTrello         from "../../assets/trello.svg";
import imgFigma          from "../../assets/figma.svg";
import imgGoogleSheets   from "../../assets/google-sheets.svg";
import imgGoogleDrive    from "../../assets/google-drive.svg";
import imgGoogleDocs     from "../../assets/google-docs.svg";
import imgGoogleForms    from "../../assets/google-forms.svg";
import imgOutlook        from "../../assets/outlook.svg";
import imgTeams          from "../../assets/microsoft-teams.svg";
import imgOneDrive       from "../../assets/onedrive.svg";
import imgSharePoint     from "../../assets/sharepoint.svg";
import imgAzureDevOps    from "../../assets/azure-devops.svg";
import imgGitLab         from "../../assets/gitlab.svg";
import imgSentry         from "../../assets/sentry.svg";
import imgVercel         from "../../assets/vercel.svg";
import imgNetlify        from "../../assets/netlify.svg";
import imgCalendly       from "../../assets/calendly.svg";
import imgZendesk        from "../../assets/zendesk.svg";
import imgMailchimp      from "../../assets/mailchimp.svg";
import imgAsana          from "../../assets/asana.svg";
import imgClickUp        from "../../assets/clickup.svg";
import imgMonday         from "../../assets/monday.svg";
import imgLetsEncrypt    from "../../assets/letsencrypt.svg";
import imgHackerNews     from "../../assets/hackernews.svg";
import imgPipedrive      from "../../assets/pipedrive.svg";
import imgDns            from "../../assets/dns.svg";
import imgPortMonitor    from "../../assets/port-monitor.svg";
import imgInstagram      from "../../assets/instagram.svg";
import imgTikTok         from "../../assets/tiktok.svg";

// Config Panels — existing
import TriggerNode          from "./components/nodes/TriggerNode";
import WebhookTriggerNode   from "./components/nodes/WebhookTriggerNode";
import ScheduleTriggerNode  from "./components/nodes/ScheduleTriggerNode";
import ChatTriggerNode      from "./components/nodes/ChatTriggerNode";
import FormTriggerNode      from "./components/nodes/FormTriggerNode";
import GitHubTriggerNode    from "./components/nodes/GitHubTriggerNode";
import StripeTriggerNode    from "./components/nodes/StripeTriggerNode";

// Config Panels — integration triggers (new)
import TelegramTriggerNode  from "./components/nodes/TelegramTriggerNode";
import SlackTriggerNode     from "./components/nodes/SlackTriggerNode";
import DiscordTriggerNode   from "./components/nodes/DiscordTriggerNode";
import GmailTriggerNode     from "./components/nodes/GmailTriggerNode";
import AirtableTriggerNode  from "./components/nodes/AirtableTriggerNode";
import NotionTriggerNode    from "./components/nodes/NotionTriggerNode";
import HubSpotTriggerNode   from "./components/nodes/HubSpotTriggerNode";
import ShopifyTriggerNode   from "./components/nodes/ShopifyTriggerNode";
import LinearTriggerNode    from "./components/nodes/LinearTriggerNode";
import TypeformTriggerNode  from "./components/nodes/TypeformTriggerNode";
import WhatsAppTriggerNode  from "./components/nodes/WhatsAppTriggerNode";
import HttpRequestNode     from "./components/nodes/HttpRequestNode";
import DelayNode           from "./components/nodes/Delaynode";
import InformerNode        from "./components/nodes/InformerNode";
import AIAgentNode         from "./components/nodes/AIAgentNode";
import DataMapperNode      from "./components/nodes/DataMapperNode";
import SetFieldsNode      from "./components/nodes/SetFieldsNode";
import LogicRouterNode     from "./components/nodes/LogicRouterNode";
import CodeNode            from "./components/nodes/CodeNode";
import LoopNode            from "./components/nodes/LoopNode";
import SlackNode           from "./components/nodes/SlackNode";
import DiscordNode         from "./components/nodes/DiscordNode";
import OpenAINode          from "./components/nodes/OpenAINode";
import AnthropicNode       from "./components/nodes/AnthropicNode";
import GeminiNode          from "./components/nodes/GeminiNode";
import TelegramNode        from "./components/nodes/TelegramNode";
import WhatsAppNode        from "./components/nodes/WhatsAppNode";
import AirtableNode        from "./components/nodes/AirtableNode";
import WebSearchNode       from "./components/nodes/WebSearchNode";
import makeOpenAICompatNode from "./components/nodes/OpenAICompatNode";
import DeepSeekNode        from "./components/nodes/DeepSeekNode";
import GoogleSheetsNode    from "./components/nodes/GoogleSheetsNode";
import GmailNode           from "./components/nodes/GmailNode";
import NotionNode          from "./components/nodes/NotionNode";
import TwilioNode          from "./components/nodes/TwilioNode";
import SendGridNode        from "./components/nodes/SendGridNode";
import MergeNode           from "./components/nodes/MergeNode";
import ApprovalNode        from "./components/nodes/ApprovalNode";

// Config Panels — new utility nodes
import FilterArrayNode  from "./components/nodes/FilterArrayNode";
import SortArrayNode    from "./components/nodes/SortArrayNode";
import DeduplicateNode  from "./components/nodes/DeduplicateNode";
import BatchSplitNode   from "./components/nodes/BatchSplitNode";
import CSVParserNode    from "./components/nodes/CSVParserNode";
import DateTimeNode     from "./components/nodes/DateTimeNode";
import CryptoUtilsNode  from "./components/nodes/CryptoUtilsNode";

// Config Panels — new AI specialty nodes
import AIClassifyNode   from "./components/nodes/AIClassifyNode";
import AIExtractNode    from "./components/nodes/AIExtractNode";
import AITransformNode  from "./components/nodes/AITransformNode";

// Config Panels — Innovation Sprint nodes
import QRCodeNode           from "./components/nodes/QRCodeNode";
import TextSplitterNode     from "./components/nodes/TextSplitterNode";
import TemplateRendererNode from "./components/nodes/TemplateRendererNode";
import JSONValidatorNode    from "./components/nodes/JSONValidatorNode";
import SwitchNode           from "./components/nodes/SwitchNode";
import ImageResizeNode      from "./components/nodes/ImageResizeNode";
import AggregateNode        from "./components/nodes/AggregateNode";
import PDFGeneratorNode     from "./components/nodes/PDFGeneratorNode";
import DataDiffNode         from "./components/nodes/DataDiffNode";
import EmailParserNode      from "./components/nodes/EmailParserNode";
import VectorMemoryNode     from "./components/nodes/VectorMemoryNode";
import AIDecisionNode       from "./components/nodes/AIDecisionNode";
import NotificationHubNode  from "./components/nodes/NotificationHubNode";
import BrowserAgentNode     from "./components/nodes/BrowserAgentNode";
import ElevenLabsNode       from "./components/nodes/ElevenLabsNode";
import PineconeNode         from "./components/nodes/PineconeNode";
import ZoomNode             from "./components/nodes/ZoomNode";
import ResendNode           from "./components/nodes/ResendNode";
import OpenAIAssistantNode  from "./components/nodes/OpenAIAssistantNode";
import YouTubeTriggerNode        from "./components/nodes/YouTubeTriggerNode";
import PriceAlertTriggerNode     from "./components/nodes/PriceAlertTriggerNode";
import RedditTriggerNode         from "./components/nodes/RedditTriggerNode";
import GoogleCalendarTriggerNode from "./components/nodes/GoogleCalendarTriggerNode";
import GitHubIssueTriggerNode    from "./components/nodes/GitHubIssueTriggerNode";
import SshTriggerNode              from "./components/nodes/SshTriggerNode";
import DockerTriggerNode           from "./components/nodes/DockerTriggerNode";
import JiraTriggerNode             from "./components/nodes/JiraTriggerNode";
import TrelloTriggerNode           from "./components/nodes/TrelloTriggerNode";
import GoogleSheetsTriggerNode     from "./components/nodes/GoogleSheetsTriggerNode";
import OutlookTriggerNode          from "./components/nodes/OutlookTriggerNode";
import TeamsTriggerNode            from "./components/nodes/TeamsTriggerNode";
import HttpMonitorTriggerNode      from "./components/nodes/HttpMonitorTriggerNode";
import GitLabTriggerNode           from "./components/nodes/GitLabTriggerNode";
import SslTriggerNode              from "./components/nodes/SslTriggerNode";
import DnsTriggerNode              from "./components/nodes/DnsTriggerNode";
import PortMonitorTriggerNode      from "./components/nodes/PortMonitorTriggerNode";
import HackerNewsTriggerNode       from "./components/nodes/HackerNewsTriggerNode";
import PipedriveTriggerNode        from "./components/nodes/PipedriveTriggerNode";
import AsanaTriggerNode            from "./components/nodes/AsanaTriggerNode";
import VirtualComputerNode       from "./components/nodes/VirtualComputerNode";
import makeCodingAgentNode       from "./components/nodes/CodingAgentNode";
import GenericActionNode         from "./components/nodes/GenericActionNode";
// Social Media nodes
import YouTubeUploadNode      from "./components/nodes/YouTubeUploadNode";
import InstagramPostNode      from "./components/nodes/InstagramPostNode";
import TikTokPostNode         from "./components/nodes/TikTokPostNode";
import LinkedInPostNode       from "./components/nodes/LinkedInPostNode";
import TwitterPostNode        from "./components/nodes/TwitterPostNode";
import RssFeedGeneratorNode   from "./components/nodes/RssFeedGeneratorNode";
import BlogPostNode           from "./components/nodes/BlogPostNode";
import ThumbnailGeneratorNode from "./components/nodes/ThumbnailGeneratorNode";
import HashtagSuggesterNode   from "./components/nodes/HashtagSuggesterNode";
import CaptionWriterNode      from "./components/nodes/CaptionWriterNode";
import AudienceInsightsNode   from "./components/nodes/AudienceInsightsNode";
// Design / Creative nodes
import ImageGenerateNode    from "./components/nodes/ImageGenerateNode";
import ImageCaptionNode     from "./components/nodes/ImageCaptionNode";
import RemoveBackgroundNode from "./components/nodes/RemoveBackgroundNode";
import FontPreviewNode      from "./components/nodes/FontPreviewNode";
import ColorPaletteNode     from "./components/nodes/ColorPaletteNode";
import FigmaCommentNode     from "./components/nodes/FigmaCommentNode";
import CanvaExportNode      from "./components/nodes/CanvaExportNode";
// Developer Tools nodes
import EnvVariableNode      from "./components/nodes/EnvVariableNode";
import GraphQLNode          from "./components/nodes/GraphQLNode";
import GrpcNode             from "./components/nodes/GrpcNode";
import SftpNode             from "./components/nodes/SftpNode";
import S3Node               from "./components/nodes/S3Node";
import DockerRunNode        from "./components/nodes/DockerRunNode";
import WebhookResponseNode  from "./components/nodes/WebhookResponseNode";
import NpmPackageInfoNode   from "./components/nodes/NpmPackageInfoNode";
import SemverCompareNode    from "./components/nodes/SemverCompareNode";
// Education / Student nodes
import FlashcardGeneratorNode from "./components/nodes/FlashcardGeneratorNode";
import QuizGeneratorNode      from "./components/nodes/QuizGeneratorNode";
import CitationFormatterNode  from "./components/nodes/CitationFormatterNode";
import GrammarCheckNode       from "./components/nodes/GrammarCheckNode";
import SummarizeNode          from "./components/nodes/SummarizeNode";
import TranslationNode        from "./components/nodes/TranslationNode";
import TextToSpeechNode       from "./components/nodes/TextToSpeechNode";
import SpeechToTextNode       from "./components/nodes/SpeechToTextNode";
import OcrNode                from "./components/nodes/OcrNode";
// Research nodes
import PubMedSearchNode     from "./components/nodes/PubMedSearchNode";
import ArxivSearchNode      from "./components/nodes/ArxivSearchNode";
import WikipediaLookupNode  from "./components/nodes/WikipediaLookupNode";
import DrugLookupNode       from "./components/nodes/DrugLookupNode";
import ClinicalTrialsNode   from "./components/nodes/ClinicalTrialsNode";
import WeatherNode          from "./components/nodes/WeatherNode";
import NewsSearchNode       from "./components/nodes/NewsSearchNode";
import StockPriceNode       from "./components/nodes/StockPriceNode";
import CurrencyExchangeNode from "./components/nodes/CurrencyExchangeNode";
import IpLookupNode         from "./components/nodes/IpLookupNode";
// Data Processing nodes
import NumberFormatNode     from "./components/nodes/NumberFormatNode";
import TextFormatNode       from "./components/nodes/TextFormatNode";
import RegexMatchNode       from "./components/nodes/RegexMatchNode";
import FindReplaceNode      from "./components/nodes/FindReplaceNode";
import HtmlToTextNode       from "./components/nodes/HtmlToTextNode";
import JsonToCsvNode        from "./components/nodes/JsonToCsvNode";
import XmlParserNode        from "./components/nodes/XmlParserNode";
import MarkdownRendererNode from "./components/nodes/MarkdownRendererNode";
import UrlParserNode        from "./components/nodes/UrlParserNode";
import ColorConverterNode   from "./components/nodes/ColorConverterNode";
import UnitConverterNode    from "./components/nodes/UnitConverterNode";
import MathExpressionNode   from "./components/nodes/MathExpressionNode";
import ConditionNode            from "./components/nodes/ConditionNode";
import RetryNode                from "./components/nodes/RetryNode";
import StopErrorNode            from "./components/nodes/StopErrorNode";
import RateLimiterNode          from "./components/nodes/RateLimiterNode";
import WaitForEventNode         from "./components/nodes/WaitForEventNode";
import SuccessFailedNode        from "./components/nodes/SuccessFailedNode";

// Config Panels — Database nodes
import SupabaseNode        from "./components/nodes/SupabaseNode";
import MongoDBNode         from "./components/nodes/MongoDBNode";
import RedisNode           from "./components/nodes/RedisNode";
import FirebaseNode        from "./components/nodes/FirebaseNode";

// Config Panels — new integrations
import GithubNode          from "./components/nodes/GithubNode";
import StripeNode          from "./components/nodes/StripeNode";
import PostgresNode        from "./components/nodes/PostgresNode";
import JiraNode            from "./components/nodes/JiraNode";
import LinearNode          from "./components/nodes/LinearNode";
import GoogleCalendarNode  from "./components/nodes/GoogleCalendarNode";
import GoogleDriveNode     from "./components/nodes/GoogleDriveNode";
import HubSpotNode         from "./components/nodes/HubSpotNode";
import ShopifyNode         from "./components/nodes/ShopifyNode";
import TwitterNode         from "./components/nodes/TwitterNode";

// OpenAI-compatible providers
const PerplexityNode = makeOpenAICompatNode({
  label: "Perplexity", accent: "cyan", subtitle: "Search-augmented AI",
  models: [
    { value: "llama-3-sonar-large-32k-online", label: "Sonar Large 32K" },
    { value: "llama-3-sonar-small-32k-chat",   label: "Sonar Small 32K" },
  ],
  defaultModel: "llama-3-sonar-large-32k-online",
});
const XAINode = makeOpenAICompatNode({
  label: "xAI (Grok)", accent: "zinc", subtitle: "Grok models by xAI",
  models: [
    { value: "grok-beta", label: "Grok Beta" },
    { value: "grok-2",    label: "Grok 2" },
  ],
  defaultModel: "grok-beta",
});

// Category Definitions (ordered for sidebar)
export const CATEGORIES = [
  { id: "trigger",     label: "Triggers",        icon: Zap,         shape: "square" },
  { id: "ai",          label: "AI",              icon: Sparkles,    shape: "glass" },
  { id: "ai_tools",    label: "AI Utilities",    icon: Brain,       shape: "glass" },
  { id: "data",        label: "Data & APIs",     icon: Database,    shape: "sharp" },
  { id: "transform",   label: "Data Processing", icon: Layers,      shape: "sharp" },
  { id: "research",    label: "Research",        icon: Search,      shape: "sharp" },
  { id: "flow",        label: "Flow Control",    icon: GitFork,     shape: "sharp" },
  { id: "code",        label: "Code",            icon: Code2,       shape: "sharp" },
  { id: "integration", label: "Integrations",    icon: Package,     shape: "pill" },
  { id: "devtools",    label: "Developer Tools", icon: Server,      shape: "rounded" },
  { id: "payments",    label: "Payments",        icon: CreditCard,  shape: "rounded" },
  { id: "crm",         label: "CRM & Commerce",  icon: ShoppingBag, shape: "rounded" },
  { id: "social",      label: "Social Media",    icon: Users,       shape: "rounded" },
  { id: "education",   label: "Education & AI",  icon: GraduationCap, shape: "rounded" },
  { id: "design",      label: "Design & Creative", icon: PenTool,    shape: "pill" },
  { id: "social_pub",  label: "Social Media",      icon: Share2,     shape: "rounded" },
];

export const NodeRegistry = {
  // Triggers
  manual: {
    label: "Manual Trigger", icon: MousePointerClick, colorClass: "text-green-400",
    accentColor: "34,197,94", ConfigPanel: TriggerNode, category: "trigger",
  },
  webhook: {
    label: "Webhook Trigger", icon: Webhook, colorClass: "text-blue-400",
    accentColor: "59,130,246", ConfigPanel: WebhookTriggerNode, category: "trigger",
  },
  cron_trigger: {
    label: "Schedule Trigger", icon: Clock, colorClass: "text-amber-400",
    accentColor: "251,191,36", ConfigPanel: ScheduleTriggerNode, category: "trigger",
  },
  chat_trigger: {
    label: "Chat Trigger", icon: MessageSquarePlus, colorClass: "text-pink-400",
    accentColor: "236,72,153", ConfigPanel: ChatTriggerNode, category: "trigger",
  },
  form_trigger: {
    label: "Form Trigger", icon: FileText, colorClass: "text-violet-400",
    accentColor: "167,139,250", ConfigPanel: FormTriggerNode, category: "trigger",
  },
  github_trigger: {
    label: "GitHub Trigger", icon: Github, colorClass: "text-zinc-200", accentColor: "244,244,245",
    logoUrl: imgGitHub, ConfigPanel: GitHubTriggerNode, category: "trigger",
  },
  stripe_trigger: {
    label: "Stripe Trigger", icon: CreditCard, colorClass: "text-[#635BFF]", accentColor: "99,91,255",
    logoUrl: imgStripe, ConfigPanel: StripeTriggerNode, category: "trigger",
  },
  telegram_trigger: {
    label: "Telegram Trigger", icon: Brain, colorClass: "text-[#26A5E4]", accentColor: "38,165,228",
    logoUrl: imgTelegram, ConfigPanel: TelegramTriggerNode, category: "trigger",
  },
  slack_trigger: {
    label: "Slack Trigger", icon: Brain, colorClass: "text-[#E01E5A]", accentColor: "224,30,90",
    logoUrl: imgSlack, ConfigPanel: SlackTriggerNode, category: "trigger",
  },
  discord_trigger: {
    label: "Discord Trigger", icon: Brain, colorClass: "text-[#5865F2]", accentColor: "88,101,242",
    logoUrl: imgDiscord, ConfigPanel: DiscordTriggerNode, category: "trigger",
  },
  gmail_trigger: {
    label: "Gmail Trigger", icon: Brain, colorClass: "text-[#EA4335]", accentColor: "234,67,53",
    logoUrl: imgGmail, ConfigPanel: GmailTriggerNode, category: "trigger",
  },
  airtable_trigger: {
    label: "Airtable Trigger", icon: Brain, colorClass: "text-[#F65858]", accentColor: "246,88,88",
    logoUrl: imgAirtable, ConfigPanel: AirtableTriggerNode, category: "trigger",
  },
  notion_trigger: {
    label: "Notion Trigger", icon: Brain, colorClass: "text-white", accentColor: "255,255,255",
    logoUrl: imgNotion, ConfigPanel: NotionTriggerNode, category: "trigger",
  },
  hubspot_trigger: {
    label: "HubSpot Trigger", icon: Users, colorClass: "text-[#FF7A59]", accentColor: "255,122,89",
    logoUrl: imgHubSpot, ConfigPanel: HubSpotTriggerNode, category: "trigger",
  },
  shopify_trigger: {
    label: "Shopify Trigger", icon: ShoppingBag, colorClass: "text-[#95BF47]", accentColor: "149,191,71",
    logoUrl: imgShopify, ConfigPanel: ShopifyTriggerNode, category: "trigger",
  },
  linear_trigger: {
    label: "Linear Trigger", icon: Circle, colorClass: "text-[#5E6AD2]", accentColor: "94,106,210",
    logoUrl: imgLinear, ConfigPanel: LinearTriggerNode, category: "trigger",
  },
  typeform_trigger: {
    label: "Typeform Trigger", icon: FileText, colorClass: "text-zinc-300", accentColor: "212,212,216",
    logoUrl: imgTypeform, ConfigPanel: TypeformTriggerNode, category: "trigger",
  },
  whatsapp_trigger: {
    label: "WhatsApp Trigger", icon: Brain, colorClass: "text-[#25D366]", accentColor: "37,211,102",
    logoUrl: imgWhatsApp, ConfigPanel: WhatsAppTriggerNode, category: "trigger",
  },

  // AI Models
  openai: {
    label: "OpenAI", icon: Brain, colorClass: "text-[#10A37F]", accentColor: "16,163,127",
    logoUrl: imgOpenAI, ConfigPanel: OpenAINode, category: "ai",
  },
  anthropic: {
    label: "Anthropic", icon: Brain, colorClass: "text-[#D4C1B3]", accentColor: "212,193,179",
    logoUrl: imgAnthropic, ConfigPanel: AnthropicNode, category: "ai",
  },
  gemini: {
    label: "Google Gemini", icon: Brain, colorClass: "text-[#4285F4]", accentColor: "66,133,244",
    logoUrl: imgGemini, ConfigPanel: GeminiNode, category: "ai",
  },
  perplexity: {
    label: "Perplexity", icon: Brain, colorClass: "text-[#22d3ee]", accentColor: "34,211,238",
    logoUrl: imgPerplexity, ConfigPanel: PerplexityNode, category: "ai",
  },
  xai: {
    label: "xAI (Grok)", icon: Sparkles, colorClass: "text-zinc-100", accentColor: "244,244,245",
    logoUrl: imgGrok, ConfigPanel: XAINode, category: "ai",
  },
  deepseek: {
    label: "DeepSeek", icon: Brain, colorClass: "text-[#4D9BF8]", accentColor: "77,155,248",
    logoUrl: imgDeepSeek, ConfigPanel: DeepSeekNode, category: "ai",
  },
  ai_agent: {
    label: "AI Agent", icon: Bot, colorClass: "text-violet-400", accentColor: "139,92,246",
    ConfigPanel: AIAgentNode, category: "ai",
  },

  // AI Tools (specialty)
  ai_classify: {
    label: "AI Classify", icon: Tags, colorClass: "text-violet-400", accentColor: "139,92,246",
    ConfigPanel: AIClassifyNode, category: "ai_tools",
  },
  ai_extract: {
    label: "AI Extract", icon: Scissors, colorClass: "text-sky-400", accentColor: "56,189,248",
    ConfigPanel: AIExtractNode, category: "ai_tools",
  },
  ai_transform: {
    label: "AI Transform", icon: Wand2, colorClass: "text-fuchsia-400", accentColor: "232,121,249",
    ConfigPanel: AITransformNode, category: "ai_tools",
  },

  // Data & APIs
  http_request: {
    label: "HTTP Request", icon: Globe, colorClass: "text-blue-400", accentColor: "59,130,246",
    logoUrl: imgHTTP, ConfigPanel: HttpRequestNode, category: "data",
  },
  postgres: {
    label: "PostgreSQL", icon: Server, colorClass: "text-white", accentColor: "91,155,213",
    logoUrl: imgPostgres, ConfigPanel: PostgresNode, category: "data",
  },
  supabase: {
    label: "Supabase", icon: Database, colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: SupabaseNode, category: "data",
  },
  mongodb: {
    label: "MongoDB", icon: Database, colorClass: "text-[#47A248]", accentColor: "71,162,72",
    ConfigPanel: MongoDBNode, category: "data",
  },
  redis_node: {
    label: "Redis", icon: Server, colorClass: "text-[#FF4438]", accentColor: "255,68,56",
    ConfigPanel: RedisNode, category: "data",
  },
  firebase: {
    label: "Firebase", icon: Database, colorClass: "text-[#FFCA28]", accentColor: "255,202,40",
    ConfigPanel: FirebaseNode, category: "data",
  },

  // Transform (array/data manipulation)
  filter_array: {
    label: "Filter Array", icon: Filter, colorClass: "text-white", accentColor: "244,114,182",
    ConfigPanel: FilterArrayNode, category: "transform",
  },
  sort_array: {
    label: "Sort Array", icon: ArrowUpDown, colorClass: "text-white", accentColor: "34,211,238",
    ConfigPanel: SortArrayNode, category: "transform",
  },
  deduplicate: {
    label: "Deduplicate", icon: Layers, colorClass: "text-white", accentColor: "139,92,246",
    ConfigPanel: DeduplicateNode, category: "transform",
  },
  batch_split: {
    label: "Batch Split", icon: LayoutGrid, colorClass: "text-white", accentColor: "251,146,60",
    ConfigPanel: BatchSplitNode, category: "transform",
  },
  csv_parser: {
    label: "CSV Parser", icon: FileText, colorClass: "text-white", accentColor: "52,211,153",
    ConfigPanel: CSVParserNode, category: "transform",
  },
  date_time: {
    label: "Date / Time", icon: Calendar, colorClass: "text-white", accentColor: "251,191,36",
    ConfigPanel: DateTimeNode, category: "transform",
  },
  crypto_utils: {
    label: "Crypto Utils", icon: Shield, colorClass: "text-white", accentColor: "248,113,113",
    ConfigPanel: CryptoUtilsNode, category: "transform",
  },
  data_mapper: {
    label: "Data Mapper", icon: Database, colorClass: "text-white", accentColor: "52,211,153",
    ConfigPanel: DataMapperNode, category: "transform",
  },
  set_fields: {
    label: "Set Fields", icon: Edit2, colorClass: "text-white", accentColor: "52,211,153",
    ConfigPanel: SetFieldsNode, category: "transform",
  },

  // Research
  web_scraper: {
    label: "Web Scraper", icon: Search, colorClass: "text-white", accentColor: "168,85,247",
    logoUrl: imgComputer, imgFilter: "brightness(0) invert(1)", ConfigPanel: InformerNode, category: "research",
  },
  web_search: {
    label: "Web Search", icon: Globe, colorClass: "text-white", accentColor: "129,140,248",
    ConfigPanel: WebSearchNode, category: "research",
  },
  pubmed_search: {
    label: "PubMed Search", icon: Microscope, colorClass: "text-blue-400", accentColor: "96,165,250",
    ConfigPanel: PubMedSearchNode, category: "research",
    description: "Search biomedical literature via NCBI PubMed",
  },
  arxiv_search: {
    label: "ArXiv Search", icon: Atom, colorClass: "text-rose-400", accentColor: "251,113,133",
    ConfigPanel: ArxivSearchNode, category: "research",
    description: "Search scientific preprints on arXiv.org",
  },
  wikipedia_lookup: {
    label: "Wikipedia Lookup", icon: BookOpen, colorClass: "text-white", accentColor: "161,161,170",
    ConfigPanel: WikipediaLookupNode, category: "research",
    description: "Fetch article summaries from Wikipedia",
  },
  drug_lookup: {
    label: "Drug Lookup", icon: Pill, colorClass: "text-green-400", accentColor: "74,222,128",
    ConfigPanel: DrugLookupNode, category: "research",
    description: "Query FDA drug database via openFDA",
  },
  clinical_trials: {
    label: "Clinical Trials", icon: HeartPulse, colorClass: "text-red-400", accentColor: "248,113,113",
    ConfigPanel: ClinicalTrialsNode, category: "research",
    description: "Search ClinicalTrials.gov database",
  },
  weather: {
    label: "Weather", icon: Thermometer, colorClass: "text-sky-400", accentColor: "56,189,248",
    ConfigPanel: WeatherNode, category: "research",
    description: "Current weather or forecast for any location",
  },
  news_search: {
    label: "News Search", icon: Newspaper, colorClass: "text-orange-400", accentColor: "251,146,60",
    ConfigPanel: NewsSearchNode, category: "research",
    description: "Fetch latest news articles by keyword",
  },
  stock_price: {
    label: "Stock Price", icon: TrendingUp, colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: StockPriceNode, category: "research",
    description: "Live and historical stock data via Alpha Vantage",
  },
  currency_exchange: {
    label: "Currency Exchange", icon: DollarSign, colorClass: "text-yellow-400", accentColor: "250,204,21",
    ConfigPanel: CurrencyExchangeNode, category: "research",
    description: "Live FX rates and currency conversion",
  },
  ip_lookup: {
    label: "IP Lookup", icon: MapPin, colorClass: "text-violet-400", accentColor: "167,139,250",
    ConfigPanel: IpLookupNode, category: "research",
    description: "Geolocation and ISP info from an IP address",
  },

  // Logic & Flow
  logic_router: {
    label: "Logic Router", icon: GitBranch, colorClass: "text-white", accentColor: "236,72,153",
    ConfigPanel: LogicRouterNode, category: "flow",
  },
  delay: {
    label: "Delay", icon: Hourglass, colorClass: "text-white", accentColor: "251,146,60",
    ConfigPanel: DelayNode, category: "flow",
  },
  loop: {
    label: "Loop", icon: Repeat, colorClass: "text-white", accentColor: "251,191,36",
    ConfigPanel: LoopNode, category: "flow",
  },
  merge: {
    label: "Merge", icon: Merge, colorClass: "text-white", accentColor: "45,212,191",
    ConfigPanel: MergeNode, category: "flow",
  },
  approval: {
    label: "Approval Gate", icon: CheckSquare, colorClass: "text-white", accentColor: "250,204,21",
    ConfigPanel: ApprovalNode, category: "flow",
  },

  // Code
  code: {
    label: "Run Code", icon: Code2, colorClass: "text-white", accentColor: "163,230,53",
    logoUrl: imgCode, ConfigPanel: CodeNode, category: "code",
  },

  // Integrations (comms) — all have logoUrl so colorClass is fallback only
  telegram: {
    label: "Telegram", icon: Brain, colorClass: "text-[#26A5E4]", accentColor: "38,165,228",
    logoUrl: imgTelegram, ConfigPanel: TelegramNode, category: "integration",
  },
  whatsapp: {
    label: "WhatsApp", icon: Brain, colorClass: "text-[#25D366]", accentColor: "37,211,102",
    logoUrl: imgWhatsApp, ConfigPanel: WhatsAppNode, category: "integration",
  },
  slack: {
    label: "Slack", icon: Brain, colorClass: "text-[#E01E5A]", accentColor: "224,30,90",
    logoUrl: imgSlack, ConfigPanel: SlackNode, category: "integration",
  },
  discord: {
    label: "Discord", icon: Brain, colorClass: "text-[#5865F2]", accentColor: "88,101,242",
    logoUrl: imgDiscord, ConfigPanel: DiscordNode, category: "integration",
  },
  gmail: {
    label: "Gmail", icon: Brain, colorClass: "text-[#EA4335]", accentColor: "234,67,53",
    logoUrl: imgGmail, ConfigPanel: GmailNode, category: "integration",
  },
  twilio: {
    label: "Twilio", icon: Brain, colorClass: "text-[#F22F46]", accentColor: "242,47,70",
    logoUrl: imgTwilio, ConfigPanel: TwilioNode, category: "integration",
  },
  sendgrid: {
    label: "SendGrid", icon: Brain, colorClass: "text-[#1A82E2]", accentColor: "26,130,226",
    logoUrl: imgSendGrid, ConfigPanel: SendGridNode, category: "integration",
  },
  airtable: {
    label: "Airtable", icon: Brain, colorClass: "text-[#F65858]", accentColor: "246,88,88",
    logoUrl: imgAirtable, ConfigPanel: AirtableNode, category: "integration",
  },
  google_sheets: {
    label: "Google Sheets", icon: Brain, colorClass: "text-[#0F9D58]", accentColor: "15,157,88",
    logoUrl: imgGoogleSheets, ConfigPanel: GoogleSheetsNode, category: "integration",
  },
  notion: {
    label: "Notion", icon: Brain, colorClass: "text-white", accentColor: "255,255,255",
    logoUrl: imgNotion, ConfigPanel: NotionNode, category: "integration",
  },

  // Google Workspace
  google_calendar: {
    label: "Google Calendar", icon: Calendar, colorClass: "text-[#4285F4]", accentColor: "66,133,244",
    logoUrl: imgGoogleCalendar, ConfigPanel: GoogleCalendarNode, category: "integration",
  },
  google_drive: {
    label: "Google Drive", icon: Database, colorClass: "text-[#FBBC04]", accentColor: "251,188,4",
    logoUrl: imgGoogleDrive, ConfigPanel: GoogleDriveNode, category: "integration",
  },

  // Developer Tools
  env_variable: {
    label: "Environment Variable", icon: Key, colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: EnvVariableNode, category: "devtools",
    description: "Inject, read or assert environment variables in the workflow",
  },
  graphql_request: {
    label: "GraphQL Request", icon: GitBranch, colorClass: "text-pink-400", accentColor: "244,114,182",
    ConfigPanel: GraphQLNode, category: "devtools",
    description: "Query or mutate any GraphQL API with variables and auth",
  },
  grpc_call: {
    label: "gRPC Call", icon: Cpu, colorClass: "text-orange-400", accentColor: "251,146,60",
    ConfigPanel: GrpcNode, category: "devtools",
    description: "Invoke a gRPC service method with protobuf payload",
  },
  sftp: {
    label: "SFTP", icon: UploadCloud, colorClass: "text-sky-400", accentColor: "56,189,248",
    ConfigPanel: SftpNode, category: "devtools",
    description: "Upload, download, list or delete files via SFTP",
  },
  s3: {
    label: "S3", icon: DownloadCloud, colorClass: "text-amber-400", accentColor: "251,191,36",
    ConfigPanel: S3Node, category: "devtools",
    description: "AWS S3 (and S3-compatible) object storage — upload, download, presign",
  },
  docker_run: {
    label: "Docker Run", icon: Box, colorClass: "text-blue-400", accentColor: "96,165,250",
    ConfigPanel: DockerRunNode, category: "devtools",
    description: "Spin up a container, run a command and capture stdout/stderr",
  },
  webhook_response: {
    label: "Webhook Response", icon: Send, colorClass: "text-violet-400", accentColor: "167,139,250",
    ConfigPanel: WebhookResponseNode, category: "devtools",
    description: "Send a custom HTTP response to the webhook caller",
  },
  npm_package_info: {
    label: "NPM Package Info", icon: Package, colorClass: "text-red-400", accentColor: "248,113,113",
    ConfigPanel: NpmPackageInfoNode, category: "devtools",
    description: "Fetch version, downloads, license and metadata from npm registry",
  },
  semver_compare: {
    label: "Semver Compare", icon: GitBranch, colorClass: "text-indigo-400", accentColor: "129,140,248",
    ConfigPanel: SemverCompareNode, category: "devtools",
    description: "Compare, sort, validate and coerce semantic version strings",
  },
  github: {
    label: "GitHub", icon: Github, colorClass: "text-zinc-200", accentColor: "244,244,245",
    logoUrl: imgGitHub, ConfigPanel: GithubNode, category: "devtools",
  },
  jira: {
    label: "Jira", icon: Ticket, colorClass: "text-[#2684FF]", accentColor: "38,132,255",
    logoUrl: imgJira, ConfigPanel: JiraNode, category: "devtools",
  },
  linear: {
    label: "Linear", icon: Circle, colorClass: "text-[#5E6AD2]", accentColor: "94,106,210",
    logoUrl: imgLinear, ConfigPanel: LinearNode, category: "devtools",
  },

  // Payments
  stripe: {
    label: "Stripe", icon: CreditCard, colorClass: "text-[#635BFF]", accentColor: "99,91,255",
    logoUrl: imgStripe, ConfigPanel: StripeNode, category: "payments",
  },

  // CRM & E-commerce
  hubspot: {
    label: "HubSpot", icon: Users, colorClass: "text-[#FF7A59]", accentColor: "255,122,89",
    logoUrl: imgHubSpot, ConfigPanel: HubSpotNode, category: "crm",
  },
  shopify: {
    label: "Shopify", icon: ShoppingBag, colorClass: "text-[#95BF47]", accentColor: "149,191,71",
    logoUrl: imgShopify, ConfigPanel: ShopifyNode, category: "crm",
  },

  // Social Media
  twitter: {
    label: "Twitter / X", icon: Twitter, colorClass: "text-[#1DA1F2]", accentColor: "29,161,242",
    ConfigPanel: TwitterNode, category: "social",
  },

  // ── New Triggers ───────────────────────────────────────────────────────────
  youtube_trigger: {
    label: "YouTube Trigger", icon: Youtube, colorClass: "text-red-400", accentColor: "248,113,113",
    logoUrl: imgYouTube, ConfigPanel: YouTubeTriggerNode, category: "trigger",
  },
  price_alert_trigger: {
    label: "Price Alert Trigger", icon: TrendingUp, colorClass: "text-yellow-400", accentColor: "250,204,21",
    logoUrl: imgBitcoin, ConfigPanel: PriceAlertTriggerNode, category: "trigger",
  },
  reddit_trigger: {
    label: "Reddit Trigger", icon: MessageSquarePlus, colorClass: "text-orange-400", accentColor: "251,146,60",
    logoUrl: imgReddit, ConfigPanel: RedditTriggerNode, category: "trigger",
  },
  google_calendar_trigger: {
    label: "Google Calendar Trigger", icon: Calendar, colorClass: "text-[#4285F4]", accentColor: "66,133,244",
    logoUrl: imgGoogleCalendar, ConfigPanel: GoogleCalendarTriggerNode, category: "trigger",
  },
  github_issue_trigger: {
    label: "GitHub Issue / PR Trigger", icon: Github, colorClass: "text-zinc-200", accentColor: "244,244,245",
    logoUrl: imgGitHub, ConfigPanel: GitHubIssueTriggerNode, category: "trigger",
  },
  ssh_trigger: {
    label: "SSH Command", icon: Github, colorClass: "text-zinc-300", accentColor: "212,212,216",
    logoUrl: imgSsh, ConfigPanel: SshTriggerNode, category: "trigger",
  },
  docker_trigger: {
    label: "Docker Event", icon: Github, colorClass: "text-[#2496ED]", accentColor: "36,150,237",
    logoUrl: imgDocker, ConfigPanel: DockerTriggerNode, category: "trigger",
  },
  jira_trigger: {
    label: "Jira Issue", icon: Github, colorClass: "text-[#0052CC]", accentColor: "0,82,204",
    logoUrl: imgJira, ConfigPanel: JiraTriggerNode, category: "trigger",
  },
  trello_trigger: {
    label: "Trello Card", icon: Github, colorClass: "text-[#0052CC]", accentColor: "0,82,204",
    logoUrl: imgTrello, ConfigPanel: TrelloTriggerNode, category: "trigger",
  },
  google_sheets_trigger: {
    label: "Google Sheets", icon: Github, colorClass: "text-[#34A853]", accentColor: "52,168,83",
    logoUrl: imgGoogleSheets, ConfigPanel: GoogleSheetsTriggerNode, category: "trigger",
  },
  outlook_trigger: {
    label: "Outlook Email", icon: Github, colorClass: "text-[#0078D4]", accentColor: "0,120,212",
    logoUrl: imgOutlook, ConfigPanel: OutlookTriggerNode, category: "trigger",
  },
  teams_trigger: {
    label: "Microsoft Teams", icon: Github, colorClass: "text-[#6264A7]", accentColor: "98,100,167",
    logoUrl: imgTeams, ConfigPanel: TeamsTriggerNode, category: "trigger",
  },
  http_monitor_trigger: {
    label: "HTTP Monitor", icon: Github, colorClass: "text-red-400", accentColor: "248,113,113",
    logoUrl: imgVercel, ConfigPanel: HttpMonitorTriggerNode, category: "trigger",
  },
  gitlab_trigger: {
    label: "GitLab", icon: Github, colorClass: "text-[#FC6D26]", accentColor: "252,109,38",
    logoUrl: imgGitLab, ConfigPanel: GitLabTriggerNode, category: "trigger",
  },
  ssl_trigger: {
    label: "SSL Cert Expiry", icon: Shield, colorClass: "text-green-400", accentColor: "74,222,128",
    logoUrl: imgLetsEncrypt, ConfigPanel: SslTriggerNode, category: "trigger",
  },
  dns_trigger: {
    label: "DNS Record Change", icon: Globe, colorClass: "text-sky-400", accentColor: "56,189,248",
    logoUrl: imgDns, ConfigPanel: DnsTriggerNode, category: "trigger",
  },
  port_monitor_trigger: {
    label: "Port Monitor", icon: Webhook, colorClass: "text-violet-400", accentColor: "167,139,250",
    logoUrl: imgPortMonitor, ConfigPanel: PortMonitorTriggerNode, category: "trigger",
  },
  hackernews_trigger: {
    label: "Hacker News", icon: MessageSquarePlus, colorClass: "text-orange-400", accentColor: "251,146,60",
    logoUrl: imgHackerNews, ConfigPanel: HackerNewsTriggerNode, category: "trigger",
  },
  pipedrive_trigger: {
    label: "Pipedrive", icon: Users, colorClass: "text-[#F55137]", accentColor: "245,81,55",
    logoUrl: imgPipedrive, ConfigPanel: PipedriveTriggerNode, category: "trigger",
  },
  asana_trigger: {
    label: "Asana", icon: Circle, colorClass: "text-[#F06A6A]", accentColor: "240,106,106",
    logoUrl: imgAsana, ConfigPanel: AsanaTriggerNode, category: "trigger",
  },

  // ── New Utility Nodes ──────────────────────────────────────────────────────
  qr_code: {
    label: "QR Code", icon: QrCode, colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: QRCodeNode, category: "transform",
  },
  text_splitter: {
    label: "Text Splitter", icon: SplitSquareHorizontal, colorClass: "text-sky-400", accentColor: "56,189,248",
    ConfigPanel: TextSplitterNode, category: "transform",
  },
  template_renderer: {
    label: "Template Renderer", icon: AlignLeft, colorClass: "text-amber-400", accentColor: "251,191,36",
    ConfigPanel: TemplateRendererNode, category: "transform",
  },
  json_validator: {
    label: "JSON Validator", icon: CheckCircle2, colorClass: "text-red-400", accentColor: "248,113,113",
    ConfigPanel: JSONValidatorNode, category: "transform",
  },
  switch: {
    label: "Switch", icon: GitFork, colorClass: "text-pink-400", accentColor: "244,114,182",
    ConfigPanel: SwitchNode, category: "flow",
  },
  image_resize: {
    label: "Image Resize", icon: Image, colorClass: "text-fuchsia-400", accentColor: "232,121,249",
    ConfigPanel: ImageResizeNode, category: "transform",
  },
  aggregate: {
    label: "Aggregate", icon: Package, colorClass: "text-teal-400", accentColor: "45,212,191",
    ConfigPanel: AggregateNode, category: "flow",
  },
  pdf_generator: {
    label: "PDF Generator", icon: FileOutput, colorClass: "text-rose-400", accentColor: "251,113,133",
    ConfigPanel: PDFGeneratorNode, category: "transform",
  },
  data_diff: {
    label: "Data Diff", icon: Layers, colorClass: "text-indigo-400", accentColor: "129,140,248",
    ConfigPanel: DataDiffNode, category: "transform",
  },

  // ── AI Innovated Nodes ───────────────────────────────────────────────────
  email_parser: {
    label: "Email Parser", icon: Mail, colorClass: "text-sky-400", accentColor: "56,189,248",
    ConfigPanel: EmailParserNode, category: "ai_tools",
  },
  vector_memory: {
    label: "Vector Memory", icon: Database, colorClass: "text-amber-400", accentColor: "251,191,36",
    ConfigPanel: VectorMemoryNode, category: "ai_tools",
  },
  ai_decision: {
    label: "AI Decision", icon: CheckCircle2, colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: AIDecisionNode, category: "ai_tools",
  },
  notification_hub: {
    label: "Notification Hub", icon: Zap, colorClass: "text-pink-400", accentColor: "244,114,182",
    ConfigPanel: NotificationHubNode, category: "integration",
  },
  browser_agent: {
    label: "Browser Agent", icon: Globe, colorClass: "text-violet-400", accentColor: "139,92,246",
    ConfigPanel: BrowserAgentNode, category: "ai",
  },

  // ── Coding Agents ─────────────────────────────────────────────────────────
  claude_code: {
    label: "Claude Code", icon: Brain, logoUrl: imgAnthropic,
    colorClass: "text-[#D4C1B3]", accentColor: "212,193,179",
    ConfigPanel: makeCodingAgentNode({ label: "Claude Code", accent: "orange", credentialType: "Anthropic", defaultModel: "claude-sonnet-4-20250514", models: [{ value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4.6" }, { value: "claude-opus-4-20250514", label: "Claude Opus 4" }, { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" }] }),
    category: "code",
  },
  codex: {
    label: "Codex", icon: Brain, logoUrl: imgOpenAI,
    colorClass: "text-[#10A37F]", accentColor: "16,163,127",
    ConfigPanel: makeCodingAgentNode({ label: "Codex (GPT-4o)", accent: "emerald", credentialType: "OpenAI", defaultModel: "gpt-4o", models: [{ value: "gpt-4o", label: "GPT-4o" }, { value: "gpt-4o-mini", label: "GPT-4o Mini" }, { value: "o4-mini", label: "o4-mini" }] }),
    category: "code",
  },
  gemini_cli: {
    label: "Gemini CLI", icon: Brain, logoUrl: imgGemini,
    colorClass: "text-[#4285F4]", accentColor: "66,133,244",
    ConfigPanel: makeCodingAgentNode({ label: "Gemini CLI", accent: "blue", credentialType: "Gemini", defaultModel: "gemini-2.0-flash", models: [{ value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" }, { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" }, { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" }] }),
    category: "code",
  },
  groq: {
    label: "Groq", icon: Zap, logoUrl: imgGrok,
    colorClass: "text-[#F55036]", accentColor: "245,80,54",
    ConfigPanel: makeCodingAgentNode({ label: "Groq", accent: "red", credentialType: "Groq", defaultModel: "llama-3.3-70b-versatile", models: [{ value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" }, { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" }, { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fast)" }] }),
    category: "code",
  },
  ollama: {
    label: "Ollama", icon: Server,
    colorClass: "text-zinc-300", accentColor: "212,212,216",
    ConfigPanel: makeCodingAgentNode({ label: "Ollama (Local)", accent: "zinc", defaultModel: "llama3.2", hasBaseUrl: true }),
    category: "code",
  },
  github_copilot: {
    label: "GitHub Copilot", icon: Github,
    colorClass: "text-zinc-200", accentColor: "244,244,245",
    ConfigPanel: makeCodingAgentNode({ label: "GitHub Copilot", accent: "zinc", credentialType: "GitHub", defaultModel: "gpt-4o", models: [{ value: "gpt-4o", label: "GPT-4o (Copilot)" }] }),
    category: "code",
  },

  virtual_computer: {
    label: "Virtual Computer", icon: Server, logoUrl: imgComputer,
    colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: VirtualComputerNode, category: "code",
  },

  // ── New Integration Nodes ──────────────────────────────────────────────────
  elevenlabs: {
    label: "ElevenLabs", icon: Mic2, colorClass: "text-violet-400", accentColor: "167,139,250",
    ConfigPanel: ElevenLabsNode, category: "integration",
  },
  pinecone: {
    label: "Pinecone", icon: Box, colorClass: "text-green-400", accentColor: "74,222,128",
    ConfigPanel: PineconeNode, category: "data",
  },
  zoom: {
    label: "Zoom", icon: Video, colorClass: "text-blue-400", accentColor: "96,165,250",
    ConfigPanel: ZoomNode, category: "integration",
  },
  resend: {
    label: "Resend", icon: Mail, colorClass: "text-orange-400", accentColor: "251,146,60",
    ConfigPanel: ResendNode, category: "integration",
  },
  openai_assistant: {
    label: "OpenAI Assistants", icon: Brain, colorClass: "text-[#10A37F]", accentColor: "16,163,127",
    ConfigPanel: OpenAIAssistantNode, category: "ai",
  },

  // ── Social Media Publishing Nodes ────────────────────────────────────────
  youtube_upload: {
    label: "YouTube Upload", icon: Youtube, colorClass: "text-red-400", accentColor: "248,113,113",
    logoUrl: imgYouTube, ConfigPanel: YouTubeUploadNode, category: "social_pub",
    description: "Upload a video to YouTube with title, tags, privacy and playlist",
  },
  instagram_post: {
    label: "Instagram Post", icon: Camera, colorClass: "text-pink-400", accentColor: "244,114,182",
    logoUrl: imgInstagram, ConfigPanel: InstagramPostNode, category: "social_pub",
    description: "Post image, reel, carousel or story via Instagram Graph API",
  },
  tiktok_post: {
    label: "TikTok Post", icon: Video, colorClass: "text-white", accentColor: "238,29,82",
    logoUrl: imgTikTok, ConfigPanel: TikTokPostNode, category: "social_pub",
    description: "Publish a video to TikTok via Content Posting API",
  },
  linkedin_post: {
    label: "LinkedIn Post", icon: Users, colorClass: "text-[#0A66C2]", accentColor: "10,102,194",
    ConfigPanel: LinkedInPostNode, category: "social_pub",
    description: "Publish text, image, video, article or document to LinkedIn",
  },
  twitter_post: {
    label: "Twitter / X Post", icon: Twitter, colorClass: "text-white", accentColor: "228,228,231",
    ConfigPanel: TwitterPostNode, category: "social_pub",
    description: "Post tweets, threads, replies and quotes via API v2",
  },
  rss_feed_generator: {
    label: "RSS Feed Generator", icon: Rss, colorClass: "text-orange-400", accentColor: "251,146,60",
    ConfigPanel: RssFeedGeneratorNode, category: "social_pub",
    description: "Create and manage your own RSS 2.0 feed",
  },
  blog_post: {
    label: "Blog Post", icon: Newspaper, colorClass: "text-white", accentColor: "161,161,170",
    ConfigPanel: BlogPostNode, category: "social_pub",
    description: "Publish or draft posts to Ghost or WordPress",
  },
  thumbnail_generator: {
    label: "Thumbnail Generator", icon: Image, colorClass: "text-red-400", accentColor: "248,113,113",
    ConfigPanel: ThumbnailGeneratorNode, category: "social_pub",
    description: "AI-generate a platform-optimized thumbnail with face, logo and title",
  },
  hashtag_suggester: {
    label: "Hashtag Suggester", icon: Hash, colorClass: "text-violet-400", accentColor: "167,139,250",
    ConfigPanel: HashtagSuggesterNode, category: "social_pub",
    description: "AI suggests viral, niche or trending hashtags for any platform",
  },
  caption_writer: {
    label: "Caption Writer", icon: Edit2, colorClass: "text-pink-400", accentColor: "244,114,182",
    ConfigPanel: CaptionWriterNode, category: "social_pub",
    description: "AI writes scroll-stopping captions with tone, CTA and emoji control",
  },
  audience_insights: {
    label: "Audience Insights", icon: BarChart2, colorClass: "text-blue-400", accentColor: "96,165,250",
    ConfigPanel: AudienceInsightsNode, category: "social_pub",
    description: "Pull analytics from Instagram, YouTube, Twitter, LinkedIn or TikTok",
  },

  // ── Design & Creative Nodes ──────────────────────────────────────────────
  image_generate: {
    label: "Image Generate", icon: Image, colorClass: "text-fuchsia-400", accentColor: "232,121,249",
    ConfigPanel: ImageGenerateNode, category: "design",
    description: "Generate images with DALL-E 3, Stable Diffusion or FLUX",
  },
  image_caption: {
    label: "Image Caption", icon: Camera, colorClass: "text-violet-400", accentColor: "167,139,250",
    ConfigPanel: ImageCaptionNode, category: "design",
    description: "AI describe, tag, OCR or ask questions about an image",
  },
  remove_background: {
    label: "Remove Background", icon: Scissors, colorClass: "text-pink-400", accentColor: "244,114,182",
    ConfigPanel: RemoveBackgroundNode, category: "design",
    description: "Strip image background, replace with transparent, color or image",
  },
  font_preview: {
    label: "Font Preview", icon: PenTool, colorClass: "text-amber-400", accentColor: "251,191,36",
    ConfigPanel: FontPreviewNode, category: "design",
    description: "Render text in any Google Font and export as PNG",
  },
  color_palette: {
    label: "Color Palette", icon: Palette, colorClass: "text-fuchsia-400", accentColor: "232,121,249",
    ConfigPanel: ColorPaletteNode, category: "design",
    description: "Generate a color palette from a prompt, image or seed color",
  },
  figma_comment: {
    label: "Figma Comment", icon: MessageCircle, colorClass: "text-[#F24E1E]", accentColor: "242,78,30",
    logoUrl: imgFigma, ConfigPanel: FigmaCommentNode, category: "design",
    description: "Post, reply, list or resolve comments on a Figma file",
  },
  canva_export: {
    label: "Canva Export", icon: Film, colorClass: "text-blue-400", accentColor: "96,165,250",
    ConfigPanel: CanvaExportNode, category: "design",
    description: "Export a Canva design as PDF, PNG, JPG, MP4, GIF or PPTX",
  },

  // ── Education & AI Nodes ─────────────────────────────────────────────────
  flashcard_generator: {
    label: "Flashcard Generator", icon: BookMarked, colorClass: "text-violet-400", accentColor: "167,139,250",
    ConfigPanel: FlashcardGeneratorNode, category: "education",
    description: "AI-powered study cards from any text",
  },
  quiz_generator: {
    label: "Quiz Generator", icon: ListChecks, colorClass: "text-amber-400", accentColor: "251,191,36",
    ConfigPanel: QuizGeneratorNode, category: "education",
    description: "Generate MCQs, true/false and short answer questions",
  },
  citation_formatter: {
    label: "Citation Formatter", icon: GraduationCap, colorClass: "text-indigo-400", accentColor: "129,140,248",
    ConfigPanel: CitationFormatterNode, category: "education",
    description: "Format references in APA, MLA, Chicago, IEEE and more",
  },
  grammar_check: {
    label: "Grammar Check", icon: CheckSquare, colorClass: "text-green-400", accentColor: "74,222,128",
    ConfigPanel: GrammarCheckNode, category: "education",
    description: "Correct grammar, spelling and writing style with AI",
  },
  summarize: {
    label: "Summarize", icon: AlignLeft, colorClass: "text-cyan-400", accentColor: "34,211,238",
    ConfigPanel: SummarizeNode, category: "education",
    description: "AI summarization in paragraph, bullets or TL;DR format",
  },
  translation: {
    label: "Translation", icon: Languages, colorClass: "text-blue-400", accentColor: "96,165,250",
    ConfigPanel: TranslationNode, category: "education",
    description: "Translate text between 25+ languages via OpenAI, Google or DeepL",
  },
  text_to_speech: {
    label: "Text to Speech", icon: Headphones, colorClass: "text-purple-400", accentColor: "167,139,250",
    ConfigPanel: TextToSpeechNode, category: "education",
    description: "Convert text to natural-sounding audio via Whisper, ElevenLabs or Google",
  },
  speech_to_text: {
    label: "Speech to Text", icon: Mic2, colorClass: "text-rose-400", accentColor: "251,113,133",
    ConfigPanel: SpeechToTextNode, category: "education",
    description: "Transcribe audio to text via Whisper, Google or AssemblyAI",
  },
  ocr: {
    label: "OCR", icon: ScanLine, colorClass: "text-teal-400", accentColor: "45,212,191",
    ConfigPanel: OcrNode, category: "education",
    description: "Extract text from images and scanned documents",
  },

  // ── Data Processing Nodes ────────────────────────────────────────────────
  number_format: {
    label: "Number Format", icon: Hash, colorClass: "text-blue-400", accentColor: "96,165,250",
    ConfigPanel: NumberFormatNode, category: "transform",
    description: "Round, format currency, fixed decimals, percentage",
  },
  text_format: {
    label: "Text Format", icon: CaseSensitive, colorClass: "text-white", accentColor: "167,139,250",
    ConfigPanel: TextFormatNode, category: "transform",
    description: "Uppercase, lowercase, trim, slug, truncate text",
  },
  regex_match: {
    label: "Regex Match", icon: Regex, colorClass: "text-pink-400", accentColor: "244,114,182",
    ConfigPanel: RegexMatchNode, category: "transform",
    description: "Test or extract patterns with regular expressions",
  },
  find_replace: {
    label: "Find & Replace", icon: Replace, colorClass: "text-white", accentColor: "251,146,60",
    ConfigPanel: FindReplaceNode, category: "transform",
    description: "Search and substitute text, supports regex",
  },
  html_to_text: {
    label: "HTML to Text", icon: FileText, colorClass: "text-white", accentColor: "34,211,238",
    ConfigPanel: HtmlToTextNode, category: "transform",
    description: "Strip HTML tags and extract clean plain text",
  },
  json_to_csv: {
    label: "JSON ↔ CSV", icon: Table2, colorClass: "text-white", accentColor: "52,211,153",
    ConfigPanel: JsonToCsvNode, category: "transform",
    description: "Convert between JSON arrays and CSV format",
  },
  xml_parser: {
    label: "XML Parser", icon: Code2, colorClass: "text-white", accentColor: "251,191,36",
    ConfigPanel: XmlParserNode, category: "transform",
    description: "Parse XML to JSON or build XML from JSON",
  },
  markdown_renderer: {
    label: "Markdown Renderer", icon: BookOpen, colorClass: "text-white", accentColor: "129,140,248",
    ConfigPanel: MarkdownRendererNode, category: "transform",
    description: "Convert markdown to HTML",
  },
  url_parser: {
    label: "URL Parser", icon: Link2, colorClass: "text-white", accentColor: "56,189,248",
    ConfigPanel: UrlParserNode, category: "transform",
    description: "Extract domain, path, params from a URL",
  },
  color_converter: {
    label: "Color Converter", icon: Palette, colorClass: "text-white", accentColor: "232,121,249",
    ConfigPanel: ColorConverterNode, category: "transform",
    description: "Convert between HEX, RGB, HSL, HSV color formats",
  },
  unit_converter: {
    label: "Unit Converter", icon: ArrowRightLeft, colorClass: "text-white", accentColor: "45,212,191",
    ConfigPanel: UnitConverterNode, category: "transform",
    description: "Convert weight, length, temperature, volume and more",
  },
  math_expression: {
    label: "Math Expression", icon: Sigma, colorClass: "text-white", accentColor: "250,204,21",
    ConfigPanel: MathExpressionNode, category: "transform",
    description: "Evaluate a safe mathematical formula",
  },

  // ── Flow Control Nodes ────────────────────────────────────────────────────
  condition: {
    label: "Condition", icon: CheckCheck, colorClass: "text-emerald-400", accentColor: "52,211,153",
    ConfigPanel: ConditionNode, category: "flow",
    description: "Branch into True or False path based on a condition",
  },
  success_failed: {
    label: "Success / Failed", icon: CheckCircle2, colorClass: "text-white", accentColor: "161,161,170",
    ConfigPanel: SuccessFailedNode, category: "flow",
    description: "Explicitly mark this branch as succeeded or failed",
  },
  wait_for_event: {
    label: "Wait for Event", icon: Clock, colorClass: "text-sky-400", accentColor: "56,189,248",
    ConfigPanel: WaitForEventNode, category: "flow",
    description: "Pause workflow until a webhook or condition is met",
  },
  retry: {
    label: "Retry", icon: RotateCcw, colorClass: "text-amber-400", accentColor: "251,191,36",
    ConfigPanel: RetryNode, category: "flow",
    description: "Retry the previous node N times on failure",
  },
  stop_error: {
    label: "Stop & Error", icon: XCircle, colorClass: "text-red-400", accentColor: "239,68,68",
    ConfigPanel: StopErrorNode, category: "flow",
    description: "Halt the workflow and throw a custom error",
  },
  rate_limiter: {
    label: "Rate Limiter", icon: Timer, colorClass: "text-orange-400", accentColor: "251,146,60",
    ConfigPanel: RateLimiterNode, category: "flow",
    description: "Throttle workflow to N executions per time window",
  },
};
