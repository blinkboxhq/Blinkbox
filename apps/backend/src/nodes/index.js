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

// Triggers
import cronTrigger from "./cronTrigger.node.js";

// Core
import httpRequest from "./httpRequest.node.js";
import webScraper from "./webScraper.node.js";
import aiAgent from "./aiAgent.node.js";
import dataMapper from "./dataMapper.node.js";
import logicRouter from "./logicRouter.node.js";

// Flow Control
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

// AI Specialty Nodes
import aiClassify from "./aiClassify.node.js";
import aiExtract from "./aiExtract.node.js";
import aiTransform from "./aiTransform.node.js";

// Integrations: AI Hub
import openai from "./integrations/openai.node.js";
import anthropic from "./integrations/anthropic.node.js";
import gemini from "./integrations/gemini.node.js";
import perplexity from "./integrations/perplexity.node.js";
import xai from "./integrations/xai.node.js";
import deepseek from "./integrations/deepseek.node.js";

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

// Integrations: Social Media
import twitter from "./integrations/twitter.node.js";

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
import aiDecision from "./aiDecision.node.js";
import notificationHub from "./notificationHub.node.js";
import browserAgent from "./browserAgent.node.js";

// Virtual Computer
import virtualComputer from "./virtualComputer.node.js";

// Coding Agents
import claudeCode    from "./integrations/claudeCode.node.js";
import codex         from "./integrations/codex.node.js";
import geminiCli     from "./integrations/geminiCli.node.js";
import groq          from "./integrations/groq.node.js";
import ollama        from "./integrations/ollama.node.js";
import githubCopilot from "./integrations/githubCopilot.node.js";

// New Integrations
import elevenlabs from "./integrations/elevenlabs.node.js";
import pinecone from "./integrations/pinecone.node.js";
import zoom from "./integrations/zoom.node.js";
import resend from "./integrations/resend.node.js";
import openaiAssistant from "./integrations/openaiAssistant.node.js";

export const nodeRegistry = {
  // Triggers (genesis nodes)
  manual: {
    async run(config, input) {
      return { ...input, triggeredAt: new Date().toISOString(), triggerType: "manual" };
    },
  },
  webhook: {
    async run(config, input) {
      const body = input?.body ?? input;
      return {
        body,
        headers: input?.headers ?? {},
        method:  input?.method  ?? "POST",
        query:   input?.query   ?? {},
        triggeredAt: new Date().toISOString(),
        triggerType: "webhook",
      };
    },
  },
  chat_trigger: {
    async run(config, input) {
      const body = input?.body ?? input;
      const sidField = config.sessionIdField || "sessionId";
      return {
        message:      body.message    ?? body.text ?? "",
        sessionId:    body[sidField]  ?? body.sessionId ?? "",
        systemPrompt: config.systemPrompt ?? "",
        body,
        triggeredAt:  new Date().toISOString(),
        triggerType:  "chat",
      };
    },
  },
  form_trigger: {
    async run(config, input) {
      const body = input?.body ?? input;
      return {
        fields:      body.fields ?? body,
        submittedAt: body.submittedAt ?? new Date().toISOString(),
        body,
        triggerType: "form",
      };
    },
  },
  error_trigger: { async run(config, input) { return input; } },
  rss_trigger: { async run(config, input) { return input; } },
  imap_trigger: { async run(config, input) { return input; } },
  db_trigger: { async run(config, input) { return input; } },
  github_trigger: { async run(config, input) { return input; } },
  stripe_trigger: { async run(config, input) { return input; } },
  cron_trigger: cronTrigger,

  // Integration Triggers (webhook-push) — extract service-specific fields so
  // downstream nodes can use {{ nodeId.text }} instead of {{ nodeId.body.message.text }}
  telegram_trigger: {
    async run(config, input) {
      const body = input?.body ?? input;
      const msg  = body?.message ?? body?.edited_message ?? body?.channel_post ?? {};
      return {
        text:      msg.text      ?? "",
        from:      msg.from      ?? {},
        chat:      msg.chat      ?? {},
        date:      msg.date      ?? null,
        messageId: msg.message_id ?? null,
        updateId:  body?.update_id ?? null,
      };
    },
  },
  slack_trigger: {
    async run(config, input) {
      const body  = input?.body ?? input;
      const event = body?.event ?? body;
      return {
        text:    event.text    ?? "",
        user:    event.user    ?? "",
        channel: event.channel ?? "",
        ts:      event.ts      ?? "",
        event,
        teamId:  body?.team_id ?? "",
      };
    },
  },
  discord_trigger: {
    async run(config, input) {
      const body = input?.body ?? input;
      return {
        content:   body.content   ?? "",
        author:    body.author    ?? {},
        username:  body.author?.username ?? "",
        userId:    body.author?.id ?? "",
        channelId: body.channel_id ?? "",
        guildId:   body.guild_id   ?? "",
        messageId: body.id         ?? "",
        attachments: body.attachments ?? [],
        embeds:    body.embeds     ?? [],
        message:   body,
      };
    },
  },
  shopify_trigger:  {
    async run(config, input) {
      const body = input?.body ?? input;
      return {
        id:         body.id         ?? null,
        email:      body.email      ?? "",
        total_price: body.total_price ?? "",
        line_items: body.line_items  ?? [],
        order:      body,
        customer:   body.customer    ?? {},
      };
    },
  },
  linear_trigger:   { async run(config, input) { const b = input?.body ?? input; return { id: b?.data?.id, title: b?.data?.title, state: b?.data?.state, assignee: b?.data?.assignee, team: b?.data?.team, issue: b?.data, type: b?.type }; } },
  typeform_trigger: { async run(config, input) { const b = input?.body ?? input; const r = b?.form_response ?? b; return { form_id: b?.form_id, token: r.token, answers: r.answers ?? [], submitted_at: r.submitted_at, form_response: r }; } },
  whatsapp_trigger: {
    async run(config, input) {
      const body    = input?.body ?? input;
      const entry   = body?.entry?.[0] ?? {};
      const change  = entry?.changes?.[0]?.value ?? {};
      const msg     = change?.messages?.[0]  ?? {};
      return {
        text:          msg.text?.body ?? "",
        from:          msg.from       ?? "",
        phoneNumberId: change.metadata?.phone_number_id ?? "",
        message:       msg,
        contacts:      change.contacts ?? [],
      };
    },
  },

  // Integration Triggers (polling) — data already extracted by pollers, pass through
  gmail_trigger:    { async run(config, input) { return input?.body ?? input; } },
  airtable_trigger: { async run(config, input) { return input?.body ?? input; } },
  notion_trigger:   { async run(config, input) { return input?.body ?? input; } },
  hubspot_trigger:  { async run(config, input) { return input?.body ?? input; } },

  // Core Nodes
  http_request: httpRequest,
  web_scraper: webScraper,
  ai_agent: aiAgent,
  data_mapper: dataMapper,
  logic_router: logicRouter,

  // Flow Control
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

  // AI Specialty
  ai_classify: aiClassify,
  ai_extract: aiExtract,
  ai_transform: aiTransform,

  // AI Hub
  openai: openai,
  anthropic: anthropic,
  gemini: gemini,
  perplexity: perplexity,
  xai: xai,
  deepseek: deepseek,

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

  // Social Media
  twitter: twitter,

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
  ai_decision: aiDecision,
  notification_hub: notificationHub,
  browser_agent: browserAgent,

  // New Trigger pass-throughs (pollers fire; node just returns input)
  youtube_trigger:          { async run(config, input) { return input?.body ?? input; } },
  price_alert_trigger:      { async run(config, input) { return input?.body ?? input; } },
  reddit_trigger:           { async run(config, input) { return input?.body ?? input; } },
  google_calendar_trigger:  { async run(config, input) { return input?.body ?? input; } },
  github_issue_trigger:     { async run(config, input) { return input?.body ?? input; } },
  ssh_trigger:              { async run(config, input) { return input?.body ?? input; } },
  docker_trigger:           { async run(config, input) { return input?.body ?? input; } },
  jira_trigger:             { async run(config, input) { return input?.body ?? input; } },
  trello_trigger:           { async run(config, input) { return input?.body ?? input; } },
  google_sheets_trigger:    { async run(config, input) { return input?.body ?? input; } },
  outlook_trigger:          { async run(config, input) { return input?.body ?? input; } },
  teams_trigger:            { async run(config, input) { return input?.body ?? input; } },
  http_monitor_trigger:     { async run(config, input) { return input?.body ?? input; } },
  gitlab_trigger:           { async run(config, input) { return input?.body ?? input; } },
  ssl_trigger:              { async run(config, input) { return input?.body ?? input; } },
  dns_trigger:              { async run(config, input) { return input?.body ?? input; } },
  port_monitor_trigger:     { async run(config, input) { return input?.body ?? input; } },
  hackernews_trigger:       { async run(config, input) { return input?.body ?? input; } },
  pipedrive_trigger:        { async run(config, input) { return input?.body ?? input; } },
  asana_trigger:            { async run(config, input) { return input?.body ?? input; } },

  // Virtual Computer
  virtual_computer: virtualComputer,

  // Coding Agents
  claude_code:    claudeCode,
  codex:          codex,
  gemini_cli:     geminiCli,
  groq:           groq,
  ollama:         ollama,
  github_copilot: githubCopilot,

  // New Integrations
  elevenlabs: elevenlabs,
  pinecone: pinecone,
  zoom: zoom,
  resend: resend,
  openai_assistant: openaiAssistant,

  // Backward Compatibility Aliases
  advanced_scraper: webScraper,
  informer: webScraper,
  set_fields: dataMapper,
  transform: dataMapper,
  filter: dataMapper,
  if_condition: logicRouter,

  // Agent Tool Nodes — spread all tool_* exports
  ...Object.fromEntries(
    Object.entries(agentToolNodes).map(([key, val]) => [key, val])
  ),
};
