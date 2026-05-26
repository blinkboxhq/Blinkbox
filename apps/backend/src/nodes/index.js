/**
 * NODE REGISTRY
 *
 * + supporting nodes (loop, merge, delay, code, respond_webhook)
 *
 * KILLED:  math, json_parse, send_email (raw SMTP)
 * MERGED:  set_fields + transform + filter -> data_mapper
 * UPGRADED: if_condition -> logic_router, informer -> web_scraper
 * NEW:     cron_trigger, ai_agent, integrations hub
 * NEW v2:  utility nodes, AI specialty nodes, 10 new integrations
 */

// Agent Tool Nodes (all 98 tool_* implementations)
import * as agentToolNodes from "./agentTools.nodes.js";

// Triggers — each in its own folder: triggers/<name>/index.js
import cronTrigger        from "./cronTrigger.node.js";
import manualTrigger      from "../../../packages/triggers/manual/index.js";
import webhookTrigger     from "../../../packages/triggers/webhook/index.js";
import chatTrigger        from "../../../packages/triggers/chat/index.js";
import formTrigger        from "../../../packages/triggers/form/index.js";
import telegramTrigger    from "../../../packages/triggers/telegram/index.js";
import slackTrigger       from "../../../packages/triggers/slack/index.js";
import discordTrigger     from "../../../packages/triggers/discord/index.js";
import shopifyTrigger     from "../../../packages/triggers/shopify/index.js";
import linearTrigger      from "../../../packages/triggers/linear/index.js";
import typeformTrigger    from "../../../packages/triggers/typeform/index.js";
import whatsappTrigger    from "../../../packages/triggers/whatsapp/index.js";
import gmailTrigger       from "../../../packages/triggers/gmail/index.js";
import airtableTrigger    from "../../../packages/triggers/airtable/index.js";
import notionTrigger      from "../../../packages/triggers/notion/index.js";
import hubspotTrigger     from "../../../packages/triggers/hubspot/index.js";
import stripeTrigger      from "../../../packages/triggers/stripe/index.js";
import githubTrigger      from "../../../packages/triggers/github/index.js";
import gitlabTrigger      from "../../../packages/triggers/gitlab/index.js";
import jiraTrigger        from "../../../packages/triggers/jira/index.js";
import trelloTrigger      from "../../../packages/triggers/trello/index.js";
import asanaTrigger       from "../../../packages/triggers/asana/index.js";
import pipedriveTrigger   from "../../../packages/triggers/pipedrive/index.js";
import sentryTrigger      from "../../../packages/triggers/sentry/index.js";
import vercelTrigger      from "../../../packages/triggers/vercel/index.js";
import netlifyTrigger     from "../../../packages/triggers/netlify/index.js";
import pagerdutyTrigger   from "../../../packages/triggers/pagerduty/index.js";
import datadogTrigger     from "../../../packages/triggers/datadog/index.js";
import zendeskTrigger     from "../../../packages/triggers/zendesk/index.js";
import calendlyTrigger    from "../../../packages/triggers/calendly/index.js";
import mailchimpTrigger   from "../../../packages/triggers/mailchimp/index.js";
import clickupTrigger     from "../../../packages/triggers/clickup/index.js";
import mondayTrigger      from "../../../packages/triggers/monday/index.js";
import figmaTrigger       from "../../../packages/triggers/figma/index.js";
import intercomTrigger    from "../../../packages/triggers/intercom/index.js";
import woocommerceTrigger from "../../../packages/triggers/woocommerce/index.js";
import azureDevopsTrigger from "../../../packages/triggers/azure_devops/index.js";
import instagramTrigger   from "../../../packages/triggers/instagram/index.js";
import tiktokTrigger      from "../../../packages/triggers/tiktok/index.js";
import mastodonTrigger    from "../../../packages/triggers/mastodon/index.js";
import producthuntTrigger from "../../../packages/triggers/producthunt/index.js";
import sharepointTrigger  from "../../../packages/triggers/sharepoint/index.js";
import virustotalTrigger  from "../../../packages/triggers/virustotal/index.js";
import rssTrigger         from "../../../packages/triggers/rss/index.js";
import youtubeTrigger     from "../../../packages/triggers/youtube/index.js";
import redditTrigger      from "../../../packages/triggers/reddit/index.js";
import hackernewsTrigger  from "../../../packages/triggers/hackernews/index.js";
import googleCalendarTrigger from "../../../packages/triggers/google_calendar/index.js";
import googleSheetsTrigger   from "../../../packages/triggers/google_sheets/index.js";
import googleDriveTrigger    from "../../../packages/triggers/google_drive/index.js";
import googleDocsTrigger     from "../../../packages/triggers/google_docs/index.js";
import googleFormsTrigger    from "../../../packages/triggers/google_forms/index.js";
import onedriveTrigger    from "../../../packages/triggers/onedrive/index.js";
import outlookTrigger     from "../../../packages/triggers/outlook/index.js";
import teamsTrigger       from "../../../packages/triggers/teams/index.js";
import priceAlertTrigger  from "../../../packages/triggers/price_alert/index.js";
import httpMonitorTrigger from "../../../packages/triggers/http_monitor/index.js";
import sslTrigger         from "../../../packages/triggers/ssl/index.js";
import dnsTrigger         from "../../../packages/triggers/dns/index.js";
import portMonitorTrigger from "../../../packages/triggers/port_monitor/index.js";
import sshTrigger         from "../../../packages/triggers/ssh/index.js";
import dockerTrigger      from "../../../packages/triggers/docker/index.js";
import dbTrigger          from "../../../packages/triggers/db/index.js";
import imapTrigger        from "../../../packages/triggers/imap/index.js";
import errorTriggerNode   from "../../../packages/triggers/error_trigger/index.js";
import githubIssueTrigger from "../../../packages/triggers/github_issue/index.js";

// Core
import httpRequest from "./httpRequest.node.js";
import webScraper from "./webScraper.node.js";
import aiAgent from "./aiAgent.node.js";
import toolThink from "./toolThink.node.js";
import dataMapper from "./dataMapper.node.js";

// Flow Control
import condition from "./condition.node.js";
import successFailed from "./successFailed.node.js";
import stopError from "./stopError.node.js";
import retry from "./retry.node.js";
import rateLimiter from "./rateLimiter.node.js";
import waitForEvent from "./waitForEvent.node.js";
import approval from "./approval.node.js";
import subWorkflow from "./subWorkflow.node.js";

// Supporting Nodes
import code from "./code.node.js";
import delay from "./delay.node.js";
import loop from "./loop.node.js";
import merge from "./merge.node.js";
import respondWebhook from "./respond_webhook.node.js";

// Utility Nodes
import filterArray from "./filterArray.node.js";
import sortArray from "./sortArray.node.js";
import deduplicate from "./deduplicate.node.js";
import batchSplit from "./batchSplit.node.js";
import csvParser from "./csvParser.node.js";
import dateTime from "./dateTime.node.js";
import cryptoUtils from "./cryptoUtils.node.js";

// Integrations: AI Hub
import openai from "./integrations/openai.node.js";
import anthropic from "./integrations/anthropic.node.js";
import gemini from "./integrations/gemini.node.js";
import perplexity from "./integrations/perplexity.node.js";
import xai from "./integrations/xai.node.js";
import deepseek from "./integrations/deepseek.node.js";
import moonshot from "./integrations/moonshot.node.js";

// Integrations: Comms Hub
import telegram from "./integrations/telegram.node.js";
import whatsapp from "./integrations/whatsapp.node.js";
import slackReal from "./integrations/slack.node.js";
import discord from "./integrations/discord.node.js";

// Integrations: Data Hub
import airtable from "./integrations/airtable.node.js";
import googleSheets from "./integrations/googleSheets.node.js";
import notion from "./integrations/notion.node.js";

// Integrations: Email & Messaging
import gmail from "./integrations/gmail.node.js";
import twilio from "./integrations/twilio.node.js";
import sendgrid from "./integrations/sendgrid.node.js";

// Integrations: Web
import webSearch from "./integrations/webSearch.node.js";

// Integrations: Developer Tools
import github from "./integrations/github.node.js";
import jira from "./integrations/jira.node.js";
import linear from "./integrations/linear.node.js";

// Integrations: Payments
import stripe from "./integrations/stripe.node.js";

// Integrations: Databases
import postgres   from "./integrations/postgres.node.js";
import supabase   from "./integrations/supabase.node.js";
import mongodb    from "./integrations/mongodb.node.js";
import redisNode  from "./integrations/redis.node.js";
import firebase   from "./integrations/firebase.node.js";

// Integrations: Google Workspace
import googleCalendar from "./integrations/googleCalendar.node.js";
import googleDrive from "./integrations/googleDrive.node.js";

// Integrations: CRM & E-commerce
import hubspot from "./integrations/hubspot.node.js";
import shopify from "./integrations/shopify.node.js";

// New Utility Nodes
import qrCode from "./qrCode.node.js";
import textSplitter from "./textSplitter.node.js";
import templateRenderer from "./templateRenderer.node.js";
import jsonValidator from "./jsonValidator.node.js";
import switchNode from "./switch.node.js";
import imageResize from "./imageResize.node.js";
import aggregate from "./aggregate.node.js";
import pdfGenerator from "./pdfGenerator.node.js";
import dataDiff from "./dataDiff.node.js";

// AI Innovated Nodes
import emailParser from "./emailParser.node.js";
import vectorMemory from "./vectorMemory.node.js";
import browserAgent from "./browserAgent.node.js";

// Coding Agents
import claudeCode    from "./integrations/claudeCode.node.js";
import codex         from "./integrations/codex.node.js";
import geminiCli     from "./integrations/geminiCli.node.js";
import groq          from "./integrations/groq.node.js";
import ollama        from "./integrations/ollama.node.js";
import lmstudio      from "./integrations/lmstudio.node.js";
import githubCopilot from "./integrations/githubCopilot.node.js";

// New Integrations
import elevenlabs from "./integrations/elevenlabs.node.js";
import pinecone from "./integrations/pinecone.node.js";
import zoom from "./integrations/zoom.node.js";
import resend from "./integrations/resend.node.js";
import openaiAssistant from "./integrations/openaiAssistant.node.js";

// New Utility Nodes
import urlParser from "./urlParser.node.js";
import weather from "./weather.node.js";
import translation from "./translation.node.js";
import speechToText from "./speechToText.node.js";
import textToSpeech from "./textToSpeech.node.js";
import rss from "./rss.node.js";

// Batch 3 — utility, network, public APIs, AI content, dev tools, social
import * as utilityNodes from "./utility.nodes.js";
import * as networkNodes from "./network.nodes.js";
import * as publicApiNodes from "./publicApis.nodes.js";
import * as aiContentNodes from "./aiContent.nodes.js";
import * as devToolNodes from "./devTools.nodes.js";
import * as socialNodes from "./social.nodes.js";

// New Integrations (batch 2)
import s3 from "./integrations/s3.node.js";
import datadog from "./integrations/datadog.node.js";
import sentry from "./integrations/sentry.node.js";
import reddit from "./integrations/reddit.node.js";
import trello from "./integrations/trello.node.js";
import asana from "./integrations/asana.node.js";
import clickup from "./integrations/clickup.node.js";
import typeform from "./integrations/typeform.node.js";
import virustotal from "./integrations/virustotal.node.js";
import sharepoint from "./integrations/sharepoint.node.js";
import outlook from "./integrations/outlook.node.js";
import teams from "./integrations/teams.node.js";
import onedrive from "./integrations/onedrive.node.js";
import netlify from "./integrations/netlify.node.js";
import vercel from "./integrations/vercel.node.js";
import monday from "./integrations/monday.node.js";
import pagerduty from "./integrations/pagerduty.node.js";
import pipedrive from "./integrations/pipedrive.node.js";
import youtube from "./integrations/youtube.node.js";
import intercom from "./integrations/intercom.node.js";
import woocommerce from "./integrations/woocommerce.node.js";
import calendly from "./integrations/calendly.node.js";
import zendesk from "./integrations/zendesk.node.js";
import linkedin from "./integrations/linkedin.node.js";
import sftp from "./integrations/sftp.node.js";
import mailchimp from "./integrations/mailchimp.node.js";
import tiktok from "./integrations/tiktok.node.js";
import instagram from "./integrations/instagram.node.js";
import ocr from "./ocr.node.js";

export const nodeRegistry = {
  // Triggers (genesis nodes)
  manual:       manualTrigger,
  webhook:      webhookTrigger,
  chat_trigger: chatTrigger,
  form_trigger: formTrigger,

  error_trigger:  errorTriggerNode,
  rss_trigger:    rssTrigger,
  imap_trigger:   imapTrigger,
  db_trigger:     dbTrigger,
  github_trigger: githubTrigger,
  stripe_trigger: stripeTrigger,
  cron_trigger:   cronTrigger,

  // Integration Triggers (webhook-push)
  telegram_trigger: telegramTrigger,
  slack_trigger:    slackTrigger,
  discord_trigger:  discordTrigger,
  shopify_trigger:  shopifyTrigger,
  linear_trigger:   linearTrigger,
  typeform_trigger: typeformTrigger,
  whatsapp_trigger: whatsappTrigger,
  gmail_trigger:    gmailTrigger,
  airtable_trigger: airtableTrigger,
  notion_trigger:   notionTrigger,
  hubspot_trigger:  hubspotTrigger,

  // Core Nodes
  http_request: httpRequest,
  web_scraper: webScraper,
  ai_agent: aiAgent,
  data_mapper: dataMapper,

  // Flow Control
  condition: condition,
  success_failed: successFailed,
  stop_error: stopError,
  retry: retry,
  rate_limiter: rateLimiter,
  wait_for_event: waitForEvent,
  approval: approval,
  sub_workflow: subWorkflow,

  // Supporting Nodes
  code: code,
  delay: delay,
  loop: loop,
  merge: merge,
  respond_webhook: respondWebhook,

  // Utility Nodes
  filter_array: filterArray,
  sort_array: sortArray,
  deduplicate: deduplicate,
  batch_split: batchSplit,
  csv_parser: csvParser,
  date_time: dateTime,
  crypto_utils: cryptoUtils,

  // AI Hub
  openai: openai,
  anthropic: anthropic,
  gemini: gemini,
  perplexity: perplexity,
  xai: xai,
  deepseek: deepseek,
  moonshot: moonshot,

  // Comms Hub
  telegram: telegram,
  whatsapp: whatsapp,
  slack: slackReal,
  discord: discord,

  // Data Hub
  airtable: airtable,
  google_sheets: googleSheets,
  notion: notion,

  // Databases
  supabase: supabase,
  mongodb: mongodb,
  redis_node: redisNode,
  firebase: firebase,

  // Email & Messaging
  gmail: gmail,
  twilio: twilio,
  sendgrid: sendgrid,

  // Web
  web_search: webSearch,

  // Developer Tools
  github: github,
  jira: jira,
  linear: linear,

  // Payments
  stripe: stripe,

  // Databases
  postgres: postgres,

  // Google Workspace
  google_calendar: googleCalendar,
  google_drive: googleDrive,

  // CRM & E-commerce
  hubspot: hubspot,
  shopify: shopify,

  // New Utility Nodes
  qr_code: qrCode,
  text_splitter: textSplitter,
  template_renderer: templateRenderer,
  json_validator: jsonValidator,
  switch: switchNode,
  image_resize: imageResize,
  aggregate: aggregate,
  pdf_generator: pdfGenerator,
  data_diff: dataDiff,

  // AI Innovated Nodes
  email_parser: emailParser,
  vector_memory: vectorMemory,
  browser_agent: browserAgent,

  // Trigger implementations
  youtube_trigger:          youtubeTrigger,
  price_alert_trigger:      priceAlertTrigger,
  reddit_trigger:           redditTrigger,
  google_calendar_trigger:  googleCalendarTrigger,
  github_issue_trigger:     githubIssueTrigger,
  ssh_trigger:              sshTrigger,
  docker_trigger:           dockerTrigger,
  jira_trigger:             jiraTrigger,
  trello_trigger:           trelloTrigger,
  google_sheets_trigger:    googleSheetsTrigger,
  outlook_trigger:          outlookTrigger,
  teams_trigger:            teamsTrigger,
  http_monitor_trigger:     httpMonitorTrigger,
  gitlab_trigger:           gitlabTrigger,
  ssl_trigger:              sslTrigger,
  dns_trigger:              dnsTrigger,
  port_monitor_trigger:     portMonitorTrigger,
  hackernews_trigger:       hackernewsTrigger,
  pipedrive_trigger:        pipedriveTrigger,
  asana_trigger:            asanaTrigger,
  // Frontend-only triggers now wired to real implementations
  google_drive_trigger:     googleDriveTrigger,
  google_docs_trigger:      googleDocsTrigger,
  google_forms_trigger:     googleFormsTrigger,
  onedrive_trigger:         onedriveTrigger,
  sharepoint_trigger:       sharepointTrigger,
  azure_devops_trigger:     azureDevopsTrigger,
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
  instagram_trigger:        instagramTrigger,
  tiktok_trigger:           tiktokTrigger,
  mastodon_trigger:         mastodonTrigger,
  producthunt_trigger:      producthuntTrigger,
  intercom_trigger:         intercomTrigger,
  woocommerce_trigger:      woocommerceTrigger,
  virustotal_trigger:       virustotalTrigger,

  // Coding Agents
  claude_code:    claudeCode,
  codex:          codex,
  gemini_cli:     geminiCli,
  groq:           groq,
  ollama:         ollama,
  lm_studio:      lmstudio,
  github_copilot: githubCopilot,

  // New Integrations
  elevenlabs: elevenlabs,
  pinecone: pinecone,
  zoom: zoom,
  resend: resend,
  openai_assistant: openaiAssistant,

  // Utility nodes
  url_parser: urlParser,
  weather: weather,
  translation: translation,
  speech_to_text: speechToText,
  text_to_speech: textToSpeech,
  rss: rss,
  rss_feed_generator: rss,

  // New integrations
  s3: s3,
  datadog: datadog,
  sentry: sentry,
  reddit: reddit,
  trello: trello,
  asana: asana,
  clickup: clickup,
  typeform: typeform,
  virustotal: virustotal,
  sharepoint: sharepoint,
  outlook: outlook,
  teams: teams,
  onedrive: onedrive,
  netlify: netlify,
  vercel: vercel,
  monday: monday,
  pagerduty: pagerduty,
  pipedrive: pipedrive,
  youtube: youtube,
  intercom: intercom,
  woocommerce: woocommerce,
  calendly: calendly,
  zendesk: zendesk,
  linkedin: linkedin,
  sftp: sftp,
  mailchimp: mailchimp,
  tiktok: tiktok,
  instagram: instagram,
  ocr: ocr,

  // ── Utility nodes ──────────────────────────────────────────────────────────
  base64:              utilityNodes.base64,
  color_converter:     utilityNodes.color_converter,
  unit_converter:      utilityNodes.unit_converter,
  number_format:       utilityNodes.number_format,
  find_replace:        utilityNodes.find_replace,
  regex_match:         utilityNodes.regex_match,
  math_expression:     utilityNodes.math_expression,
  markdown_renderer:   utilityNodes.markdown_renderer,
  text_format:         utilityNodes.text_format,
  random_pick:         utilityNodes.random_pick,
  counter:             utilityNodes.counter,
  variable_set_get:    utilityNodes.variable_set_get,
  schedule_check:      utilityNodes.schedule_check,
  env_variable:        utilityNodes.env_variable,
  error:               utilityNodes.error,
  zip_files:           utilityNodes.zip_files,
  price_alert:         utilityNodes.price_alert,

  // ── Network / infra nodes ──────────────────────────────────────────────────
  ip_lookup:           networkNodes.ip_lookup,
  ip_whitelist:        networkNodes.ip_whitelist,

  // ── Public API nodes ───────────────────────────────────────────────────────
  clinical_trials:     publicApiNodes.clinical_trials,
  drug_lookup:         publicApiNodes.drug_lookup,
  hackernews:          publicApiNodes.hackernews,
  producthunt:         publicApiNodes.producthunt,
  stock_price:         publicApiNodes.stock_price,
  currency_exchange:   publicApiNodes.currency_exchange,
  twitch_stream_status: publicApiNodes.twitch_stream_status,

  // ── AI content nodes ───────────────────────────────────────────────────────
  chat:                aiContentNodes.chat,

  // ── Dev tools nodes ────────────────────────────────────────────────────────
  graphql_request:     devToolNodes.graphql_request,
  gitlab:              devToolNodes.gitlab,
  azure_devops:        devToolNodes.azure_devops,
  github_issue:        devToolNodes.github_issue,
  docker:              devToolNodes.docker,
  ssh:                 devToolNodes.ssh,
  google_docs:         devToolNodes.google_docs,
  google_forms:        devToolNodes.google_forms,
  figma:               devToolNodes.figma,
  figma_comment:       devToolNodes.figma_comment,

  // ── Social / publishing nodes ──────────────────────────────────────────────
  discord_role_assign: socialNodes.discord_role_assign,
  mastodon:            socialNodes.mastodon,
  imap:                socialNodes.imap,
  email:               socialNodes.email,
  file_upload:         socialNodes.file_upload,
  file_download:       socialNodes.file_download,
  webhook_response:    socialNodes.webhook_response,
  game_event_webhook:  socialNodes.game_event_webhook,

  // ── Agent sub-node aliases (handled by ai_agent core or dedicated nodes) ──
  agent_openai:        openai,
  agent_anthropic:     anthropic,
  agent_gemini:        gemini,
  agent_deepseek:      deepseek,
  agent_moonshot:      moonshot,
  agent_perplexity:    perplexity,
  agent_xai:           xai,
  agent_groq:          groq,
  agent_ollama:        ollama,
  agent_lmstudio:      lmstudio,
  agent_llm:           openai,
  agent_memory:        vectorMemory,
  agent_memory_mongodb:   mongodb,
  agent_memory_pinecone:  pinecone,
  agent_memory_postgres:  postgres,
  agent_memory_redis:     redisNode,
  agent_memory_supabase:  supabase,
  agent_memory_window:    vectorMemory,
  agent_memory_zep:       vectorMemory,
  agent_tool:          aiAgent,
  tool_think:          toolThink,

  // ── Misc aliases ───────────────────────────────────────────────────────────
  cron:                cronTrigger,
  database:            postgres,

  // Backward Compatibility Aliases
  advanced_scraper: webScraper,
  informer: webScraper,
  set_fields: dataMapper,
  transform: dataMapper,
  filter: dataMapper,

  // Agent Tool Nodes — spread all tool_* exports
  ...Object.fromEntries(
    Object.entries(agentToolNodes).map(([key, val]) => [key, val])
  ),
};
