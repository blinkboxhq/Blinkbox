import { installHttpHardening } from "../utils/httpHardening.js";
import * as agentToolNodes from "./agentTools.nodes.js";

installHttpHardening();

// Triggers
import cronTrigger            from "./cronTrigger.node.js";
import manualTrigger          from "../triggers/manual.js";
import webhookTrigger         from "../triggers/webhook.js";
import chatTrigger            from "../triggers/chat.js";
import formTrigger            from "../triggers/form.js";
import telegramTrigger        from "../triggers/telegram.js";
import slackTrigger           from "../triggers/slack.js";
import discordTrigger         from "../triggers/discord.js";
import shopifyTrigger         from "../triggers/shopify.js";
import linearTrigger          from "../triggers/linear.js";
import typeformTrigger        from "../triggers/typeform.js";
import whatsappTrigger        from "../triggers/whatsapp.js";
import gmailTrigger           from "../triggers/gmail.js";
import airtableTrigger        from "../triggers/airtable.js";
import notionTrigger          from "../triggers/notion.js";
import hubspotTrigger         from "../triggers/hubspot.js";
import stripeTrigger          from "../triggers/stripe.js";
import githubTrigger          from "../triggers/github.js";
import gitlabTrigger          from "../triggers/gitlab.js";
import jiraTrigger            from "../triggers/jira.js";
import trelloTrigger          from "../triggers/trello.js";
import asanaTrigger           from "../triggers/asana.js";
import pipedriveTrigger       from "../triggers/pipedrive.js";
import sentryTrigger          from "../triggers/sentry.js";
import vercelTrigger          from "../triggers/vercel.js";
import netlifyTrigger         from "../triggers/netlify.js";
import pagerdutyTrigger       from "../triggers/pagerduty.js";
import datadogTrigger         from "../triggers/datadog.js";
import zendeskTrigger         from "../triggers/zendesk.js";
import calendlyTrigger        from "../triggers/calendly.js";
import mailchimpTrigger       from "../triggers/mailchimp.js";
import clickupTrigger         from "../triggers/clickup.js";
import mondayTrigger          from "../triggers/monday.js";
import figmaTrigger           from "../triggers/figma.js";
import intercomTrigger        from "../triggers/intercom.js";
import woocommerceTrigger     from "../triggers/woocommerce.js";
import azureDevopsTrigger     from "../triggers/azure_devops.js";
import instagramTrigger       from "../triggers/instagram.js";
import tiktokTrigger          from "../triggers/tiktok.js";
import mastodonTrigger        from "../triggers/mastodon.js";
import producthuntTrigger     from "../triggers/producthunt.js";
import sharepointTrigger      from "../triggers/sharepoint.js";
import virustotalTrigger      from "../triggers/virustotal.js";
import rssTrigger             from "../triggers/rss.js";
import youtubeTrigger         from "../triggers/youtube.js";
import redditTrigger          from "../triggers/reddit.js";
import hackernewsTrigger      from "../triggers/hackernews.js";
import googleCalendarTrigger  from "../triggers/google_calendar.js";
import googleSheetsTrigger    from "../triggers/google_sheets.js";
import googleDriveTrigger     from "../triggers/google_drive.js";
import googleDocsTrigger      from "../triggers/google_docs.js";
import googleFormsTrigger     from "../triggers/google_forms.js";
import onedriveTrigger        from "../triggers/onedrive.js";
import outlookTrigger         from "../triggers/outlook.js";
import teamsTrigger           from "../triggers/teams.js";
import priceAlertTrigger      from "../triggers/price_alert.js";
import httpMonitorTrigger     from "../triggers/http_monitor.js";
import sslTrigger             from "../triggers/ssl.js";
import dnsTrigger             from "../triggers/dns.js";
import portMonitorTrigger     from "../triggers/port_monitor.js";
import sshTrigger             from "../triggers/ssh.js";
import dockerTrigger          from "../triggers/docker.js";
import dbTrigger              from "../triggers/db.js";
import imapTrigger            from "../triggers/imap.js";
import errorTriggerNode       from "../triggers/error_trigger.js";
import githubIssueTrigger     from "../triggers/github_issue.js";

// Core nodes
import httpRequest     from "./httpRequest.node.js";
import webScraper      from "./webScraper.node.js";
import aiAgent         from "./aiAgent.node.js";
import toolThink       from "./toolThink.node.js";
import dataMapper      from "./dataMapper.node.js";
import code            from "./code.node.js";
import delay           from "./delay.node.js";
import loop            from "./loop.node.js";
import merge           from "./merge.node.js";
import respondWebhook  from "./respond_webhook.node.js";

// Flow control
import condition       from "./condition.node.js";
import successFailed   from "./successFailed.node.js";
import stopError       from "./stopError.node.js";
import retry           from "./retry.node.js";
import rateLimiter     from "./rateLimiter.node.js";
import waitForEvent    from "./waitForEvent.node.js";
import approval        from "./approval.node.js";
import subWorkflow     from "./subWorkflow.node.js";
import switchNode      from "./switch.node.js";

// Data processing
import filterArray     from "./filterArray.node.js";
import sortArray       from "./sortArray.node.js";
import deduplicate     from "./deduplicate.node.js";
import batchSplit      from "./batchSplit.node.js";
import csvParser       from "./csvParser.node.js";
import dateTime        from "./dateTime.node.js";
import cryptoUtils     from "./cryptoUtils.node.js";
import textSplitter    from "./textSplitter.node.js";
import templateRenderer from "./templateRenderer.node.js";
import imageResize     from "./imageResize.node.js";
import aggregate       from "./aggregate.node.js";
import pdfGenerator    from "./pdfGenerator.node.js";
import emailParser     from "./emailParser.node.js";
import vectorMemory    from "./vectorMemory.node.js";
import browserAgent    from "./browserAgent.node.js";
import ocr             from "./ocr.node.js";
import urlParser       from "./urlParser.node.js";
import translation     from "./translation.node.js";
import speechToText    from "./speechToText.node.js";
import textToSpeech    from "./textToSpeech.node.js";
import rss             from "./rss.node.js";
import distributor     from "./distributor.node.js";

// AI models
import openai              from "./integrations/openai.node.js";
import anthropic           from "./integrations/anthropic.node.js";
import gemini              from "./integrations/gemini.node.js";
import perplexity          from "./integrations/perplexity.node.js";
import xai                 from "./integrations/xai.node.js";
import deepseek            from "./integrations/deepseek.node.js";
import moonshot            from "./integrations/moonshot.node.js";
import groq               from "./integrations/groq.node.js";
import openrouter         from "./integrations/openrouter.node.js";
import nvidiaNim          from "./integrations/nvidiaNim.node.js";
import gemma              from "./integrations/gemma.node.js";
import ollama             from "./integrations/ollama.node.js";
import lmstudio           from "./integrations/lmstudio.node.js";
import claudeCode         from "./integrations/claudeCode.node.js";
import geminiCli          from "./integrations/geminiCli.node.js";
import githubCopilot      from "./integrations/githubCopilot.node.js";
import { agentOllamaNode, agentLmStudioNode } from "./integrations/agentLocalModel.node.js";
import openaiAssistant    from "./integrations/openaiAssistant.node.js";
import elevenlabs         from "./integrations/elevenlabs.node.js";
import pinecone           from "./integrations/pinecone.node.js";

// Communications
import telegram       from "./integrations/telegram.node.js";
import whatsapp       from "./integrations/whatsapp.node.js";
import slack          from "./integrations/slack.node.js";
import discord        from "./integrations/discord.node.js";
import twilio         from "./integrations/twilio.node.js";
import sendgrid       from "./integrations/sendgrid.node.js";
import gmail          from "./integrations/gmail.node.js";
import resend         from "./integrations/resend.node.js";
import mailchimp      from "./integrations/mailchimp.node.js";
import zoom           from "./integrations/zoom.node.js";
import outlook        from "./integrations/outlook.node.js";
import teams          from "./integrations/teams.node.js";

// Data & databases
import airtable       from "./integrations/airtable.node.js";
import googleSheets   from "./integrations/googleSheets.node.js";
import notion         from "./integrations/notion.node.js";
import postgres       from "./integrations/postgres.node.js";
import supabase       from "./integrations/supabase.node.js";
import mongodb        from "./integrations/mongodb.node.js";
import redisNode      from "./integrations/redis.node.js";
import firebase       from "./integrations/firebase.node.js";

// Google Workspace
import googleCalendar from "./integrations/googleCalendar.node.js";
import googleDrive    from "./integrations/googleDrive.node.js";
import webSearch      from "./integrations/webSearch.node.js";

// Project management & CRM
import github         from "./integrations/github.node.js";
import jira           from "./integrations/jira.node.js";
import linear         from "./integrations/linear.node.js";
import hubspot        from "./integrations/hubspot.node.js";
import asana          from "./integrations/asana.node.js";
import trello         from "./integrations/trello.node.js";
import clickup        from "./integrations/clickup.node.js";
import monday         from "./integrations/monday.node.js";
import pipedrive      from "./integrations/pipedrive.node.js";
import zendesk        from "./integrations/zendesk.node.js";
import intercom       from "./integrations/intercom.node.js";
import salesforce     from "./integrations/salesforce.node.js";

// E-commerce & payments
import stripe         from "./integrations/stripe.node.js";
import shopify        from "./integrations/shopify.node.js";
import paypal         from "./integrations/paypal.node.js";
import woocommerce    from "./integrations/woocommerce.node.js";

// Storage & files
import s3             from "./integrations/s3.node.js";
import dropbox        from "./integrations/dropbox.node.js";
import onedrive       from "./integrations/onedrive.node.js";
import sharepoint     from "./integrations/sharepoint.node.js";
import box            from "./integrations/box.node.js";
import sftp           from "./integrations/sftp.node.js";

// Social & publishing
import twitter        from "./integrations/twitter.node.js";
import linkedin       from "./integrations/linkedin.node.js";
import instagram      from "./integrations/instagram.node.js";
import tiktok         from "./integrations/tiktok.node.js";
import youtube        from "./integrations/youtube.node.js";
import reddit         from "./integrations/reddit.node.js";

// DevOps & monitoring
import datadog        from "./integrations/datadog.node.js";
import sentry         from "./integrations/sentry.node.js";
import pagerduty      from "./integrations/pagerduty.node.js";
import vercel         from "./integrations/vercel.node.js";
import netlify        from "./integrations/netlify.node.js";

// Productivity
import typeform       from "./integrations/typeform.node.js";
import calendly       from "./integrations/calendly.node.js";

// Newly split node groups
import * as coreNodes     from "./core/index.js";
import * as networkNodes  from "./network/index.js";
import * as researchNodes from "./research/index.js";
import * as devtoolNodes  from "./devtools/index.js";
import * as socialNodes   from "./social/index.js";
import * as aiNodes       from "./ai/index.js";

const rawNodeRegistry = {
  // ── Triggers ──────────────────────────────────────────────────────────────
  manual:                   manualTrigger,
  webhook:                  webhookTrigger,
  chat_trigger:             chatTrigger,
  form_trigger:             formTrigger,
  cron_trigger:             cronTrigger,
  cron:                     cronTrigger,
  error_trigger:            errorTriggerNode,
  rss_trigger:              rssTrigger,
  imap_trigger:             imapTrigger,
  db_trigger:               dbTrigger,
  github_trigger:           githubTrigger,
  github_issue_trigger:     githubIssueTrigger,
  stripe_trigger:           stripeTrigger,
  telegram_trigger:         telegramTrigger,
  slack_trigger:            slackTrigger,
  discord_trigger:          discordTrigger,
  shopify_trigger:          shopifyTrigger,
  linear_trigger:           linearTrigger,
  typeform_trigger:         typeformTrigger,
  whatsapp_trigger:         whatsappTrigger,
  gmail_trigger:            gmailTrigger,
  airtable_trigger:         airtableTrigger,
  notion_trigger:           notionTrigger,
  hubspot_trigger:          hubspotTrigger,
  gitlab_trigger:           gitlabTrigger,
  jira_trigger:             jiraTrigger,
  trello_trigger:           trelloTrigger,
  asana_trigger:            asanaTrigger,
  pipedrive_trigger:        pipedriveTrigger,
  sentry_trigger:           sentryTrigger,
  vercel_trigger:           vercelTrigger,
  netlify_trigger:          netlifyTrigger,
  pagerduty_trigger:        pagerdutyTrigger,
  datadog_trigger:          datadogTrigger,
  zendesk_trigger:          zendeskTrigger,
  calendly_trigger:         calendlyTrigger,
  mailchimp_trigger:        mailchimpTrigger,
  clickup_trigger:          clickupTrigger,
  monday_trigger:           mondayTrigger,
  figma_trigger:            figmaTrigger,
  intercom_trigger:         intercomTrigger,
  woocommerce_trigger:      woocommerceTrigger,
  azure_devops_trigger:     azureDevopsTrigger,
  instagram_trigger:        instagramTrigger,
  tiktok_trigger:           tiktokTrigger,
  mastodon_trigger:         mastodonTrigger,
  producthunt_trigger:      producthuntTrigger,
  sharepoint_trigger:       sharepointTrigger,
  virustotal_trigger:       virustotalTrigger,
  youtube_trigger:          youtubeTrigger,
  reddit_trigger:           redditTrigger,
  hackernews_trigger:       hackernewsTrigger,
  google_calendar_trigger:  googleCalendarTrigger,
  google_sheets_trigger:    googleSheetsTrigger,
  google_drive_trigger:     googleDriveTrigger,
  google_docs_trigger:      googleDocsTrigger,
  google_forms_trigger:     googleFormsTrigger,
  onedrive_trigger:         onedriveTrigger,
  outlook_trigger:          outlookTrigger,
  teams_trigger:            teamsTrigger,
  price_alert_trigger:      priceAlertTrigger,
  http_monitor_trigger:     httpMonitorTrigger,
  ssl_trigger:              sslTrigger,
  dns_trigger:              dnsTrigger,
  port_monitor_trigger:     portMonitorTrigger,
  ssh_trigger:              sshTrigger,
  docker_trigger:           dockerTrigger,

  // ── Core execution nodes ──────────────────────────────────────────────────
  http_request:    httpRequest,
  web_scraper:     webScraper,
  ai_agent:        aiAgent,
  data_mapper:     dataMapper,
  code:            code,
  delay:           delay,
  loop:            loop,
  merge:           merge,
  respond_webhook: respondWebhook,
  distributor:     distributor,

  // ── Flow control ──────────────────────────────────────────────────────────
  condition:      condition,
  success_failed: successFailed,
  stop_error:     stopError,
  retry:          retry,
  rate_limiter:   rateLimiter,
  wait_for_event: waitForEvent,
  approval:       approval,
  sub_workflow:   subWorkflow,
  switch:         switchNode,

  // ── Data processing ───────────────────────────────────────────────────────
  filter_array:      filterArray,
  sort_array:        sortArray,
  deduplicate:       deduplicate,
  batch_split:       batchSplit,
  csv_parser:        csvParser,
  date_time:         dateTime,
  crypto_utils:      cryptoUtils,
  text_splitter:     textSplitter,
  template_renderer: templateRenderer,
  image_resize:      imageResize,
  aggregate:         aggregate,
  pdf_generator:     pdfGenerator,
  email_parser:      emailParser,
  vector_memory:     vectorMemory,
  browser_agent:     browserAgent,
  ocr:               ocr,
  url_parser:        urlParser,
  translation:       translation,
  speech_to_text:    speechToText,
  text_to_speech:    textToSpeech,
  rss:               rss,
  rss_feed_generator: rss,
  rss_feed:           rss,

  // ── AI models ─────────────────────────────────────────────────────────────
  openai:           openai,
  anthropic:        anthropic,
  gemini:           gemini,
  perplexity:       perplexity,
  xai:              xai,
  deepseek:         deepseek,
  moonshot:         moonshot,
  groq:             groq,
  openrouter:       openrouter,
  nvidia_nim:       nvidiaNim,
  gemma:            gemma,
  ollama:           ollama,
  lm_studio:        lmstudio,
  claude_code:      claudeCode,
  gemini_cli:       geminiCli,
  github_copilot:   githubCopilot,
  openai_assistant: openaiAssistant,
  elevenlabs:       elevenlabs,
  pinecone:         pinecone,

  // ── Communications ────────────────────────────────────────────────────────
  telegram:  telegram,
  whatsapp:  whatsapp,
  slack:     slack,
  discord:   discord,
  twilio:    twilio,
  sendgrid:  sendgrid,
  gmail:     gmail,
  resend:    resend,
  mailchimp: mailchimp,
  zoom:      zoom,
  outlook:   outlook,
  teams:     teams,

  // ── Data & databases ──────────────────────────────────────────────────────
  airtable:      airtable,
  google_sheets: googleSheets,
  notion:        notion,
  postgres:      postgres,
  supabase:      supabase,
  mongodb:       mongodb,
  redis_node:    redisNode,
  firebase:      firebase,
  database:      postgres,

  // ── Google Workspace ──────────────────────────────────────────────────────
  google_calendar: googleCalendar,
  google_drive:    googleDrive,
  web_search:      webSearch,

  // ── Project management & CRM ──────────────────────────────────────────────
  github:    github,
  jira:      jira,
  linear:    linear,
  hubspot:   hubspot,
  asana:     asana,
  trello:    trello,
  clickup:   clickup,
  monday:    monday,
  pipedrive: pipedrive,
  zendesk:   zendesk,
  intercom:  intercom,
  salesforce: salesforce,

  // ── E-commerce & payments ─────────────────────────────────────────────────
  stripe:     stripe,
  shopify:    shopify,
  paypal:     paypal,
  woocommerce: woocommerce,

  // ── Storage & files ───────────────────────────────────────────────────────
  s3:         s3,
  dropbox:    dropbox,
  onedrive:   onedrive,
  sharepoint: sharepoint,
  box:        box,
  sftp:       sftp,

  // ── Social & publishing ───────────────────────────────────────────────────
  twitter:   twitter,
  linkedin:  linkedin,
  instagram: instagram,
  tiktok:    tiktok,
  youtube:   youtube,
  reddit:    reddit,

  // ── DevOps & monitoring ───────────────────────────────────────────────────
  datadog:   datadog,
  sentry:    sentry,
  pagerduty: pagerduty,
  vercel:    vercel,
  netlify:   netlify,

  // ── Productivity ──────────────────────────────────────────────────────────
  typeform:  typeform,
  calendly:  calendly,

  // ── Core utility nodes (from core/) ───────────────────────────────────────
  ...coreNodes,

  // ── Network / infra nodes (from network/) ────────────────────────────────
  ...networkNodes,
  port_monitor: networkNodes.port_monitor,

  // ── Research / public API nodes (from research/) ─────────────────────────
  ...researchNodes,

  // ── Dev tools nodes (from devtools/) ─────────────────────────────────────
  ...devtoolNodes,
  graphql: devtoolNodes.graphql_request,

  // ── Social / media nodes (from social/) ──────────────────────────────────
  ...socialNodes,

  // ── AI content nodes (from ai/) ──────────────────────────────────────────
  ...aiNodes,

  // ── Agent sub-nodes ───────────────────────────────────────────────────────
  tool_think:             toolThink,
  agent_openai:           openai,
  agent_anthropic:        anthropic,
  agent_gemini:           gemini,
  agent_deepseek:         deepseek,
  agent_moonshot:         moonshot,
  agent_perplexity:       perplexity,
  agent_xai:              xai,
  agent_groq:             groq,
  agent_nvidia_nim:       nvidiaNim,
  agent_gemma:            gemma,
  agent_ollama:           agentOllamaNode,
  agent_lmstudio:         agentLmStudioNode,
  agent_llm:              openai,
  agent_memory:           vectorMemory,
  agent_memory_mongodb:   mongodb,
  agent_memory_pinecone:  pinecone,
  agent_memory_postgres:  postgres,
  agent_memory_redis:     redisNode,
  agent_memory_supabase:  supabase,
  agent_memory_window:    vectorMemory,
  agent_memory_zep:       vectorMemory,
  agent_tool:             aiAgent,

  // ── Backward compatibility aliases ───────────────────────────────────────
  advanced_scraper: webScraper,
  informer:         webScraper,
  set_fields:       dataMapper,
  transform:        dataMapper,
  filter:           dataMapper,
  twitter_post:     twitter,
  linkedin_post:    linkedin,

  // ── Agent tool nodes (tool_*) ─────────────────────────────────────────────
  ...Object.fromEntries(Object.entries(agentToolNodes).map(([k, v]) => [k, v])),
};

// ── Registry hardening layer ──────────────────────────────────────────────────
// Every handler is wrapped once at load: config is stripped of prototype-
// pollution keys, and thrown errors are re-issued as clean Errors (node-name
// prefixed, no axios internals / auth headers leaking into execution logs).
// Results pass through untouched — null (trigger-filter skip) and sentinel
// keys (__delay, __loopFanOut, __conditionResult) are engine signals.

const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeConfig(value, depth = 0) {
  if (depth > 20 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeConfig(v, depth + 1));
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const clean = {};
  for (const key of Object.keys(value)) {
    if (POLLUTION_KEYS.has(key)) continue;
    clean[key] = sanitizeConfig(value[key], depth + 1);
  }
  return clean;
}

function hardenNode(name, node) {
  if (!node || typeof node.run !== "function") return node;
  const originalRun = node.run;
  return {
    ...node,
    async run(config, input, context) {
      const safeConfig = sanitizeConfig(config && typeof config === "object" ? config : {});
      try {
        return await originalRun.call(node, safeConfig, input, context);
      } catch (err) {
        const msg = err?.message || String(err);
        const prefixed = msg.toLowerCase().includes(name.toLowerCase()) ? msg : `[${name}] ${msg}`;
        throw new Error(prefixed, { cause: err });
      }
    },
  };
}

export const nodeRegistry = Object.fromEntries(
  Object.entries(rawNodeRegistry).map(([name, node]) => [name, hardenNode(name, node)]),
);
