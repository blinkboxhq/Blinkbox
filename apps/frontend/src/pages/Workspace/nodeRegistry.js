import {
  Zap,
  Globe,
  Hourglass,
  Search,
  Database,
  Bot,
  GitBranch,
  Code2,
  Repeat,
  Sparkles,
  MousePointerClick,
  Webhook,
  Clock,
  Brain,
  Filter,
  ArrowUpDown,
  Layers,
  LayoutGrid,
  FileText,
  ClipboardList,
  Calendar,
  Shield,
  Tags,
  Scissors,
  Wand2,
  Github,
  CreditCard,
  Ticket,
  Circle,
  ShoppingBag,
  Twitter,
  Users,
  Merge,
  CheckSquare,
  Server,
  AlignLeft,
  GitFork,
  Image,
  Package,
  FileOutput,
  Mic2,
  Box,
  Video,
  MessageSquare,
  MessageSquarePlus,
  TrendingUp,
  Youtube,
  Mail,
  Edit2,
  // Flow control
  CheckCheck,
  RotateCcw,
  Timer,
  // New icons
  ToggleLeft,
  Hash,
  Sigma,
  Table2,
  HeartPulse,
  FlaskConical,
  GraduationCap,
  Briefcase,
  Gamepad2,
  Camera,
  Music,
  DollarSign,
  BarChart2,
  PieChart,
  LineChart,
  MapPin,
  Languages,
  Rss,
  Bell,
  BellOff,
  UploadCloud,
  DownloadCloud,
  FolderOpen,
  Archive,
  Trash2,
  RefreshCw,
  StickyNote,
  ListChecks,
  Clipboard,
  Send,
  PhoneCall,
  MessageCircle,
  UserPlus,
  UserMinus,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  Activity,
  Pill,
  Stethoscope,
  Microscope,
  Dna,
  Atom,
  Calculator,
  PenTool,
  Film,
  Headphones,
  Radio,
  Podcast,
  BookMarked,
  Newspaper,
  Trophy,
  Star,
  Heart,
  ThumbsUp,
  Share2,
  Link2,
  ExternalLink,
  Download,
  Upload,
  Printer,
  ScanLine,
  Barcode,
  CaseSensitive,
  Regex,
  Split,
  Combine,
  Fingerprint,
  Triangle,
  AlertTriangle,
  Terminal,
  Network,
  Wrench,
  Monitor,
  Braces,
} from "lucide-react";

// Local asset icons
import imgOpenAI from "@nodes/openai/logo.svg";
import imgAnthropic from "@nodes/anthropic/logo.svg";
import imgGemini from "@nodes/gemini/logo.svg";
import imgPerplexity from "../../assets/perplexity-color.svg";
import imgDeepSeek from "@nodes/deepseek/logo.svg";
import imgGrok from "../../assets/grok-color.svg";
import imgNvidiaNim from "@nodes/nvidia_nim/logo.svg";
import imgRedis from "@nodes/redis/logo.svg";
import imgMongoDB from "@nodes/mongodb/logo.svg";
import imgSupabase from "@nodes/supabase/logo.svg";
import imgPinecone from "@nodes/pinecone/logo.svg";
import imgZep from "@nodes/agent_memory/logo-zep.svg";
import imgComputer from "../../assets/computer.png";
import imgHTTP from "@nodes/http_request/logo.svg";
import imgCode from "@nodes/code/logo.svg";
import imgAirtable from "@nodes/airtable/logo.svg";
import imgNotion from "@nodes/notion/logo.svg";
import imgSendGrid from "@nodes/sendgrid/logo.svg";
import imgTwilio from "@nodes/twilio/logo.svg";
import imgSlack from "@nodes/slack/logo.png";
import imgDiscord from "@nodes/discord/logo.png";
import imgTelegram from "@nodes/telegram/logo.png";
import imgWhatsApp from "@nodes/whatsapp/logo.png";
import imgGmail from "@nodes/gmail/logo.png";
import imgGitHub from "@nodes/github/logo.svg";
import imgStripe from "@nodes/stripe/logo.svg";
import imgHubSpot from "@nodes/hubspot/logo.svg";
import imgShopify from "@nodes/shopify/logo.svg";
import imgLinear from "@nodes/linear/logo.svg";
import imgTypeform from "@nodes/typeform/logo.svg";
import imgYouTube from "@nodes/youtube/logo.png";
import imgReddit from "@nodes/reddit/logo.svg";
import imgGoogleCalendar from "@nodes/google_calendar/logo.svg";
import imgRss from "@nodes/rss_feed/logo.svg";
import imgPostgres from "@nodes/postgres/logo.svg";
import imgSsh from "@triggers/ssh/logo.svg";
import imgDocker from "@triggers/docker/logo.svg";
import imgJira from "@nodes/jira/logo.svg";
import imgTrello from "@nodes/trello/logo.svg";
import imgFigma from "@nodes/figma/logo.svg";
import imgGoogleSheets from "@nodes/google_sheets/logo.svg";
import imgGoogleDrive from "@nodes/google_drive/logo.svg";
import imgGoogleDocs from "@nodes/google_docs/logo.svg";
import imgGoogleForms from "@nodes/google_forms/logo.svg";
import imgOutlook from "@nodes/outlook/logo.svg";
import imgTeams from "@nodes/teams/logo.svg";
import imgOneDrive from "@nodes/onedrive/logo.svg";
import imgSharePoint from "@nodes/sharepoint/logo.svg";
import imgAzureDevOps from "@nodes/azure_devops/logo.svg";
import imgGitLab from "@nodes/gitlab/logo.svg";
import imgSentry from "@nodes/sentry/logo.svg";
import imgVercel from "@nodes/vercel/logo.svg";
import imgNetlify from "@nodes/netlify/logo.svg";
import imgCalendly from "@nodes/calendly/logo.svg";
import imgZendesk from "@nodes/zendesk/logo.svg";
import imgMailchimp from "@nodes/mailchimp/logo.svg";
import imgAsana from "@nodes/asana/logo.svg";
import imgClickUp from "@nodes/clickup/logo.svg";
import imgMonday from "@nodes/monday/logo.svg";
import imgLetsEncrypt from "@triggers/ssl/logo.svg";
import imgPipedrive from "@nodes/pipedrive/logo.svg";
import imgIntercom from "@nodes/intercom/logo.svg";
import imgWooCommerce from "@nodes/woocommerce/logo.svg";
import imgPagerDuty from "@nodes/pagerduty/logo.svg";
import imgDatadog from "@nodes/datadog/logo.svg";
import imgElevenLabs from "@nodes/elevenlabs/logo.svg";
import imgZoom from "@nodes/zoom/logo.svg";
import imgResend from "@nodes/resend/logo.svg";
import imgGoogle from "../../assets/google-search.svg";
import imgJS from "../../assets/javascript.svg";
import imgFirebase from "@nodes/firebase/logo.svg";
import imgAWS from "@nodes/s3/logo.svg";
import imgInstagram from "@nodes/instagram/logo.svg";
import imgTikTok from "@nodes/tiktok/logo.svg";
import imgLinkedIn from "@nodes/linkedin/logo.svg";
import imgTavily from "../../assets/tavily.svg";
import imgKimi from "@nodes/moonshot/logo.svg";
import imgOpenRouter from "@/assets/logos/openrouter.svg";
import imgZai from "@/assets/logos/zai.svg";
import imgMiniMax from "@/assets/logos/minimax-color.svg";
import imgSakana from "@/assets/logos/sakana.svg";
import imgMCP from "../../assets/mcp.svg";
import imgWebhookTrigger from "@triggers/webhook/logo.png";
import imgFormTrigger from "@triggers/form/logo.png";
import imgImap from "@triggers/imap/logo.svg";
import imgDbTrigger from "@triggers/db/logo.svg";
import imgDnsTrigger from "@triggers/dns/logo.svg";
import imgGitHubIssueTrigger from "@triggers/github_issue/logo.svg";
import imgHackerNewsTrigger from "@triggers/hackernews/logo.svg";
import imgHttpMonitorTrigger from "@triggers/http_monitor/logo.svg";
import imgPortMonitorTrigger from "@triggers/port_monitor/logo.svg";
import imgPriceAlertTrigger from "@triggers/price_alert/logo.svg";

// Config Panels — existing
import TriggerNode from "@triggers/manual/ConfigPanel.jsx";
import WebhookTriggerNode from "@triggers/webhook/ConfigPanel.jsx";
import ScheduleTriggerNode from "@triggers/cron/ConfigPanel.jsx";
import ChatTriggerNode from "@triggers/chat/ConfigPanel.jsx";
import FormTriggerNode from "@triggers/form/ConfigPanel.jsx";
import GitHubTriggerNode from "@triggers/github/ConfigPanel.jsx";
import StripeTriggerNode from "@triggers/stripe/ConfigPanel.jsx";

// Config Panels — integration triggers (new)
import TelegramTriggerNode from "@triggers/telegram/ConfigPanel.jsx";
import SlackTriggerNode from "@triggers/slack/ConfigPanel.jsx";
import DiscordTriggerNode from "@triggers/discord/ConfigPanel.jsx";
import GmailTriggerNode from "@triggers/gmail/ConfigPanel.jsx";
import AirtableTriggerNode from "@triggers/airtable/ConfigPanel.jsx";
import NotionTriggerNode from "@triggers/notion/ConfigPanel.jsx";
import HubSpotTriggerNode from "@triggers/hubspot/ConfigPanel.jsx";
import ShopifyTriggerNode from "@triggers/shopify/ConfigPanel.jsx";
import LinearTriggerNode from "@triggers/linear/ConfigPanel.jsx";
import TypeformTriggerNode from "@triggers/typeform/ConfigPanel.jsx";
import JotformTriggerNode from "@triggers/jotform/ConfigPanel.jsx";
import WhatsAppTriggerNode from "@triggers/whatsapp/ConfigPanel.jsx";
import HttpRequestNode from "@nodes/http_request/ConfigPanel.jsx";
import CodeNode from "@nodes/code/ConfigPanel.jsx";
import DelayNode from "@nodes/delay/ConfigPanel.jsx";
import InformerNode from "@nodes/informer/ConfigPanel.jsx";
import AIAgentNode from "@nodes/ai_agent/ConfigPanel.jsx";
import AgentLLMNode from "@nodes/agent_llm/ConfigPanel.jsx";
import AgentToolNode from "@nodes/agent_tool/ConfigPanel.jsx";
import AgentSkillNode from "@nodes/agent_skill/ConfigPanel.jsx";
import makeAgentModelPanel from "@nodes/agent_model_panel/ConfigPanel.jsx";
import makeAgentMemoryPanel from "@nodes/agent_memory_panel/ConfigPanel.jsx";
import makeAgentToolPanel from "@nodes/agent_tool_panel/ConfigPanel.jsx";
import ToolHttpRequestPanel from "@nodes/tool_http_request/ConfigPanel.jsx";
import ToolScraperPanel from "@nodes/tool_scraper/ConfigPanel.jsx";
import ToolWebhookPanel from "@nodes/tool_webhook/ConfigPanel.jsx";
import ToolMcpClientPanel from "@nodes/tool_mcp_client/ConfigPanel.jsx";
import ToolCallWorkflowPanel from "@nodes/tool_call_workflow/ConfigPanel.jsx";
import ToolThinkPanel from "@nodes/tool_think/ConfigPanel.jsx";
import ToolSqlPanel from "@nodes/tool_sql/ConfigPanel.jsx";
import ToolMongodbPanel from "@nodes/tool_mongodb/ConfigPanel.jsx";
import VirtualComputerPanel from "@nodes/virtual_computer/ConfigPanel.jsx";
import DataMapperNode from "@nodes/data_mapper/ConfigPanel.jsx";
import LoopNode from "@nodes/loop/ConfigPanel.jsx";
import SlackNode from "@nodes/slack/ConfigPanel.jsx";
import DiscordNode from "@nodes/discord/ConfigPanel.jsx";
import OpenAINode from "@nodes/openai/ConfigPanel.jsx";
import AnthropicNode from "@nodes/anthropic/ConfigPanel.jsx";
import GeminiNode from "@nodes/gemini/ConfigPanel.jsx";
import TelegramNode from "@nodes/telegram/ConfigPanel.jsx";
import WhatsAppNode from "@nodes/whatsapp/ConfigPanel.jsx";
import AirtableNode from "@nodes/airtable/ConfigPanel.jsx";
import WebSearchNode from "@nodes/web_search/ConfigPanel.jsx";
import makeOpenAICompatNode from "@nodes/openai_compat/ConfigPanel.jsx";
import DeepSeekNode from "@nodes/deepseek/ConfigPanel.jsx";
import NvidiaNimNode from "@nodes/nvidia_nim/ConfigPanel.jsx";
import MoonshotNode from "@nodes/moonshot/ConfigPanel.jsx";
import OpenRouterNode from "@nodes/openrouter/ConfigPanel.jsx";
import ZaiNode from "@nodes/zai/ConfigPanel.jsx";
import MiniMaxNode from "@nodes/minimax/ConfigPanel.jsx";
import SakanaNode from "@nodes/sakana/ConfigPanel.jsx";
import GoogleSheetsNode from "@nodes/google_sheets/ConfigPanel.jsx";
import GmailNode from "@nodes/gmail/ConfigPanel.jsx";
import NotionNode from "@nodes/notion/ConfigPanel.jsx";
import TwilioNode from "@nodes/twilio/ConfigPanel.jsx";
import SendGridNode from "@nodes/sendgrid/ConfigPanel.jsx";
import MergeNode from "@nodes/merge/ConfigPanel.jsx";

// Config Panels — new utility nodes
import FilterArrayNode from "@nodes/filter_array/ConfigPanel.jsx";
import SortArrayNode from "@nodes/sort_array/ConfigPanel.jsx";
import DeduplicateNode from "@nodes/deduplicate/ConfigPanel.jsx";
import imgDeduplicate from "../../assets/logos/deduplicate.svg";
import imgDelay from "../../assets/logos/delay.svg";
import CSVParserNode from "@nodes/csv_parser/ConfigPanel.jsx";
import DateTimeNode from "@nodes/date_time/ConfigPanel.jsx";
import CryptoUtilsNode from "@nodes/crypto_utils/ConfigPanel.jsx";



// Config Panels — Innovation Sprint nodes
import TemplateRendererNode from "@nodes/template_renderer/ConfigPanel.jsx";
import ImageResizeNode from "@nodes/image_resize/ConfigPanel.jsx";
import AggregateNode from "@nodes/aggregate/ConfigPanel.jsx";
import PDFGeneratorNode from "@nodes/pdf_generator/ConfigPanel.jsx";
import EmailParserNode from "@nodes/email_parser/ConfigPanel.jsx";

import ElevenLabsNode from "@nodes/elevenlabs/ConfigPanel.jsx";
import PineconeNode from "@nodes/pinecone/ConfigPanel.jsx";
import ZoomNode from "@nodes/zoom/ConfigPanel.jsx";
import InstagramNode from "@nodes/instagram/ConfigPanel.jsx";
import TikTokNode from "@nodes/tiktok/ConfigPanel.jsx";
import LinkedInNode from "@nodes/linkedin/ConfigPanel.jsx";
import ResendNode from "@nodes/resend/ConfigPanel.jsx";
import GitHubIssueTriggerNode from "@triggers/github_issue/ConfigPanel.jsx";
import SshTriggerNode from "@triggers/ssh/ConfigPanel.jsx";
import SshNode from "@nodes/ssh/ConfigPanel.jsx";
import DockerTriggerNode from "@triggers/docker/ConfigPanel.jsx";
import JiraTriggerNode from "@triggers/jira/ConfigPanel.jsx";
import TrelloTriggerNode from "@triggers/trello/ConfigPanel.jsx";
import GoogleSheetsTriggerNode from "@triggers/google_sheets/ConfigPanel.jsx";
import OutlookTriggerNode from "@triggers/outlook/ConfigPanel.jsx";
import GitLabTriggerNode from "@triggers/gitlab/ConfigPanel.jsx";
import HackerNewsTriggerNode from "@triggers/hackernews/ConfigPanel.jsx";
import PipedriveTriggerNode from "@triggers/pipedrive/ConfigPanel.jsx";
import AsanaTriggerNode from "@triggers/asana/ConfigPanel.jsx";
import makeCodingAgentNode from "@nodes/coding_agent/ConfigPanel.jsx";
import GenericActionNode from "@nodes/generic_action/ConfigPanel.jsx";
import AgentIntegrationNode from "@nodes/agent_integration/ConfigPanel.jsx";
import ImapTriggerNode from "@triggers/imap/ConfigPanel.jsx";
import DatabaseTriggerNode from "@triggers/db/ConfigPanel.jsx";
import DnsTriggerNode from "@triggers/dns/ConfigPanel.jsx";
import GoogleCalendarTriggerNode from "@triggers/google_calendar/ConfigPanel.jsx";
import HttpMonitorTriggerNode from "@triggers/http_monitor/ConfigPanel.jsx";
import PortMonitorTriggerNode from "@triggers/port_monitor/ConfigPanel.jsx";
import PriceAlertTriggerNode from "@triggers/price_alert/ConfigPanel.jsx";
import RedditTriggerNode from "@triggers/reddit/ConfigPanel.jsx";
import RssTriggerNode from "@triggers/rss/ConfigPanel.jsx";
import SslTriggerNode from "@triggers/ssl/ConfigPanel.jsx";
import YouTubeTriggerNode from "@triggers/youtube/ConfigPanel.jsx";
// Automators nodes
import VariableSetGetNode from "@nodes/variable_set_get/ConfigPanel.jsx";
import FileUploadNode from "@nodes/file_upload/ConfigPanel.jsx";
import FileDownloadNode from "@nodes/file_download/ConfigPanel.jsx";
import ZipFilesNode from "@nodes/zip_files/ConfigPanel.jsx";
// Social Media nodes
import YouTubeUploadNode from "@nodes/youtube/ConfigPanel.jsx";
import RssFeedGeneratorNode from "@nodes/rss_feed/ConfigPanel.jsx";
// Developer Tools nodes
import GraphQLNode from "@nodes/graphql/ConfigPanel.jsx";
import SftpNode from "@nodes/sftp/ConfigPanel.jsx";
import S3Node from "@nodes/s3/ConfigPanel.jsx";
import WebhookResponseNode from "@nodes/respond_webhook/ConfigPanel.jsx";
// Education / Student nodes
import TranslationNode from "@nodes/translation/ConfigPanel.jsx";
import TextToSpeechNode from "@nodes/text_to_speech/ConfigPanel.jsx";
import SpeechToTextNode from "@nodes/speech_to_text/ConfigPanel.jsx";
import OcrNode from "@nodes/ocr/ConfigPanel.jsx";
import IpLookupNode from "@nodes/ip_lookup/ConfigPanel.jsx";
import DnsLookupNode from "@nodes/dns_lookup/ConfigPanel.jsx";
import SslCheckNode from "@nodes/ssl_check/ConfigPanel.jsx";
import HttpMonitorNode from "@nodes/http_monitor/ConfigPanel.jsx";
// Data Processing nodes
import TextFormatNode from "@nodes/text_format/ConfigPanel.jsx";
import RegexMatchNode from "@nodes/regex_match/ConfigPanel.jsx";
import JsonTransformNode from "@nodes/json_transform/ConfigPanel.jsx";
import MathExpressionNode from "@nodes/math_expression/ConfigPanel.jsx";
import ConditionNode from "@nodes/condition/ConfigPanel.jsx";
import WaitForEventNode from "@nodes/wait_for_event/ConfigPanel.jsx";
import RetryNode from "@nodes/retry/ConfigPanel.jsx";
import RateLimiterNode from "@nodes/rate_limiter/ConfigPanel.jsx";

// Config Panels — Database nodes
import SupabaseNode from "@nodes/supabase/ConfigPanel.jsx";
import MongoDBNode from "@nodes/mongodb/ConfigPanel.jsx";
import RedisNode from "@nodes/redis/ConfigPanel.jsx";
import FirebaseNode from "@nodes/firebase/ConfigPanel.jsx";

// Config Panels — new integrations
import GithubNode from "@nodes/github/ConfigPanel.jsx";
import StripeNode from "@nodes/stripe/ConfigPanel.jsx";
import PostgresNode from "@nodes/postgres/ConfigPanel.jsx";
import JiraNode from "@nodes/jira/ConfigPanel.jsx";
import LinearNode from "@nodes/linear/ConfigPanel.jsx";
import GoogleCalendarNode from "@nodes/google_calendar/ConfigPanel.jsx";
import GoogleDriveNode from "@nodes/google_drive/ConfigPanel.jsx";
import HubSpotNode from "@nodes/hubspot/ConfigPanel.jsx";
import ShopifyNode from "@nodes/shopify/ConfigPanel.jsx";

// Config Panels — previously stubbed (now real panels)
import GitLabNode from "@nodes/gitlab/ConfigPanel.jsx";
import TrelloNode from "@nodes/trello/ConfigPanel.jsx";
import AsanaNode from "@nodes/asana/ConfigPanel.jsx";
import ClickUpNode from "@nodes/clickup/ConfigPanel.jsx";
import MondayNode from "@nodes/monday/ConfigPanel.jsx";
import PipedriveNode from "@nodes/pipedrive/ConfigPanel.jsx";
import IntercomNode from "@nodes/intercom/ConfigPanel.jsx";
import WooCommerceNode from "@nodes/woocommerce/ConfigPanel.jsx";
import TypeformNode from "@nodes/typeform/ConfigPanel.jsx";
import OutlookNode from "@nodes/outlook/ConfigPanel.jsx";
import TeamsNode from "@nodes/teams/ConfigPanel.jsx";
import OneDriveNode from "@nodes/onedrive/ConfigPanel.jsx";
import SharePointNode from "@nodes/sharepoint/ConfigPanel.jsx";
import AzureDevOpsNode from "@nodes/azure_devops/ConfigPanel.jsx";
import GoogleDocsNode from "@nodes/google_docs/ConfigPanel.jsx";
import GoogleFormsNode from "@nodes/google_forms/ConfigPanel.jsx";
import SentryNode from "@nodes/sentry/ConfigPanel.jsx";
import VercelNode from "@nodes/vercel/ConfigPanel.jsx";
import NetlifyNode from "@nodes/netlify/ConfigPanel.jsx";
import PagerDutyNode from "@nodes/pagerduty/ConfigPanel.jsx";
import DatadogNode from "@nodes/datadog/ConfigPanel.jsx";
import ZendeskNode from "@nodes/zendesk/ConfigPanel.jsx";
import CalendlyNode from "@nodes/calendly/ConfigPanel.jsx";
import MailchimpNode from "@nodes/mailchimp/ConfigPanel.jsx";
import FigmaNode from "@nodes/figma/ConfigPanel.jsx";
import RedditNode from "@nodes/reddit/ConfigPanel.jsx";

// AI Model provider subject panels (multi-op, live model fetch)
import PerplexityNode from "@nodes/perplexity/ConfigPanel.jsx";
import XAINode from "@nodes/xai/ConfigPanel.jsx";

// Single source of truth for AI Agent chat-model lists — the canvas card and the
// config panel read the same array, so they cannot drift apart.
export const AGENT_MODELS = {
  openai: [
    { value: "gpt-5.6", label: "GPT-5.6" },
    { value: "gpt-5.6-mini", label: "GPT-5.6 Mini" },
    { value: "gpt-5.5", label: "GPT-5.5" },
    { value: "gpt-5.1", label: "GPT-5.1" },
    { value: "o3", label: "o3" },
  ],
  anthropic: [
    { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
    { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  gemini: [
    { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { value: "gemini-3.5-pro", label: "Gemini 3.5 Pro" },
    { value: "gemini-3.1-flash", label: "Gemini 3.1 Flash" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  xai: [
    { value: "grok-4.3", label: "Grok 4.3" },
    { value: "grok-4.20", label: "Grok 4.20" },
    { value: "grok-4-fast", label: "Grok 4 Fast" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
  moonshot: [
    { value: "moonshot-v1-8k", label: "Kimi V1 · 8K" },
    { value: "moonshot-v1-32k", label: "Kimi V1 · 32K" },
    { value: "moonshot-v1-128k", label: "Kimi V1 · 128K" },
    { value: "moonshot-v1-8k-vision-preview", label: "Kimi V1 · Vision" },
  ],
  nvidia_nim: [
    { value: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra 550B ✦" },
    { value: "nvidia/nemotron-3-super-120b-a12b", label: "Nemotron 3 Super 120B" },
    { value: "nvidia/llama-3.1-nemotron-ultra-253b-v1", label: "Nemotron Ultra 253B" },
    { value: "nvidia/llama-3.3-nemotron-super-49b-v1", label: "Nemotron Super 49B" },
    { value: "meta/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B×128E ✦" },
    { value: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
    { value: "deepseek-ai/deepseek-v4-pro", label: "DeepSeek V4 Pro ✦" },
    { value: "deepseek-ai/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
    { value: "moonshotai/kimi-k2.6", label: "Kimi K2.6" },
    { value: "qwen/qwen3-coder-480b-a35b-instruct", label: "Qwen3-Coder 480B" },
    { value: "mistralai/mistral-nemotron", label: "Mistral Nemotron" },
    { value: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B (fast)" },
  ],
  perplexity: [
    { value: "sonar", label: "Sonar" },
    { value: "sonar-pro", label: "Sonar Pro" },
    { value: "sonar-reasoning", label: "Sonar Reasoning" },
    { value: "sonar-reasoning-pro", label: "Sonar Reasoning Pro" },
    { value: "sonar-deep-research", label: "Sonar Deep Research" },
  ],
  openrouter: [
    { value: "anthropic/claude-opus-4-8", label: "Claude Opus 4.8" },
    { value: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5" },
    { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { value: "openai/gpt-5.6", label: "GPT-5.6" },
    { value: "openai/gpt-5.6-mini", label: "GPT-5.6 Mini" },
    { value: "openai/o3", label: "o3" },
    { value: "google/gemini-3.5-pro", label: "Gemini 3.5 Pro" },
    { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { value: "x-ai/grok-4.3", label: "Grok 4.3" },
    { value: "x-ai/grok-4-fast", label: "Grok 4 Fast" },
    { value: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro" },
    { value: "deepseek/deepseek-r1", label: "DeepSeek R1" },
    { value: "qwen/qwen3-max", label: "Qwen3 Max" },
    { value: "z-ai/glm-5.2", label: "GLM-5.2" },
    { value: "minimax/minimax-m2.1", label: "MiniMax M2.1" },
    { value: "moonshotai/kimi-k2.6", label: "Kimi K2.6" },
    { value: "mistralai/mistral-large-3", label: "Mistral Large 3" },
    { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
    { value: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra 550B" },
    { value: "cohere/command-a", label: "Command A" },
  ],
  zai: [
    { value: "glm-5.2", label: "GLM-5.2" },
    { value: "glm-5.1", label: "GLM-5.1" },
    { value: "glm-4.7", label: "GLM-4.7" },
    { value: "glm-4.6v", label: "GLM-4.6V · Vision" },
    { value: "glm-4.5-air", label: "GLM-4.5 Air" },
  ],
  minimax: [
    { value: "MiniMax-M3", label: "MiniMax M3" },
    { value: "MiniMax-M2.7", label: "MiniMax M2.7" },
    { value: "MiniMax-M2.5", label: "MiniMax M2.5" },
    { value: "MiniMax-M2.1", label: "MiniMax M2.1" },
    { value: "MiniMax-M2", label: "MiniMax M2" },
  ],
  sakana: [
    { value: "fugu", label: "Fugu" },
    { value: "fugu-ultra", label: "Fugu Ultra" },
  ],
};

// Category Definitions (ordered for sidebar)
export const CATEGORIES = [
  { id: "trigger",   label: "Triggers",   icon: Zap,        shape: "square" },
  { id: "ai_models", label: "AI Models",  icon: Sparkles,   shape: "glass"  },
  { id: "ai_agent",  label: "AI Agent",   icon: Bot,        shape: "glass"  },
  { id: "apps",      label: "Apps",       icon: Briefcase,  shape: "pill"   },
  { id: "logic",     label: "Logic & Flow", icon: GitFork,  shape: "sharp"  },
  { id: "databases", label: "Databases",  icon: Database,   shape: "rounded"},
  { id: "data",      label: "Data",       icon: Braces,     shape: "rounded"},
  { id: "infra",     label: "Files & Infra", icon: Server,  shape: "rounded"},
];

export const NodeRegistry = {
  // Triggers
  manual: {
    label: "Manual Trigger",
    icon: MousePointerClick,
    colorClass: "text-green-400",
    accentColor: "34,197,94",
    ConfigPanel: TriggerNode,
    category: "trigger",
  },
  webhook: {
    label: "Webhook Trigger",
    icon: Webhook,
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    logoUrl: imgWebhookTrigger,
    imgFilter: "invert(1)",
    ConfigPanel: WebhookTriggerNode,
    category: "trigger",
  },
  cron_trigger: {
    label: "Schedule Trigger",
    icon: Clock,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: ScheduleTriggerNode,
    category: "trigger",
  },
  chat_trigger: {
    label: "Chat Trigger",
    icon: MessageSquare,
    colorClass: "text-pink-400",
    accentColor: "236,72,153",
    ConfigPanel: ChatTriggerNode,
    category: "trigger",
  },
  form_trigger: {
    label: "Form Trigger",
    icon: FileText,
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    logoUrl: imgFormTrigger,
    ConfigPanel: FormTriggerNode,
    category: "trigger",
  },
  github_trigger: {
    label: "GitHub Trigger",
    icon: Github,
    colorClass: "text-zinc-200",
    accentColor: "244,244,245",
    logoUrl: imgGitHub,
    ConfigPanel: GitHubTriggerNode,
    category: "trigger",
  },
  stripe_trigger: {
    label: "Stripe Trigger",
    icon: CreditCard,
    colorClass: "text-[#635BFF]",
    accentColor: "99,91,255",
    logoUrl: imgStripe,
    ConfigPanel: StripeTriggerNode,
    category: "trigger",
  },
  telegram_trigger: {
    label: "Telegram Trigger",
    icon: Brain,
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    logoUrl: imgTelegram,
    ConfigPanel: TelegramTriggerNode,
    category: "trigger",
  },
  slack_trigger: {
    label: "Slack Trigger",
    icon: Brain,
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    logoUrl: imgSlack,
    ConfigPanel: SlackTriggerNode,
    category: "trigger",
  },
  discord_trigger: {
    label: "Discord Trigger",
    icon: Brain,
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    logoUrl: imgDiscord,
    ConfigPanel: DiscordTriggerNode,
    category: "trigger",
  },
  gmail_trigger: {
    label: "Gmail Trigger",
    icon: Brain,
    colorClass: "text-[#EA4335]",
    accentColor: "234,67,53",
    logoUrl: imgGmail,
    ConfigPanel: GmailTriggerNode,
    category: "trigger",
  },
  airtable_trigger: {
    label: "Airtable Trigger",
    icon: Brain,
    colorClass: "text-[#F65858]",
    accentColor: "246,88,88",
    logoUrl: imgAirtable,
    ConfigPanel: AirtableTriggerNode,
    category: "trigger",
  },
  notion_trigger: {
    label: "Notion Trigger",
    icon: Brain,
    colorClass: "text-white",
    accentColor: "255,255,255",
    logoUrl: imgNotion,
    ConfigPanel: NotionTriggerNode,
    category: "trigger",
  },
  hubspot_trigger: {
    label: "HubSpot Trigger",
    icon: Users,
    colorClass: "text-[#FF7A59]",
    accentColor: "255,122,89",
    logoUrl: imgHubSpot,
    ConfigPanel: HubSpotTriggerNode,
    category: "trigger",
  },
  shopify_trigger: {
    label: "Shopify Trigger",
    icon: ShoppingBag,
    colorClass: "text-[#95BF47]",
    accentColor: "149,191,71",
    logoUrl: imgShopify,
    ConfigPanel: ShopifyTriggerNode,
    category: "trigger",
  },
  linear_trigger: {
    label: "Linear Trigger",
    icon: Circle,
    colorClass: "text-[#5E6AD2]",
    accentColor: "94,106,210",
    logoUrl: imgLinear,
    ConfigPanel: LinearTriggerNode,
    category: "trigger",
  },
  typeform_trigger: {
    label: "Typeform Trigger",
    icon: FileText,
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    logoUrl: imgTypeform,
    ConfigPanel: TypeformTriggerNode,
    category: "trigger",
  },
  jotform_trigger: {
    label: "Jotform Trigger",
    icon: ClipboardList,
    colorClass: "text-[#FF6100]",
    accentColor: "255,97,0",
    ConfigPanel: JotformTriggerNode,
    category: "trigger",
  },
  whatsapp_trigger: {
    label: "WhatsApp Trigger",
    icon: Brain,
    colorClass: "text-[#25D366]",
    accentColor: "37,211,102",
    logoUrl: imgWhatsApp,
    ConfigPanel: WhatsAppTriggerNode,
    category: "trigger",
  },

  // ── Additional trigger node registry entries (for canvas rendering) ──────────
  asana_trigger:          { label: "Asana Trigger",          icon: CheckSquare,   colorClass: "text-[#F06A6A]",     accentColor: "240,106,106",  logoUrl: imgAsana,              category: "trigger", ConfigPanel: AsanaTriggerNode },
  db_trigger:             { label: "Database Trigger",       icon: Database,      colorClass: "text-emerald-400",   accentColor: "52,211,153",   logoUrl: imgDbTrigger,          category: "trigger", ConfigPanel: DatabaseTriggerNode },
  dns_trigger:            { label: "DNS Trigger",            icon: Globe,         colorClass: "text-blue-400",      accentColor: "96,165,250",   logoUrl: imgDnsTrigger,         category: "trigger", ConfigPanel: DnsTriggerNode },
  docker_trigger:         { label: "Docker Trigger",         icon: Box,           colorClass: "text-blue-500",      accentColor: "59,130,246",   logoUrl: imgDocker,             category: "trigger", ConfigPanel: DockerTriggerNode },
  github_issue_trigger:   { label: "GitHub Issue Trigger",   icon: Circle,        colorClass: "text-zinc-200",      accentColor: "244,244,245",  logoUrl: imgGitHubIssueTrigger, category: "trigger", ConfigPanel: GitHubIssueTriggerNode },
  gitlab_trigger:         { label: "GitLab Trigger",         icon: GitBranch,     colorClass: "text-[#FC6D26]",     accentColor: "252,109,38",   logoUrl: imgGitLab,             category: "trigger", ConfigPanel: GitLabTriggerNode },
  google_calendar_trigger:{ label: "Google Calendar Trigger",icon: Calendar,      colorClass: "text-[#4285F4]",     accentColor: "66,133,244",   logoUrl: imgGoogleCalendar,     category: "trigger", ConfigPanel: GoogleCalendarTriggerNode },
  google_sheets_trigger:  { label: "Google Sheets Trigger",  icon: FileText,      colorClass: "text-[#34A853]",     accentColor: "52,168,83",    logoUrl: imgGoogleSheets,       category: "trigger", ConfigPanel: GoogleSheetsTriggerNode },
  hackernews_trigger:     { label: "HackerNews Trigger",     icon: TrendingUp,    colorClass: "text-orange-500",    accentColor: "249,115,22",   logoUrl: imgHackerNewsTrigger,  category: "trigger", ConfigPanel: HackerNewsTriggerNode },
  http_monitor_trigger:   { label: "HTTP Monitor Trigger",   icon: Globe,         colorClass: "text-green-400",     accentColor: "74,222,128",   logoUrl: imgHttpMonitorTrigger, category: "trigger", ConfigPanel: HttpMonitorTriggerNode },
  imap_trigger:           { label: "Email IMAP Trigger",     icon: Mail,          colorClass: "text-cyan-400",      accentColor: "34,211,238",   logoUrl: imgImap,               category: "trigger", ConfigPanel: ImapTriggerNode },
  jira_trigger:           { label: "Jira Trigger",           icon: Ticket,        colorClass: "text-[#0052CC]",     accentColor: "0,82,204",     logoUrl: imgJira,               category: "trigger", ConfigPanel: JiraTriggerNode },
  outlook_trigger:        { label: "Outlook Trigger",        icon: Mail,          colorClass: "text-[#0078D4]",     accentColor: "0,120,212",    logoUrl: imgOutlook,            category: "trigger", ConfigPanel: OutlookTriggerNode },
  pipedrive_trigger:      { label: "Pipedrive Trigger",      icon: TrendingUp,    colorClass: "text-[#272D3B]",     accentColor: "39,45,59",     logoUrl: imgPipedrive,          category: "trigger", ConfigPanel: PipedriveTriggerNode },
  port_monitor_trigger:   { label: "Port Monitor Trigger",   icon: Server,        colorClass: "text-blue-400",      accentColor: "96,165,250",   logoUrl: imgPortMonitorTrigger, category: "trigger", ConfigPanel: PortMonitorTriggerNode },
  price_alert_trigger:    { label: "Price Alert Trigger",    icon: TrendingUp,    colorClass: "text-green-400",     accentColor: "74,222,128",   logoUrl: imgPriceAlertTrigger,  category: "trigger", ConfigPanel: PriceAlertTriggerNode },
  reddit_trigger:         { label: "Reddit Trigger",         icon: MessageSquarePlus, colorClass: "text-[#FF4500]", accentColor: "255,69,0",     logoUrl: imgReddit,             category: "trigger", ConfigPanel: RedditTriggerNode },
  rss_trigger:            { label: "RSS Trigger",            icon: Rss,           colorClass: "text-orange-400",    accentColor: "251,146,60",   logoUrl: imgRss,                category: "trigger", ConfigPanel: RssTriggerNode },
  ssh_trigger:            { label: "SSH Trigger",            icon: Server,        colorClass: "text-zinc-300",      accentColor: "212,212,216",  logoUrl: imgSsh,                category: "trigger", ConfigPanel: SshTriggerNode },
  ssl_trigger:            { label: "SSL/TLS Trigger",        icon: Shield,        colorClass: "text-green-400",     accentColor: "74,222,128",   logoUrl: imgLetsEncrypt,        category: "trigger", ConfigPanel: SslTriggerNode },
  trello_trigger:         { label: "Trello Trigger",         icon: LayoutGrid,    colorClass: "text-[#0052CC]",     accentColor: "0,82,204",     logoUrl: imgTrello,             category: "trigger", ConfigPanel: TrelloTriggerNode },
  youtube_trigger:        { label: "YouTube Trigger",        icon: Youtube,       colorClass: "text-red-400",       accentColor: "248,113,113",  logoUrl: imgYouTube,            category: "trigger", ConfigPanel: YouTubeTriggerNode },

  // AI Models
  openai: {
    label: "OpenAI",
    icon: Brain,
    colorClass: "text-[#10A37F]",
    accentColor: "16,163,127",
    logoUrl: imgOpenAI,
    ConfigPanel: OpenAINode,
    category: "ai_models",
  },
  anthropic: {
    label: "Anthropic",
    icon: Brain,
    colorClass: "text-[#D4C1B3]",
    accentColor: "212,193,179",
    logoUrl: imgAnthropic,
    ConfigPanel: AnthropicNode,
    category: "ai_models",
    description: "Claude models — reasoning, vision, documents & tool use",
  },
  gemini: {
    label: "Google Gemini",
    icon: Brain,
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    logoUrl: imgGemini,
    ConfigPanel: GeminiNode,
    category: "ai_models",
    description: "Gemini models — text, vision, documents & long context",
  },
  perplexity: {
    label: "Perplexity",
    icon: Brain,
    colorClass: "text-[#22d3ee]",
    accentColor: "34,211,238",
    logoUrl: imgPerplexity,
    ConfigPanel: PerplexityNode,
    category: "ai_models",
    description: "Sonar models — answers grounded in live web search",
  },
  xai: {
    label: "xAI (Grok)",
    icon: Sparkles,
    colorClass: "text-zinc-100",
    accentColor: "244,244,245",
    logoUrl: imgGrok,
    ConfigPanel: XAINode,
    category: "ai_models",
    description: "Grok models — reasoning, vision & real-time X data",
  },
  deepseek: {
    label: "DeepSeek",
    icon: Brain,
    colorClass: "text-[#4D9BF8]",
    accentColor: "77,155,248",
    logoUrl: imgDeepSeek,
    ConfigPanel: DeepSeekNode,
    category: "ai_models",
    description: "DeepSeek V3 & R1 — frontier reasoning and coding",
  },
  nvidia_nim: {
    label: "NVIDIA NIM",
    icon: Cpu,
    colorClass: "text-[#76B900]",
    accentColor: "118,185,0",
    logoUrl: imgNvidiaNim,
    description: "NVIDIA Inference Microservices — Llama, Nemotron, vision & embedding models",
    ConfigPanel: NvidiaNimNode,
    category: "ai_models",
  },
  moonshot: {
    label: "Kimi",
    icon: Brain,
    colorClass: "text-[#1B64F4]",
    accentColor: "27,100,244",
    logoUrl: imgKimi,
    description: "Kimi long-context models — 8K, 32K, 128K & vision",
    ConfigPanel: MoonshotNode,
    category: "ai_models",
  },
  openrouter: {
    label: "OpenRouter",
    icon: Brain,
    colorClass: "text-neutral-300",
    accentColor: "229,229,229",
    logoUrl: imgOpenRouter,
    description: "One key, 300+ models — route to any lab via OpenRouter",
    ConfigPanel: OpenRouterNode,
    category: "ai_models",
  },
  zai: {
    label: "Z.ai (GLM)",
    icon: Brain,
    colorClass: "text-neutral-300",
    accentColor: "229,229,229",
    logoUrl: imgZai,
    description: "GLM-5.2 — frontier reasoning, coding & agentic models from Z.ai",
    ConfigPanel: ZaiNode,
    category: "ai_models",
  },
  minimax: {
    label: "MiniMax",
    icon: Brain,
    colorClass: "text-neutral-300",
    accentColor: "229,229,229",
    logoUrl: imgMiniMax,
    description: "MiniMax-M3 — multimodal, 1M context, frontier coding & agents",
    ConfigPanel: MiniMaxNode,
    category: "ai_models",
  },
  sakana: {
    label: "Sakana Fugu",
    icon: Brain,
    colorClass: "text-neutral-300",
    accentColor: "229,229,229",
    logoUrl: imgSakana,
    description: "Sakana Fugu — multi-agent council served as one model",
    ConfigPanel: SakanaNode,
    category: "ai_models",
  },
  ai_agent: {
    label: "AI Agent",
    icon: Bot,
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    ConfigPanel: AIAgentNode,
    category: "ai_agent",
    description:
      "Autonomous AI that reasons, uses tools, and completes multi-step tasks on its own",
  },

  // ── Agent Sub-Nodes (agentOnly — hidden from step picker, only shown in agent dock) ──
  agent_llm: {
    label: "Language Model",
    icon: Brain,
    colorClass: "text-violet-300",
    accentColor: "167,139,250",
    ConfigPanel: AgentLLMNode,
    category: "ai_models",
    agentOnly: true,
    description: "LLM powering the AI Agent",
  },
  agent_memory: {
    label: "Vector Memory",
    icon: Brain,
    colorClass: "text-purple-400",
    accentColor: "192,132,252",
    ConfigPanel: makeAgentMemoryPanel({ label: "Vector Memory", semantic: true }),
    category: "ai_agent",
    agentOnly: true,
    description: "Remembers recent messages and recalls older ones by meaning",
  },
  agent_tool: {
    label: "Tool",
    icon: Zap,
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    ConfigPanel: AgentToolNode,
    category: "ai_agent",
    agentOnly: true,
    description: "A capability the AI Agent can invoke",
  },
  agent_skill: {
    label: "Skill",
    icon: Sparkles,
    colorClass: "text-pink-400",
    accentColor: "244,114,182",
    ConfigPanel: AgentSkillNode,
    category: "ai_agent",
    agentOnly: true,
    description: "A Claude-style skill file the agent loads on demand",
  },

  // ── Dedicated Agent Model Nodes ──
  agent_openai: {
    label: "OpenAI",
    icon: Brain,
    logoUrl: imgOpenAI,
    colorClass: "text-[#10A37F]",
    accentColor: "16,163,127",
    category: "ai_models",
    description: "GPT models powering the AI Agent",
    defaultModel: "gpt-5.6",
    models: AGENT_MODELS.openai,
    ConfigPanel: makeAgentModelPanel({
      label: "OpenAI",
      provider: "openai",
      credentialType: "OpenAI",
      logoUrl: imgOpenAI,
      models: AGENT_MODELS.openai,
      color: "#10A37F",
    }),
  },
  agent_anthropic: {
    label: "Anthropic",
    icon: Brain,
    logoUrl: imgAnthropic,
    colorClass: "text-[#D4C1B3]",
    accentColor: "212,193,179",
    category: "ai_models",
    description: "Claude models powering the AI Agent",
    defaultModel: "claude-sonnet-5",
    models: AGENT_MODELS.anthropic,
    ConfigPanel: makeAgentModelPanel({
      label: "Anthropic",
      provider: "anthropic",
      credentialType: "Anthropic",
      logoUrl: imgAnthropic,
      models: AGENT_MODELS.anthropic,
      color: "#D4A27A",
    }),
  },
  agent_gemini: {
    label: "Google Gemini",
    icon: Brain,
    logoUrl: imgGemini,
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    category: "ai_models",
    description: "Gemini models powering the AI Agent",
    defaultModel: "gemini-3.5-flash",
    models: AGENT_MODELS.gemini,
    ConfigPanel: makeAgentModelPanel({
      label: "Gemini",
      provider: "gemini",
      credentialType: "Gemini",
      logoUrl: imgGemini,
      models: AGENT_MODELS.gemini,
      color: "#4285F4",
    }),
  },
  agent_xai: {
    label: "xAI Grok",
    icon: Sparkles,
    logoUrl: imgGrok,
    colorClass: "text-zinc-100",
    accentColor: "244,244,245",
    category: "ai_models",
    description: "Grok models powering the AI Agent",
    defaultModel: "grok-4.3",
    models: AGENT_MODELS.xai,
    ConfigPanel: makeAgentModelPanel({
      label: "xAI",
      provider: "xai",
      credentialType: "xAI",
      logoUrl: imgGrok,
      models: AGENT_MODELS.xai,
      color: "#6B7280",
    }),
  },
  agent_deepseek: {
    label: "DeepSeek",
    icon: Brain,
    logoUrl: imgDeepSeek,
    colorClass: "text-[#4D9BF8]",
    accentColor: "77,155,248",
    category: "ai_models",
    description: "DeepSeek models powering the AI Agent",
    defaultModel: "deepseek-chat",
    models: AGENT_MODELS.deepseek,
    ConfigPanel: makeAgentModelPanel({
      label: "DeepSeek",
      provider: "deepseek",
      credentialType: "DeepSeek",
      logoUrl: imgDeepSeek,
      models: AGENT_MODELS.deepseek,
      color: "#4D9BF8",
    }),
  },
  agent_moonshot: {
    label: "Kimi",
    icon: Brain,
    logoUrl: imgKimi,
    colorClass: "text-[#1B64F4]",
    accentColor: "27,100,244",
    category: "ai_models",
    description: "Kimi long-context models powering the AI Agent",
    defaultModel: "moonshot-v1-8k",
    models: AGENT_MODELS.moonshot,
    ConfigPanel: makeAgentModelPanel({
      label: "Kimi",
      provider: "moonshot",
      credentialType: "Moonshot",
      logoUrl: imgKimi,
      models: AGENT_MODELS.moonshot,
      color: "#1B64F4",
    }),
  },
  agent_nvidia_nim: {
    label: "NVIDIA NIM",
    icon: Cpu,
    logoUrl: imgNvidiaNim,
    colorClass: "text-[#76B900]",
    accentColor: "118,185,0",
    category: "ai_models",
    description: "NVIDIA-hosted Llama, Nemotron & Mistral models powering the AI Agent",
    defaultModel: "nvidia/nemotron-3-ultra-550b-a55b",
    models: AGENT_MODELS.nvidia_nim,
    ConfigPanel: makeAgentModelPanel({
      label: "NVIDIA NIM",
      provider: "nvidia_nim",
      credentialType: "NvidiaNim",
      logoUrl: imgNvidiaNim,
      models: AGENT_MODELS.nvidia_nim,
      color: "#76B900",
    }),
  },
  agent_perplexity: {
    label: "Perplexity",
    icon: Brain,
    logoUrl: imgPerplexity,
    colorClass: "text-[#22d3ee]",
    accentColor: "34,211,238",
    category: "ai_models",
    description: "Perplexity search-augmented models for the AI Agent",
    defaultModel: "sonar-pro",
    models: AGENT_MODELS.perplexity,
    ConfigPanel: makeAgentModelPanel({
      label: "Perplexity",
      provider: "perplexity",
      credentialType: "Perplexity",
      logoUrl: imgPerplexity,
      models: AGENT_MODELS.perplexity,
      color: "#20B2AA",
    }),
  },
  agent_openrouter: {
    label: "OpenRouter",
    icon: Brain,
    logoUrl: imgOpenRouter,
    colorClass: "text-neutral-300",
    accentColor: "229,229,229",
    category: "ai_models",
    description: "One key, 300+ models — any lab routed through OpenRouter",
    defaultModel: "anthropic/claude-sonnet-5",
    models: AGENT_MODELS.openrouter,
    ConfigPanel: makeAgentModelPanel({
      label: "OpenRouter",
      provider: "openrouter",
      credentialType: "OpenRouter",
      logoUrl: imgOpenRouter,
      models: AGENT_MODELS.openrouter,
      color: "#a3a3a3",
    }),
  },
  agent_zai: {
    label: "Z.ai (GLM)",
    icon: Brain,
    logoUrl: imgZai,
    colorClass: "text-[#3B82F6]",
    accentColor: "59,130,246",
    category: "ai_models",
    description: "GLM models powering the AI Agent",
    defaultModel: "glm-5.2",
    models: AGENT_MODELS.zai,
    ConfigPanel: makeAgentModelPanel({
      label: "Z.ai",
      provider: "zai",
      credentialType: "Z.ai",
      logoUrl: imgZai,
      models: AGENT_MODELS.zai,
      color: "#3B82F6",
    }),
  },
  agent_minimax: {
    label: "MiniMax",
    icon: Brain,
    logoUrl: imgMiniMax,
    colorClass: "text-neutral-300",
    accentColor: "229,229,229",
    category: "ai_models",
    description: "MiniMax long-context models powering the AI Agent",
    defaultModel: "MiniMax-M3",
    models: AGENT_MODELS.minimax,
    ConfigPanel: makeAgentModelPanel({
      label: "MiniMax",
      provider: "minimax",
      credentialType: "MiniMax",
      logoUrl: imgMiniMax,
      models: AGENT_MODELS.minimax,
      color: "#a3a3a3",
    }),
  },
  agent_sakana: {
    label: "Sakana Fugu",
    icon: Brain,
    logoUrl: imgSakana,
    colorClass: "text-neutral-300",
    accentColor: "229,229,229",
    category: "ai_models",
    description: "Sakana Fugu multi-agent council powering the AI Agent",
    defaultModel: "fugu",
    models: AGENT_MODELS.sakana,
    ConfigPanel: makeAgentModelPanel({
      label: "Sakana Fugu",
      provider: "sakana",
      credentialType: "Sakana",
      logoUrl: imgSakana,
      models: AGENT_MODELS.sakana,
      color: "#a3a3a3",
    }),
  },

  // ── Dedicated Agent Memory Nodes ──
  // Every one of these runs on our own store (Redis window + Mongo vectors);
  // the provider name is branding, `semantic` is the only behavioural switch.
  agent_memory_window: {
    label: "Window Buffer",
    icon: MemoryStick,
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    category: "ai_agent",
    agentOnly: true,
    description: "Keeps the last N messages of the conversation",
    ConfigPanel: makeAgentMemoryPanel({ label: "Window Buffer" }),
  },
  agent_memory_redis: {
    label: "Redis",
    icon: Database,
    logoUrl: imgRedis,
    colorClass: "text-[#DC382D]",
    accentColor: "220,56,45",
    category: "ai_agent",
    agentOnly: true,
    description: "Keeps the last N messages of the conversation",
    ConfigPanel: makeAgentMemoryPanel({ label: "Redis", logoUrl: imgRedis }),
  },
  agent_memory_mongodb: {
    label: "MongoDB",
    icon: Database,
    logoUrl: imgMongoDB,
    colorClass: "text-[#47A248]",
    accentColor: "71,162,72",
    category: "ai_agent",
    agentOnly: true,
    description: "Semantic memory stored as vectors",
    ConfigPanel: makeAgentMemoryPanel({ label: "MongoDB", logoUrl: imgMongoDB, semantic: true }),
  },
  agent_memory_postgres: {
    label: "PostgreSQL",
    icon: Database,
    logoUrl: imgPostgres,
    colorClass: "text-white",
    accentColor: "91,155,213",
    category: "ai_agent",
    agentOnly: true,
    description: "Keeps the last N messages of the conversation",
    ConfigPanel: makeAgentMemoryPanel({ label: "PostgreSQL", logoUrl: imgPostgres }),
  },
  agent_memory_pinecone: {
    label: "Pinecone",
    icon: Database,
    logoUrl: imgPinecone,
    colorClass: "text-[#1A73E8]",
    accentColor: "26,115,232",
    category: "ai_agent",
    agentOnly: true,
    description: "Semantic memory stored as vectors",
    ConfigPanel: makeAgentMemoryPanel({ label: "Pinecone", logoUrl: imgPinecone, semantic: true }),
  },
  agent_memory_supabase: {
    label: "Supabase",
    icon: Database,
    logoUrl: imgSupabase,
    colorClass: "text-[#3ECF8E]",
    accentColor: "62,207,142",
    category: "ai_agent",
    agentOnly: true,
    description: "Semantic memory stored as vectors",
    ConfigPanel: makeAgentMemoryPanel({ label: "Supabase", logoUrl: imgSupabase, semantic: true }),
  },
  agent_memory_zep: {
    label: "Zep",
    icon: Database,
    logoUrl: imgZep,
    colorClass: "text-[#7C3AED]",
    accentColor: "124,58,237",
    category: "ai_agent",
    agentOnly: true,
    description: "Keeps the last N messages of the conversation",
    ConfigPanel: makeAgentMemoryPanel({ label: "Zep", logoUrl: imgZep }),
  },

  // ── Agent Integrations — platform nodes attached via the Integration slot ──────
  agent_integration_slack:          { label: "Slack",           icon: Zap, logoUrl: imgSlack,          colorClass: "text-[#E01E5A]", accentColor: "224,30,90",   category: "ai_agent", agentOnly: true, description: "Post messages, files & DMs", ConfigPanel: AgentIntegrationNode },
  agent_integration_gmail:          { label: "Gmail",           icon: Mail, logoUrl: imgGmail,         colorClass: "text-[#EA4335]", accentColor: "234,67,53",   category: "ai_agent", agentOnly: true, description: "Send & search email",       ConfigPanel: AgentIntegrationNode },
  agent_integration_discord:        { label: "Discord",         icon: Zap, logoUrl: imgDiscord,        colorClass: "text-[#5865F2]", accentColor: "88,101,242",  category: "ai_agent", agentOnly: true, description: "Post to channels",          ConfigPanel: AgentIntegrationNode },
  agent_integration_telegram:       { label: "Telegram",        icon: Zap, logoUrl: imgTelegram,       colorClass: "text-[#229ED9]", accentColor: "34,158,217",  category: "ai_agent", agentOnly: true, description: "Send messages via bot",     ConfigPanel: AgentIntegrationNode },
  agent_integration_notion:         { label: "Notion",          icon: FileText, logoUrl: imgNotion,    colorClass: "text-zinc-300",  accentColor: "161,161,170", category: "ai_agent", agentOnly: true, description: "Create & query pages",      ConfigPanel: AgentIntegrationNode, imgFilter: "invert(1)" },
  agent_integration_airtable:       { label: "Airtable",        icon: Database, logoUrl: imgAirtable,  colorClass: "text-[#F82B60]", accentColor: "248,43,96",   category: "ai_agent", agentOnly: true, description: "Create & read records",     ConfigPanel: AgentIntegrationNode },
  agent_integration_google_sheets:  { label: "Google Sheets",   icon: FileText, logoUrl: imgGoogleSheets, colorClass: "text-[#34A853]", accentColor: "52,168,83", category: "ai_agent", agentOnly: true, description: "Read & append rows",      ConfigPanel: AgentIntegrationNode },
  agent_integration_google_calendar:{ label: "Google Calendar", icon: Zap, logoUrl: imgGoogleCalendar, colorClass: "text-[#4285F4]", accentColor: "66,133,244",  category: "ai_agent", agentOnly: true, description: "Create & manage events",   ConfigPanel: AgentIntegrationNode },
  agent_integration_google_drive:   { label: "Google Drive",    icon: Zap, logoUrl: imgGoogleDrive,    colorClass: "text-[#FBBC05]", accentColor: "251,188,5",   category: "ai_agent", agentOnly: true, description: "Upload, list & share files",ConfigPanel: AgentIntegrationNode },
  agent_integration_outlook:        { label: "Outlook",         icon: Mail, logoUrl: imgOutlook,       colorClass: "text-[#0078D4]", accentColor: "0,120,212",   category: "ai_agent", agentOnly: true, description: "Email via Microsoft",       ConfigPanel: AgentIntegrationNode },
  agent_integration_github:         { label: "GitHub",          icon: GitBranch, logoUrl: imgGitHub,   colorClass: "text-zinc-300",  accentColor: "161,161,170", category: "ai_agent", agentOnly: true, description: "Issues, PRs, comments",     ConfigPanel: AgentIntegrationNode, imgFilter: "invert(1)" },
  agent_integration_linear:         { label: "Linear",          icon: Zap, logoUrl: imgLinear,         colorClass: "text-[#5E6AD2]", accentColor: "94,106,210",  category: "ai_agent", agentOnly: true, description: "Create & update issues",    ConfigPanel: AgentIntegrationNode },
  agent_integration_hubspot:        { label: "HubSpot",         icon: Zap, logoUrl: imgHubSpot,        colorClass: "text-[#FF7A59]", accentColor: "255,122,89",  category: "ai_agent", agentOnly: true, description: "CRM contacts & deals",      ConfigPanel: AgentIntegrationNode },
  agent_integration_jira:           { label: "Jira",            icon: Zap, logoUrl: imgJira,           colorClass: "text-[#0052CC]", accentColor: "0,82,204",    category: "ai_agent", agentOnly: true, description: "Tickets, sprints & projects",ConfigPanel: AgentIntegrationNode },
  agent_integration_asana:          { label: "Asana",           icon: Zap, logoUrl: imgAsana,          colorClass: "text-[#F06A6A]", accentColor: "240,106,106", category: "ai_agent", agentOnly: true, description: "Tasks & project tracking",  ConfigPanel: AgentIntegrationNode },
  agent_integration_stripe:         { label: "Stripe",          icon: Zap, logoUrl: imgStripe,         colorClass: "text-[#635BFF]", accentColor: "99,91,255",   category: "ai_agent", agentOnly: true, description: "Payments & subscriptions",  ConfigPanel: AgentIntegrationNode },
  agent_integration_shopify:        { label: "Shopify",         icon: Zap, logoUrl: imgShopify,        colorClass: "text-[#95BF47]", accentColor: "149,191,71",  category: "ai_agent", agentOnly: true, description: "Orders, products, customers",ConfigPanel: AgentIntegrationNode },
  agent_integration_clickup:        { label: "ClickUp",         icon: Zap, logoUrl: imgClickUp,        colorClass: "text-[#7B68EE]", accentColor: "123,104,238", category: "ai_agent", agentOnly: true, description: "Tasks & workspace mgmt",    ConfigPanel: AgentIntegrationNode },
  agent_integration_twilio:         { label: "Twilio",          icon: Zap, logoUrl: imgTwilio,         colorClass: "text-[#F22F46]", accentColor: "242,47,70",   category: "ai_agent", agentOnly: true, description: "SMS & voice messaging",     ConfigPanel: AgentIntegrationNode },
  agent_integration_mongodb:        { label: "MongoDB",         icon: Database, logoUrl: imgMongoDB,   colorClass: "text-[#4DB33D]", accentColor: "77,179,61",   category: "ai_agent", agentOnly: true, description: "Query & insert documents",  ConfigPanel: AgentIntegrationNode },
  agent_integration_postgres:       { label: "PostgreSQL",      icon: Database, logoUrl: imgPostgres,  colorClass: "text-[#336791]", accentColor: "51,103,145",  category: "ai_agent", agentOnly: true, description: "Run SQL queries",           ConfigPanel: AgentIntegrationNode },
  agent_integration_redis:          { label: "Redis",           icon: Database, logoUrl: imgRedis,     colorClass: "text-[#DC382D]", accentColor: "220,56,45",   category: "ai_agent", agentOnly: true, description: "Get & set cache values",    ConfigPanel: AgentIntegrationNode },

  // ── Agent Tools — Search (12) ────────────────────────────────────────────────
  tool_google_search: {
    label: "Google Search",
    icon: Search,
    logoUrl: imgGoogle,
    imgFilter: "invert(1)",
    colorClass: "text-blue-400",
    accentColor: "96,165,250",
    category: "ai_agent",
    agentOnly: true,
    description: "Live Google search results via SerpApi",
    ConfigPanel: makeAgentToolPanel({
      label: "Google Search",
      description: "Search Google for real-time results",
      fields: [
        {
          key: "apiKey",
          label: "SerpApi Key",
          type: "text",
          placeholder: "your-serpapi-key",
        },
      ],
    }),
  },
  tool_tavily: {
    label: "Tavily Search",
    icon: Search,
    logoUrl: imgTavily,
    colorClass: "text-teal-400",
    accentColor: "45,212,191",
    category: "ai_agent",
    agentOnly: true,
    description: "AI-optimised search engine for agents",
    ConfigPanel: makeAgentToolPanel({
      label: "Tavily",
      description: "Search optimised for AI agents",
      fields: [
        {
          key: "apiKey",
          label: "Tavily API Key",
          type: "text",
          placeholder: "tvly-...",
        },
      ],
    }),
  },
  tool_news: {
    label: "News Search",
    icon: Newspaper,
    colorClass: "text-zinc-300",
    accentColor: "212,212,216",
    category: "ai_agent",
    agentOnly: true,
    description: "Search latest news articles worldwide",
    ConfigPanel: makeAgentToolPanel({
      label: "News Search",
      description: "Fetch real-time news headlines",
      fields: [
        {
          key: "apiKey",
          label: "NewsAPI Key",
          type: "text",
          placeholder: "your-newsapi-key",
        },
      ],
    }),
  },

  // ── Agent Tools — Code & Terminal (8) ───────────────────────────────────────
  tool_js: {
    label: "JavaScript",
    icon: Code2,
    logoUrl: imgJS,
    imgFilter: "invert(1)",
    colorClass: "text-yellow-400",
    accentColor: "250,204,21",
    category: "ai_agent",
    agentOnly: true,
    description: "Execute JavaScript in a sandboxed runtime",
    ConfigPanel: makeAgentToolPanel({
      label: "JavaScript",
      description: "Run JS code snippets safely",
    }),
  },
  tool_bash: {
    label: "Bash Shell",
    icon: Terminal,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    category: "ai_agent",
    agentOnly: true,
    description: "Run shell commands on the local machine",
    ConfigPanel: makeAgentToolPanel({
      label: "Bash Shell",
      description: "Execute bash commands locally",
    }),
  },
  tool_virtual_computer: {
    label: "Virtual Computer",
    icon: Monitor,
    logoUrl: imgComputer,
    imgFilter: "brightness(0) invert(1)",
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    category: "ai_agent",
    agentOnly: true,
    description: "Control a full browser-based virtual computer",
    ConfigPanel: VirtualComputerPanel,
  },

  // ── Agent Tools — Browser & Web (6) ─────────────────────────────────────────
  tool_scraper: {
    label: "Web Scraper",
    icon: Globe,
    colorClass: "text-sky-400",
    accentColor: "56,189,248",
    category: "ai_agent",
    agentOnly: true,
    description: "Scrape content from any URL",
    ConfigPanel: ToolScraperPanel,
  },
  tool_http_request: {
    label: "HTTP Request",
    icon: Globe,
    colorClass: "text-blue-500",
    accentColor: "59,130,246",
    category: "ai_agent",
    agentOnly: true,
    description: "Make any HTTP request and return the response",
    ConfigPanel: ToolHttpRequestPanel,
  },

  // ── Agent Tools — Files & Data (7) ──────────────────────────────────────────
  tool_file_read: {
    label: "File Read",
    icon: FolderOpen,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    category: "ai_agent",
    agentOnly: true,
    description: "Read files from the local filesystem",
    ConfigPanel: makeAgentToolPanel({
      label: "File Read",
      description: "Read file contents by path",
    }),
  },
  tool_file_write: {
    label: "File Write",
    icon: FileOutput,
    colorClass: "text-amber-500",
    accentColor: "245,158,11",
    category: "ai_agent",
    agentOnly: true,
    description: "Write or append content to files",
    ConfigPanel: makeAgentToolPanel({
      label: "File Write",
      description: "Write text or binary content to a file",
    }),
  },
  tool_csv: {
    label: "CSV Parser",
    icon: Table2,
    colorClass: "text-green-400",
    accentColor: "74,222,128",
    category: "ai_agent",
    agentOnly: true,
    description: "Read, parse, and query CSV files",
    ConfigPanel: makeAgentToolPanel({
      label: "CSV Parser",
      description: "Parse and query CSV tabular data",
    }),
  },
  tool_pdf: {
    label: "PDF Reader",
    icon: FileText,
    colorClass: "text-red-300",
    accentColor: "252,165,165",
    category: "ai_agent",
    agentOnly: true,
    description: "Extract text and data from PDF files",
    ConfigPanel: makeAgentToolPanel({
      label: "PDF Reader",
      description: "Read and extract content from PDF files",
    }),
  },
  tool_json: {
    label: "JSON Tool",
    icon: Code2,
    colorClass: "text-yellow-300",
    accentColor: "253,224,71",
    category: "ai_agent",
    agentOnly: true,
    description: "Parse, query, and transform JSON data",
    ConfigPanel: makeAgentToolPanel({
      label: "JSON Tool",
      description: "Parse, validate, and transform JSON",
    }),
  },
  tool_excel: {
    label: "Excel Reader",
    icon: LayoutGrid,
    colorClass: "text-green-500",
    accentColor: "34,197,94",
    category: "ai_agent",
    agentOnly: true,
    description: "Read and query Excel / XLSX spreadsheets",
    ConfigPanel: makeAgentToolPanel({
      label: "Excel Reader",
      description: "Parse Excel spreadsheets into data",
    }),
  },
  // ── Agent Tools — Databases (5) ─────────────────────────────────────────────
  tool_sql: {
    label: "SQL Query",
    icon: Database,
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    category: "ai_agent",
    agentOnly: true,
    description: "Run SQL queries on any database",
    ConfigPanel: ToolSqlPanel,
  },
  tool_mongodb: {
    label: "MongoDB Query",
    icon: Database,
    logoUrl: imgMongoDB,
    colorClass: "text-green-400",
    accentColor: "74,222,128",
    category: "ai_agent",
    agentOnly: true,
    description: "Query and update MongoDB collections",
    ConfigPanel: ToolMongodbPanel,
  },

  // ── Agent Tools — Communication (6) ─────────────────────────────────────────
  tool_email: {
    label: "Send Email",
    icon: Mail,
    logoUrl: imgSendGrid,
    colorClass: "text-rose-400",
    accentColor: "251,113,133",
    category: "ai_agent",
    agentOnly: true,
    description: "Compose and send emails",
    ConfigPanel: makeAgentToolPanel({
      label: "Send Email",
      description: "Send emails via SMTP or a provider",
      fields: [
        {
          key: "credential",
          label: "Email Credential",
          type: "credential",
          credentialType: "Email",
        },
      ],
    }),
  },
  tool_slack: {
    label: "Slack Message",
    icon: MessageCircle,
    logoUrl: imgSlack,
    colorClass: "text-purple-400",
    accentColor: "192,132,252",
    category: "ai_agent",
    agentOnly: true,
    description: "Send messages to Slack channels",
    ConfigPanel: makeAgentToolPanel({
      label: "Slack Message",
      description: "Post messages to Slack",
      fields: [
        {
          key: "credential",
          label: "Slack Credential",
          type: "credential",
          credentialType: "Slack",
        },
      ],
    }),
  },
  tool_discord: {
    label: "Discord Message",
    icon: MessageCircle,
    logoUrl: imgDiscord,
    colorClass: "text-indigo-400",
    accentColor: "129,140,248",
    category: "ai_agent",
    agentOnly: true,
    description: "Send messages to Discord channels",
    ConfigPanel: makeAgentToolPanel({
      label: "Discord Message",
      description: "Post messages to Discord",
      fields: [
        {
          key: "credential",
          label: "Discord Credential",
          type: "credential",
          credentialType: "Discord",
        },
      ],
    }),
  },
  tool_telegram: {
    label: "Telegram",
    icon: Send,
    logoUrl: imgTelegram,
    colorClass: "text-sky-400",
    accentColor: "56,189,248",
    category: "ai_agent",
    agentOnly: true,
    description: "Send Telegram messages and media",
    ConfigPanel: makeAgentToolPanel({
      label: "Telegram",
      description: "Send messages via Telegram Bot",
      fields: [
        {
          key: "credential",
          label: "Telegram Credential",
          type: "credential",
          credentialType: "Telegram",
        },
      ],
    }),
  },
  tool_webhook: {
    label: "Webhook Call",
    icon: Webhook,
    colorClass: "text-rose-400",
    accentColor: "251,113,133",
    category: "ai_agent",
    agentOnly: true,
    description: "Trigger an outbound webhook URL",
    ConfigPanel: ToolWebhookPanel,
  },

  // ── Agent Tools — AI Specialized ────────────────────────────────────────────
  tool_translate: {
    label: "Translate",
    icon: Languages,
    colorClass: "text-blue-400",
    accentColor: "96,165,250",
    category: "ai_agent",
    agentOnly: true,
    description: "Translate text between any languages",
    ConfigPanel: makeAgentToolPanel({
      label: "Translate",
      description: "Translate content to any target language",
      fields: [
        {
          key: "targetLanguage",
          label: "Default Target Language",
          type: "text",
          placeholder: "Spanish",
        },
      ],
    }),
  },
  tool_ocr: {
    label: "OCR",
    icon: ScanLine,
    colorClass: "text-sky-400",
    accentColor: "56,189,248",
    category: "ai_agent",
    agentOnly: true,
    description: "Extract printed text from images and scans",
    ConfigPanel: makeAgentToolPanel({
      label: "OCR",
      description: "Read text from images and documents",
    }),
  },

  // ── Agent Tools — Math & Compute (6) ────────────────────────────────────────
  // ── Agent Tools — Productivity ──────────────────────────────────────────────
  tool_calendar: {
    label: "Google Calendar",
    icon: Calendar,
    logoUrl: imgGoogleCalendar,
    colorClass: "text-blue-400",
    accentColor: "96,165,250",
    category: "ai_agent",
    agentOnly: true,
    description: "Create, read, and update calendar events",
    ConfigPanel: makeAgentToolPanel({
      label: "Google Calendar",
      description: "Manage calendar events",
      fields: [
        {
          key: "credential",
          label: "Google Credential",
          type: "credential",
          credentialType: "Google",
        },
      ],
    }),
  },
  // ── Agent Tools — Orchestration ─────────────────────────────────────────────
  tool_think: {
    label: "Think",
    icon: Brain,
    colorClass: "text-violet-400",
    accentColor: "139,92,246",
    category: "ai_agent",
    agentOnly: true,
    description:
      "Internal reasoning scratchpad — improves agent logic before acting",
    ConfigPanel: ToolThinkPanel,
  },
  tool_call_workflow: {
    label: "Call Workflow",
    icon: Zap,
    colorClass: "text-yellow-400",
    accentColor: "250,204,21",
    category: "ai_agent",
    agentOnly: true,
    description: "Run any Blinkbox workflow as an agent tool",
    ConfigPanel: ToolCallWorkflowPanel,
  },
  tool_mcp_client: {
    label: "MCP Client",
    icon: Network,
    logoUrl: imgMCP,
    imgFilter: "invert(1)",
    colorClass: "text-teal-400",
    accentColor: "45,212,191",
    category: "ai_agent",
    agentOnly: true,
    description: "Connect to any MCP server — one node exposes dozens of tools",
    ConfigPanel: ToolMcpClientPanel,
  },
  tool_memory_store: {
    label: "Memory Store",
    icon: MemoryStick,
    colorClass: "text-pink-400",
    accentColor: "244,114,182",
    category: "ai_agent",
    agentOnly: true,
    description: "Store and retrieve keyed values across agent turns",
    ConfigPanel: makeAgentToolPanel({
      label: "Memory Store",
      description: "Persistent key-value scratch memory for the agent",
    }),
  },

  // Data & APIs
  http_request: {
    label: "HTTP Request",
    icon: Globe,
    colorClass: "text-blue-400",
    accentColor: "59,130,246",
    logoUrl: imgHTTP,
    ConfigPanel: HttpRequestNode,
    category: "infra",
    description: "Call any REST API with headers, auth, body and retries",
  },
  postgres: {
    label: "PostgreSQL",
    icon: Server,
    colorClass: "text-white",
    accentColor: "91,155,213",
    logoUrl: imgPostgres,
    ConfigPanel: PostgresNode,
    category: "databases",
    description: "Query, insert and manage rows in PostgreSQL",
  },
  supabase: {
    label: "Supabase",
    icon: Database,
    logoUrl: imgSupabase,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: SupabaseNode,
    category: "databases",
    description: "Read and write Supabase tables, auth users and storage",
  },
  mongodb: {
    label: "MongoDB",
    icon: Database,
    logoUrl: imgMongoDB,
    colorClass: "text-[#47A248]",
    accentColor: "71,162,72",
    ConfigPanel: MongoDBNode,
    category: "databases",
    description: "Find, write and aggregate MongoDB documents",
  },
  redis_node: {
    label: "Redis",
    icon: Server,
    logoUrl: imgRedis,
    colorClass: "text-[#FF4438]",
    accentColor: "255,68,56",
    ConfigPanel: RedisNode,
    category: "databases",
    description: "Read and write Redis keys, lists, sets and hashes",
  },
  firebase: {
    label: "Firebase",
    icon: Database,
    logoUrl: imgFirebase,
    colorClass: "text-[#FFCA28]",
    accentColor: "255,202,40",
    ConfigPanel: FirebaseNode,
    category: "databases",
    description: "Work with Firestore documents, Auth users and push messaging",
  },

  // Transform (array/data manipulation)
  filter_array: {
    label: "Filter Array",
    icon: Filter,
    colorClass: "text-pink-400",
    accentColor: "244,114,182",
    ConfigPanel: FilterArrayNode,
    category: "logic",
    description: "Keep only the array items matching a condition",
  },
  sort_array: {
    label: "Sort Array",
    icon: ArrowUpDown,
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: SortArrayNode,
    category: "logic",
    description: "Reorder array items by a field value",
  },
  deduplicate: {
    label: "Deduplicate",
    icon: Layers,
    logoUrl: imgDeduplicate,
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    ConfigPanel: DeduplicateNode,
    category: "logic",
    description: "Remove duplicate items from an array",
  },
  csv_parser: {
    label: "CSV Parser",
    icon: FileText,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: CSVParserNode,
    category: "data",
    description: "Convert CSV text into JSON rows, or JSON arrays back into CSV",
  },
  data_mapper: {
    label: "Data Mapper",
    icon: Database,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: DataMapperNode,
    category: "data",
    description: "Set, rename, filter, remove or pick fields on the incoming payload",
  },
  date_time:         { label: "Date & Time",        icon: Calendar,       colorClass: "text-blue-400",   accentColor: "96,165,250",  ConfigPanel: DateTimeNode,         category: "data", description: "Parse, format and manipulate dates and times" },
  crypto_utils:      { label: "Crypto / Hash",       icon: Lock,           colorClass: "text-yellow-400", accentColor: "250,204,21",  ConfigPanel: CryptoUtilsNode,      category: "data", description: "Hash, encrypt and HMAC sign data with SHA, MD5, AES" },
  image_resize:      { label: "Image Resize",        icon: Image,          colorClass: "text-purple-400", accentColor: "192,132,252", ConfigPanel: ImageResizeNode,      category: "infra", description: "Resize, crop, convert and optimise images" },
  pdf_generator:     { label: "PDF Generator",       icon: FileText,       colorClass: "text-red-400",    accentColor: "248,113,113", ConfigPanel: PDFGeneratorNode,     category: "infra", description: "Generate PDFs from HTML templates and merge documents" },
  email_parser:      { label: "Email Parser",        icon: Mail,           colorClass: "text-blue-400",   accentColor: "96,165,250",  ConfigPanel: EmailParserNode,      category: "infra", description: "Parse raw email into subject, body, attachments and headers" },
  text_format:       { label: "Text Format",         icon: AlignLeft,      colorClass: "text-zinc-300",   accentColor: "212,212,216", ConfigPanel: TextFormatNode,       category: "data", description: "Trim, truncate, slugify, case-convert and pad strings" },
  regex_match:       { label: "Regex Match",         icon: Regex,          colorClass: "text-green-400",  accentColor: "74,222,128",  ConfigPanel: RegexMatchNode,       category: "data", description: "Test, capture and replace with regular expressions" },
  json_transform:    { label: "JSON Transform",      icon: Braces,         colorClass: "text-emerald-400",accentColor: "52,211,153",  ConfigPanel: JsonTransformNode,    category: "data", description: "Parse, stringify, or extract values from JSON without code" },
  math_expression:   { label: "Math Expression",     icon: Calculator,     colorClass: "text-blue-400",   accentColor: "96,165,250",  ConfigPanel: MathExpressionNode,   category: "data", description: "Evaluate math expressions, formulas and unit conversions" },

  // Research
  web_scraper: {
    label: "Web Scraper",
    icon: Search,
    colorClass: "text-white",
    accentColor: "168,85,247",
    logoUrl: imgComputer,
    imgFilter: "brightness(0) invert(1)",
    ConfigPanel: InformerNode,
    category: "infra",
    description: "Extract text, links and structured data from any web page",
  },
  web_search: {
    label: "Web Search",
    icon: Globe,
    logoUrl: imgGoogle,
    colorClass: "text-white",
    accentColor: "129,140,248",
    ConfigPanel: WebSearchNode,
    category: "infra",
    description: "Search the web and return ranked results with snippets",
  },
  // Logic & Flow
  delay: {
    label: "Delay",
    icon: Hourglass,
    logoUrl: imgDelay,
    colorClass: "text-white",
    accentColor: "251,146,60",
    ConfigPanel: DelayNode,
    category: "logic",
    description: "Pause the workflow, then resume automatically",
  },
  loop: {
    label: "Loop",
    icon: Repeat,
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    ConfigPanel: LoopNode,
    category: "logic",
    description: "Run every downstream node once per array item",
  },
  merge: {
    label: "Merge",
    icon: Merge,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: MergeNode,
    category: "logic",
    description: "Wait for parallel branches and combine their outputs into one",
  },

  // Code
  code: {
    label: "Code",
    icon: Code2,
    logoUrl: imgCode,
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    ConfigPanel: CodeNode,
    category: "infra",
    description: "Run sandboxed JavaScript with access to upstream data — no filesystem or network",
  },

  // Integrations (comms) — all have logoUrl so colorClass is fallback only
  telegram: {
    label: "Telegram",
    icon: Brain,
    colorClass: "text-[#26A5E4]",
    accentColor: "38,165,228",
    logoUrl: imgTelegram,
    ConfigPanel: TelegramNode,
    category: "apps",
    description: "Send messages, media and polls via the Telegram Bot API",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: Brain,
    colorClass: "text-[#25D366]",
    accentColor: "37,211,102",
    logoUrl: imgWhatsApp,
    ConfigPanel: WhatsAppNode,
    category: "apps",
    description: "Send messages, media and templates via WhatsApp Business",
  },
  slack: {
    label: "Slack",
    icon: Brain,
    colorClass: "text-[#E01E5A]",
    accentColor: "224,30,90",
    logoUrl: imgSlack,
    ConfigPanel: SlackNode,
    category: "apps",
    description: "Post messages, upload files and manage Slack channels",
  },
  discord: {
    label: "Discord",
    icon: Brain,
    colorClass: "text-[#5865F2]",
    accentColor: "88,101,242",
    logoUrl: imgDiscord,
    ConfigPanel: DiscordNode,
    category: "apps",
    description: "Send messages, embeds and files to Discord channels",
  },
  gmail: {
    label: "Gmail",
    icon: Brain,
    colorClass: "text-[#EA4335]",
    accentColor: "234,67,53",
    logoUrl: imgGmail,
    ConfigPanel: GmailNode,
    category: "apps",
    description: "Send, read, label and search email in Gmail",
  },
  twilio: {
    label: "Twilio",
    icon: Brain,
    colorClass: "text-[#F22F46]",
    accentColor: "242,47,70",
    logoUrl: imgTwilio,
    ConfigPanel: TwilioNode,
    category: "apps",
    description: "Send SMS, place calls and verify numbers with Twilio",
  },
  sendgrid: {
    label: "SendGrid",
    icon: Brain,
    colorClass: "text-[#1A82E2]",
    accentColor: "26,130,226",
    logoUrl: imgSendGrid,
    ConfigPanel: SendGridNode,
    category: "apps",
    description: "Send transactional email and manage SendGrid contacts",
  },
  airtable: {
    label: "Airtable",
    icon: Brain,
    colorClass: "text-[#F65858]",
    accentColor: "246,88,88",
    logoUrl: imgAirtable,
    ConfigPanel: AirtableNode,
    category: "apps",
    description: "Create, update and query records in Airtable bases",
  },
  google_sheets: {
    label: "Google Sheets",
    icon: Brain,
    colorClass: "text-[#0F9D58]",
    accentColor: "15,157,88",
    logoUrl: imgGoogleSheets,
    ConfigPanel: GoogleSheetsNode,
    category: "apps",
    description: "Read, append and update rows in Google Sheets",
  },
  notion: {
    label: "Notion",
    icon: Brain,
    colorClass: "text-white",
    accentColor: "255,255,255",
    logoUrl: imgNotion,
    ConfigPanel: NotionNode,
    category: "apps",
    description: "Create and query Notion pages, databases and blocks",
  },

  // Google Workspace
  google_calendar: {
    label: "Google Calendar",
    icon: Calendar,
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    logoUrl: imgGoogleCalendar,
    ConfigPanel: GoogleCalendarNode,
    category: "apps",
    description: "Create, update and list Google Calendar events",
  },
  google_drive: {
    label: "Google Drive",
    icon: Database,
    colorClass: "text-[#FBBC04]",
    accentColor: "251,188,4",
    logoUrl: imgGoogleDrive,
    ConfigPanel: GoogleDriveNode,
    category: "apps",
    description: "Upload, download, move and share Google Drive files",
  },

  // Developer Tools
  graphql_request: {
    label: "GraphQL Request",
    icon: Network,
    colorClass: "text-pink-400",
    accentColor: "244,114,182",
    ConfigPanel: GraphQLNode,
    category: "infra",
    description: "Query or mutate any GraphQL API with variables and auth",
  },
  sftp: {
    label: "SFTP",
    icon: UploadCloud,
    colorClass: "text-sky-400",
    accentColor: "56,189,248",
    ConfigPanel: SftpNode,
    category: "infra",
    description: "Upload, download, list or delete files via SFTP",
  },
  s3: {
    label: "S3",
    icon: DownloadCloud,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    logoUrl: imgAWS,
    ConfigPanel: S3Node,
    category: "infra",
    description:
      "AWS S3 (and S3-compatible) object storage — upload, download, presign",
  },
  webhook_response: {
    label: "Webhook Response",
    icon: Send,
    colorClass: "text-violet-400",
    accentColor: "167,139,250",
    ConfigPanel: WebhookResponseNode,
    category: "infra",
    description: "Send a custom HTTP response to the webhook caller",
  },
  github: {
    label: "GitHub",
    icon: Github,
    colorClass: "text-zinc-200",
    accentColor: "244,244,245",
    logoUrl: imgGitHub,
    ConfigPanel: GithubNode,
    category: "infra",
    description: "Manage GitHub issues, pull requests, releases and repos",
  },
  jira: {
    label: "Jira",
    icon: Ticket,
    colorClass: "text-[#2684FF]",
    accentColor: "38,132,255",
    logoUrl: imgJira,
    ConfigPanel: JiraNode,
    category: "apps",
    description: "Create and manage Jira issues, comments and projects",
  },
  linear: {
    label: "Linear",
    icon: Circle,
    colorClass: "text-[#5E6AD2]",
    accentColor: "94,106,210",
    logoUrl: imgLinear,
    ConfigPanel: LinearNode,
    category: "apps",
    description: "Manage Linear issues, comments, teams and projects",
  },

  // Payments
  stripe: {
    label: "Stripe",
    icon: CreditCard,
    colorClass: "text-[#635BFF]",
    accentColor: "99,91,255",
    logoUrl: imgStripe,
    ConfigPanel: StripeNode,
    category: "apps",
    description: "Manage customers, payments, invoices and products in Stripe",
  },

  // CRM & E-commerce
  hubspot: {
    label: "HubSpot",
    icon: Users,
    colorClass: "text-[#FF7A59]",
    accentColor: "255,122,89",
    logoUrl: imgHubSpot,
    ConfigPanel: HubSpotNode,
    category: "apps",
    description: "Manage contacts, deals, companies and notes in HubSpot",
  },
  shopify: {
    label: "Shopify",
    icon: ShoppingBag,
    colorClass: "text-[#95BF47]",
    accentColor: "149,191,71",
    logoUrl: imgShopify,
    ConfigPanel: ShopifyNode,
    category: "apps",
    description: "Manage products, orders and customers in Shopify",
  },



  // ── New Utility Nodes ──────────────────────────────────────────────────────
  template_renderer: {
    label: "Template Renderer",
    icon: AlignLeft,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: TemplateRendererNode,
    category: "data",
    description: "Render a Handlebars template with data from upstream nodes",
  },
  aggregate: {
    label: "Aggregate",
    icon: Package,
    colorClass: "text-teal-400",
    accentColor: "45,212,191",
    ConfigPanel: AggregateNode,
    category: "logic",
    description: "Collect items from a loop into a single array",
  },
  // ── Coding Agents ─────────────────────────────────────────────────────────

  // ── New Integration Nodes ──────────────────────────────────────────────────
  elevenlabs: {
    label: "ElevenLabs",
    icon: Mic2,
    colorClass: "text-white",
    accentColor: "161,161,170",
    logoUrl: imgElevenLabs,
    ConfigPanel: ElevenLabsNode,
    category: "infra",
    description: "Generate lifelike speech from text with ElevenLabs voices",
  },
  pinecone: {
    label: "Pinecone",
    icon: Box,
    logoUrl: imgPinecone,
    colorClass: "text-green-400",
    accentColor: "74,222,128",
    ConfigPanel: PineconeNode,
    category: "databases",
    description: "Upsert and query vectors in a Pinecone index",
  },
  resend: {
    label: "Resend",
    icon: Mail,
    colorClass: "text-white",
    accentColor: "161,161,170",
    logoUrl: imgResend,
    ConfigPanel: ResendNode,
    category: "apps",
  },
  gitlab: {
    label: "GitLab",
    icon: Github,
    colorClass: "text-[#FC6D26]",
    accentColor: "252,109,38",
    logoUrl: imgGitLab,
    ConfigPanel: GitLabNode,
    category: "infra",
    description: "Manage GitLab issues, MRs, pipelines and repositories",
  },
  trello: {
    label: "Trello",
    icon: Ticket,
    colorClass: "text-[#0052CC]",
    accentColor: "0,82,204",
    logoUrl: imgTrello,
    ConfigPanel: TrelloNode,
    category: "apps",
    description:
      "Create cards, move to lists, add comments and manage Trello boards",
  },
  asana: {
    label: "Asana",
    icon: Circle,
    colorClass: "text-[#F06A6A]",
    accentColor: "240,106,106",
    logoUrl: imgAsana,
    ConfigPanel: AsanaNode,
    category: "apps",
    description: "Create tasks, update status and manage Asana projects",
  },
  clickup: {
    label: "ClickUp",
    icon: CheckSquare,
    colorClass: "text-[#7B68EE]",
    accentColor: "123,104,238",
    logoUrl: imgClickUp,
    ConfigPanel: ClickUpNode,
    category: "apps",
    description: "Create tasks, update status and manage ClickUp spaces",
  },
  monday: {
    label: "Monday.com",
    icon: LayoutGrid,
    colorClass: "text-[#FF3D57]",
    accentColor: "255,61,87",
    logoUrl: imgMonday,
    ConfigPanel: MondayNode,
    category: "apps",
    description: "Create items, update columns and manage Monday.com boards",
  },
  pipedrive: {
    label: "Pipedrive",
    icon: Users,
    colorClass: "text-[#F55137]",
    accentColor: "245,81,55",
    logoUrl: imgPipedrive,
    ConfigPanel: PipedriveNode,
    category: "apps",
    description: "Create deals, contacts, activities and manage Pipedrive CRM",
  },
  intercom: {
    label: "Intercom",
    icon: MessageCircle,
    colorClass: "text-[#1F8DED]",
    accentColor: "31,141,237",
    logoUrl: imgIntercom,
    ConfigPanel: IntercomNode,
    category: "apps",
    description:
      "Send messages, create conversations and manage Intercom contacts",
  },
  woocommerce: {
    label: "WooCommerce",
    icon: ShoppingBag,
    colorClass: "text-[#7F54B3]",
    accentColor: "127,84,179",
    logoUrl: imgWooCommerce,
    ConfigPanel: WooCommerceNode,
    category: "apps",
    description: "Manage WooCommerce orders, products and customers",
  },
  typeform: {
    label: "Typeform",
    icon: FileText,
    colorClass: "text-white",
    accentColor: "161,161,170",
    logoUrl: imgTypeform,
    ConfigPanel: TypeformNode,
    category: "apps",
    description: "Create forms, fetch responses and manage Typeform workspaces",
  },
  // Microsoft
  outlook: {
    label: "Outlook",
    icon: Mail,
    colorClass: "text-[#0078D4]",
    accentColor: "0,120,212",
    logoUrl: imgOutlook,
    ConfigPanel: OutlookNode,
    category: "apps",
    description:
      "Send emails, manage calendar and contacts via Microsoft Outlook",
  },
  teams: {
    label: "Microsoft Teams",
    icon: MessageCircle,
    colorClass: "text-[#6264A7]",
    accentColor: "98,100,167",
    logoUrl: imgTeams,
    ConfigPanel: TeamsNode,
    category: "apps",
    description: "Send messages, create channels and manage Microsoft Teams",
  },
  onedrive: {
    label: "OneDrive",
    icon: FolderOpen,
    colorClass: "text-[#0078D4]",
    accentColor: "0,120,212",
    logoUrl: imgOneDrive,
    ConfigPanel: OneDriveNode,
    category: "apps",
    description: "Upload, download and manage files in Microsoft OneDrive",
  },
  sharepoint: {
    label: "SharePoint",
    icon: Database,
    colorClass: "text-[#0078D4]",
    accentColor: "0,120,212",
    logoUrl: imgSharePoint,
    ConfigPanel: SharePointNode,
    category: "apps",
    description: "Manage SharePoint lists, libraries and pages",
  },
  azure_devops: {
    label: "Azure DevOps",
    icon: GitBranch,
    colorClass: "text-[#0078D4]",
    accentColor: "0,120,212",
    logoUrl: imgAzureDevOps,
    ConfigPanel: AzureDevOpsNode,
    category: "infra",
    description: "Manage work items, pipelines and repos in Azure DevOps",
  },
  // Google
  google_docs: {
    label: "Google Docs",
    icon: FileText,
    colorClass: "text-[#4285F4]",
    accentColor: "66,133,244",
    logoUrl: imgGoogleDocs,
    ConfigPanel: GoogleDocsNode,
    category: "apps",
    description: "Create, read and update Google Docs documents",
  },
  google_forms: {
    label: "Google Forms",
    icon: Clipboard,
    colorClass: "text-[#673AB7]",
    accentColor: "103,58,183",
    logoUrl: imgGoogleForms,
    ConfigPanel: GoogleFormsNode,
    category: "apps",
    description: "Create forms, fetch responses and manage Google Forms",
  },
  // DevOps / Monitoring
  sentry: {
    label: "Sentry",
    icon: AlertTriangle,
    colorClass: "text-[#FB4226]",
    accentColor: "251,66,38",
    logoUrl: imgSentry,
    ConfigPanel: SentryNode,
    category: "infra",
    description: "Resolve issues, assign errors and manage Sentry projects",
  },
  vercel: {
    label: "Vercel",
    icon: Triangle,
    colorClass: "text-white",
    accentColor: "228,228,231",
    logoUrl: imgVercel,
    ConfigPanel: VercelNode,
    category: "infra",
    description: "Trigger deployments, manage domains and fetch deploy status",
  },
  netlify: {
    label: "Netlify",
    icon: Globe,
    colorClass: "text-[#00C7B7]",
    accentColor: "0,199,183",
    logoUrl: imgNetlify,
    ConfigPanel: NetlifyNode,
    category: "infra",
    description: "Trigger builds, manage deploys and update site config",
  },
  pagerduty: {
    label: "PagerDuty",
    icon: Bell,
    colorClass: "text-[#06AC38]",
    accentColor: "6,172,56",
    logoUrl: imgPagerDuty,
    ConfigPanel: PagerDutyNode,
    category: "infra",
    description:
      "Create incidents, acknowledge alerts and manage on-call schedules",
  },
  datadog: {
    label: "Datadog",
    icon: Activity,
    colorClass: "text-[#632CA6]",
    accentColor: "99,44,166",
    logoUrl: imgDatadog,
    ConfigPanel: DatadogNode,
    category: "infra",
    description: "Send metrics, create monitors and query Datadog dashboards",
  },
  zendesk: {
    label: "Zendesk",
    icon: MessageCircle,
    colorClass: "text-[#00BFAD]",
    accentColor: "3,54,61",
    logoUrl: imgZendesk,
    ConfigPanel: ZendeskNode,
    category: "apps",
    description:
      "Create tickets, reply to customers and manage Zendesk support",
  },
  calendly: {
    label: "Calendly",
    icon: Calendar,
    colorClass: "text-[#006BFF]",
    accentColor: "0,107,255",
    logoUrl: imgCalendly,
    ConfigPanel: CalendlyNode,
    category: "apps",
    description:
      "Fetch bookings, cancel meetings and manage Calendly event types",
  },
  mailchimp: {
    label: "Mailchimp",
    icon: Mail,
    colorClass: "text-white",
    accentColor: "255,224,27",
    logoUrl: imgMailchimp,
    ConfigPanel: MailchimpNode,
    category: "apps",
    description: "Add subscribers, send campaigns and manage Mailchimp lists",
  },
  figma: {
    label: "Figma",
    icon: PenTool,
    colorClass: "text-[#F24E1E]",
    accentColor: "242,78,30",
    logoUrl: imgFigma,
    ConfigPanel: FigmaNode,
    category: "apps",
    description: "Fetch files, post comments and export assets from Figma",
  },
  // Infra
  ssh: {
    label: "SSH Command",
    icon: Server,
    colorClass: "text-white",
    accentColor: "161,161,170",
    logoUrl: imgSsh,
    ConfigPanel: SshNode,
    category: "infra",
    description: "Run a command on a remote server via SSH and capture output",
  },
  // Content / Feed
  youtube: {
    label: "YouTube",
    icon: Youtube,
    colorClass: "text-red-400",
    accentColor: "248,113,113",
    logoUrl: imgYouTube,
    ConfigPanel: YouTubeUploadNode,
    category: "apps",
    description: "Upload videos, manage playlists and fetch channel data",
  },
  reddit: {
    label: "Reddit",
    icon: MessageSquarePlus,
    colorClass: "text-[#FF4500]",
    accentColor: "255,69,0",
    logoUrl: imgReddit,
    ConfigPanel: RedditNode,
    category: "apps",
    description: "Post to subreddits, comment and fetch hot posts",
  },
  instagram: {
    label: "Instagram",
    icon: Camera,
    colorClass: "text-[#E4405F]",
    accentColor: "228,64,95",
    logoUrl: imgInstagram,
    ConfigPanel: InstagramNode,
    category: "apps",
    description: "Read posts, user media and publish content via Meta Graph API",
  },
  tiktok: {
    label: "TikTok",
    icon: Video,
    colorClass: "text-zinc-200",
    accentColor: "244,244,245",
    logoUrl: imgTikTok,
    ConfigPanel: TikTokNode,
    category: "apps",
    description: "Read user videos and channel data via TikTok v2 API",
  },
  linkedin: {
    label: "LinkedIn",
    icon: Briefcase,
    colorClass: "text-[#0A66C2]",
    accentColor: "10,102,194",
    logoUrl: imgLinkedIn,
    ConfigPanel: LinkedInNode,
    category: "apps",
    description: "Share posts, get profile and company data",
  },
  zoom: {
    label: "Zoom",
    icon: Video,
    colorClass: "text-[#2D8CFF]",
    accentColor: "45,140,255",
    logoUrl: imgZoom,
    ConfigPanel: ZoomNode,
    category: "apps",
    description: "Create and manage Zoom meetings",
  },
  ip_lookup: { label: "IP Lookup", icon: MapPin, colorClass: "text-violet-400", accentColor: "167,139,250", ConfigPanel: IpLookupNode, category: "infra", description: "Geolocate any IP — city, country, timezone, ISP" },
  dns_lookup: { label: "DNS Lookup", icon: Globe, colorClass: "text-blue-400", accentColor: "96,165,250", ConfigPanel: DnsLookupNode, category: "infra", description: "Resolve A, MX, TXT, NS, CNAME, SOA records for any hostname" },
  ssl_check: { label: "SSL Check", icon: Shield, colorClass: "text-green-400", accentColor: "74,222,128", ConfigPanel: SslCheckNode, category: "infra", description: "Inspect TLS certificate expiry and validity for any hostname" },
  http_monitor: { label: "HTTP Monitor", icon: Globe, colorClass: "text-emerald-400", accentColor: "52,211,153", ConfigPanel: HttpMonitorNode, category: "infra", description: "Check if an HTTP endpoint is up, track status code and latency" },
  rss: {
    label: "RSS Feed",
    icon: Rss,
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    logoUrl: imgRss,
    ConfigPanel: RssFeedGeneratorNode,
    category: "infra",
    description: "Read, parse and generate RSS / Atom feeds",
  },


  // ── Automation Utility Nodes ──────────────────────────────────────────────
  variable_set_get: {
    label: "Variable Set / Get",
    icon: ToggleLeft,
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: VariableSetGetNode,
    category: "data",
    description:
      "Store and retrieve values across nodes with execution/workflow/global scope",
  },
  file_upload: {
    label: "File Upload",
    icon: Upload,
    colorClass: "text-white",
    accentColor: "96,165,250",
    ConfigPanel: FileUploadNode,
    category: "infra",
    description: "Upload to S3, GCS, Azure Blob, SFTP or HTTP PUT",
  },
  file_download: {
    label: "File Download",
    icon: Download,
    colorClass: "text-white",
    accentColor: "52,211,153",
    ConfigPanel: FileDownloadNode,
    category: "infra",
    description:
      "Download any URL into payload as base64, text, JSON or buffer",
  },
  zip_files: {
    label: "Zip / Unzip",
    icon: Archive,
    colorClass: "text-white",
    accentColor: "161,161,170",
    ConfigPanel: ZipFilesNode,
    category: "infra",
    description:
      "Compress or extract ZIP, TAR and TAR.GZ archives with password support",
  },

  // ── Education & AI Nodes ─────────────────────────────────────────────────
  translation: {
    label: "Translation",
    icon: Languages,
    colorClass: "text-blue-400",
    accentColor: "96,165,250",
    ConfigPanel: TranslationNode,
    category: "infra",
    description:
      "Translate text between 25+ languages via OpenAI, Google or DeepL",
  },
  text_to_speech: {
    label: "Text to Speech",
    icon: Headphones,
    colorClass: "text-purple-400",
    accentColor: "167,139,250",
    ConfigPanel: TextToSpeechNode,
    category: "infra",
    description:
      "Convert text to natural-sounding audio via Whisper, ElevenLabs or Google",
  },
  speech_to_text: {
    label: "Speech to Text",
    icon: Mic2,
    colorClass: "text-rose-400",
    accentColor: "251,113,133",
    ConfigPanel: SpeechToTextNode,
    category: "infra",
    description: "Transcribe audio to text via Whisper, Google or AssemblyAI",
  },
  ocr: {
    label: "OCR",
    icon: ScanLine,
    colorClass: "text-teal-400",
    accentColor: "45,212,191",
    ConfigPanel: OcrNode,
    category: "infra",
    description: "Extract text from images and scanned documents",
  },

  // ── Flow Control Nodes ────────────────────────────────────────────────────
  condition: {
    label: "Condition",
    icon: CheckCheck,
    colorClass: "text-emerald-400",
    accentColor: "52,211,153",
    ConfigPanel: ConditionNode,
    category: "logic",
    description: "Branch into True or False path based on a condition",
  },
  wait_for_event: {
    label: "Wait for Webhook",
    icon: Webhook,
    colorClass: "text-cyan-400",
    accentColor: "34,211,238",
    ConfigPanel: WaitForEventNode,
    category: "logic",
    description: "Pause the branch until its webhook URL is called",
  },
  retry: {
    label: "Retry",
    icon: RotateCcw,
    colorClass: "text-amber-400",
    accentColor: "251,191,36",
    ConfigPanel: RetryNode,
    category: "logic",
    description: "Retry the previous node N times on failure",
  },
  rate_limiter: {
    label: "Rate Limiter",
    icon: Timer,
    colorClass: "text-orange-400",
    accentColor: "251,146,60",
    ConfigPanel: RateLimiterNode,
    category: "logic",
    description: "Throttle workflow to N executions per time window",
  },
};
