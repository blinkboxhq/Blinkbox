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
import postgres from "./integrations/postgres.node.js";

// Integrations: Google Workspace
import googleCalendar from "./integrations/googleCalendar.node.js";
import googleDrive from "./integrations/googleDrive.node.js";

// Integrations: CRM & E-commerce
import hubspot from "./integrations/hubspot.node.js";
import shopify from "./integrations/shopify.node.js";

// Integrations: Social Media
import twitter from "./integrations/twitter.node.js";

export const nodeRegistry = {
  // Triggers (genesis nodes)
  manual: { async run(config, input) { return input; } },
  webhook: { async run(config, input) { return input; } },
  error_trigger: { async run(config, input) { return input; } },
  rss_trigger: { async run(config, input) { return input; } },
  imap_trigger: { async run(config, input) { return input; } },
  db_trigger: { async run(config, input) { return input; } },
  github_trigger: { async run(config, input) { return input; } },
  stripe_trigger: { async run(config, input) { return input; } },
  cron_trigger: cronTrigger,

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

  // Backward Compatibility Aliases
  advanced_scraper: webScraper,
  informer: webScraper,
  set_fields: dataMapper,
  transform: dataMapper,
  filter: dataMapper,
  if_condition: logicRouter,
};
