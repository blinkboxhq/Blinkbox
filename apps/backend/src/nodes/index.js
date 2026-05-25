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
import stripeTrigger from "./triggers/stripe.trigger.js";
import githubTrigger from "./triggers/github.trigger.js";
import gitlabTrigger from "./triggers/gitlab.trigger.js";
import jiraTrigger from "./triggers/jira.trigger.js";
import trelloTrigger from "./triggers/trello.trigger.js";
import asanaTrigger from "./triggers/asana.trigger.js";
import pipedriveTrigger from "./triggers/pipedrive.trigger.js";
import sentryTrigger from "./triggers/sentry.trigger.js";
import vercelTrigger from "./triggers/vercel.trigger.js";
import netlifyTrigger from "./triggers/netlify.trigger.js";
import pagerdutyTrigger from "./triggers/pagerduty.trigger.js";
import datadogTrigger from "./triggers/datadog.trigger.js";
import zendeskTrigger from "./triggers/zendesk.trigger.js";
import calendlyTrigger from "./triggers/calendly.trigger.js";
import mailchimpTrigger from "./triggers/mailchimp.trigger.js";
import clickupTrigger from "./triggers/clickup.trigger.js";
import mondayTrigger from "./triggers/monday.trigger.js";
import figmaTrigger from "./triggers/figma.trigger.js";
import intercomTrigger from "./triggers/intercom.trigger.js";
import woocommerceTrigger from "./triggers/woocommerce.trigger.js";
import azureDevopsTrigger from "./triggers/azure_devops.trigger.js";
import instagramTrigger from "./triggers/instagram.trigger.js";
import tiktokTrigger from "./triggers/tiktok.trigger.js";
import mastodonTrigger from "./triggers/mastodon.trigger.js";
import producthuntTrigger from "./triggers/producthunt.trigger.js";
import sharepointTrigger from "./triggers/sharepoint.trigger.js";
import virustotalTrigger from "./triggers/virustotal.trigger.js";
import rssTrigger from "./triggers/rss.trigger.js";
import youtubeTrigger from "./triggers/youtube.trigger.js";
import redditTrigger from "./triggers/reddit.trigger.js";
import hackernewsTrigger from "./triggers/hackernews.trigger.js";
import googleCalendarTrigger from "./triggers/google_calendar.trigger.js";
import googleSheetsTrigger from "./triggers/google_sheets.trigger.js";
import googleDriveTrigger from "./triggers/google_drive.trigger.js";
import googleDocsTrigger from "./triggers/google_docs.trigger.js";
import googleFormsTrigger from "./triggers/google_forms.trigger.js";
import onedriveTrigger from "./triggers/onedrive.trigger.js";
import outlookTrigger from "./triggers/outlook.trigger.js";
import teamsTrigger from "./triggers/teams.trigger.js";
import priceAlertTrigger from "./triggers/price_alert.trigger.js";
import httpMonitorTrigger from "./triggers/http_monitor.trigger.js";
import sslTrigger from "./triggers/ssl.trigger.js";
import dnsTrigger from "./triggers/dns.trigger.js";
import portMonitorTrigger from "./triggers/port_monitor.trigger.js";
import sshTrigger from "./triggers/ssh.trigger.js";
import dockerTrigger from "./triggers/docker.trigger.js";
import dbTrigger from "./triggers/db.trigger.js";
import imapTrigger from "./triggers/imap.trigger.js";
import errorTriggerTrigger from "./triggers/error_trigger.trigger.js";
import githubIssueTrigger from "./triggers/github_issue.trigger.js";

// Core
import httpRequest from "./httpRequest.node.js";
import webScraper from "./webScraper.node.js";
import aiAgent from "./aiAgent.node.js";
import toolThink from "./toolThink.node.js";
import dataMapper from "./dataMapper.node.js";
import logicRouter from "./logicRouter.node.js";

// Flow Control
import condition from "./condition.node.js";
import successFailed from "./successFailed.node.js";
import stopError from "./stopError.node.js";
import retry from "./retry.node.js";
import rateLimiter from "./rateLimiter.node.js";
import distributor from "./distributor.node.js";
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
import xmlParser from "./xmlParser.node.js";
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
import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

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
  error_trigger:  errorTriggerTrigger,
  rss_trigger:    rssTrigger,
  imap_trigger:   imapTrigger,
  db_trigger:     dbTrigger,
  github_trigger: githubTrigger,
  stripe_trigger: stripeTrigger,
  cron_trigger:   cronTrigger,

  // Integration Triggers (webhook-push) — extract service-specific fields so
  // downstream nodes can use {{ nodeId.text }} instead of {{ nodeId.body.message.text }}
  telegram_trigger: {
    async run(config, input, context = {}) {
      const body = input?.body ?? input;
      const msg  = body?.message ?? body?.edited_message ?? body?.channel_post ?? {};

      let mediaFileId   = null;
      let mediaMimeType = "application/octet-stream";
      let mediaName     = "file";
      let mediaType     = null;

      if (Array.isArray(msg.photo) && msg.photo.length > 0) {
        // Pick second-to-last (medium quality) to avoid huge images exceeding LLM vision limits
        const photoIndex = msg.photo.length >= 3 ? msg.photo.length - 2 : msg.photo.length >= 2 ? 1 : 0;
        const best = msg.photo[photoIndex];
        mediaFileId = best.file_id; mediaMimeType = "image/jpeg"; mediaName = "photo.jpg"; mediaType = "photo";
      } else if (msg.document) {
        mediaFileId = msg.document.file_id; mediaMimeType = msg.document.mime_type || "application/octet-stream"; mediaName = msg.document.file_name || "document"; mediaType = "document";
      } else if (msg.video) {
        mediaFileId = msg.video.file_id; mediaMimeType = msg.video.mime_type || "video/mp4"; mediaName = msg.video.file_name || "video.mp4"; mediaType = "video";
      } else if (msg.audio) {
        mediaFileId = msg.audio.file_id; mediaMimeType = msg.audio.mime_type || "audio/mpeg"; mediaName = msg.audio.file_name || "audio.mp3"; mediaType = "audio";
      } else if (msg.voice) {
        mediaFileId = msg.voice.file_id; mediaMimeType = "audio/ogg"; mediaName = "voice.ogg"; mediaType = "voice";
      } else if (msg.sticker) {
        mediaFileId = msg.sticker.file_id; mediaMimeType = msg.sticker.is_animated ? "application/x-tgsticker" : "image/webp"; mediaName = "sticker.webp"; mediaType = "sticker";
      }

      let attachments = [];
      if (mediaFileId && config?.botToken) {
        try {
          const token = await getOAuthToken(config.botToken, context.workspaceId, "Telegram").catch(() => config.botToken);
          const { data: fileInfo } = await axios.get(`https://api.telegram.org/bot${token}/getFile`, { params: { file_id: mediaFileId }, timeout: 10000 });
          const filePath = fileInfo?.result?.file_path;
          if (filePath) {
            const { data: buf } = await axios.get(`https://api.telegram.org/file/bot${token}/${filePath}`, { responseType: "arraybuffer", timeout: 30000 });
            attachments = [{ dataUrl: `data:${mediaMimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType: mediaMimeType, name: mediaName }];
          }
        } catch (err) {
          console.warn("[telegram_trigger] Failed to download media:", err.message);
        }
      }

      return {
        text: msg.text ?? msg.caption ?? "",
        from: msg.from ?? {}, chat: msg.chat ?? {}, date: msg.date ?? null,
        messageId: msg.message_id ?? null, updateId: body?.update_id ?? null,
        hasMedia: attachments.length > 0, mediaType, attachments,
      };
    },
  },
  slack_trigger: {
    async run(config, input, context = {}) {
      const body  = input?.body ?? input;
      const event = body?.event ?? body;

      let attachments = [];
      const files = Array.isArray(event?.files) ? event.files : [];
      if (files.length > 0 && config?.botToken) {
        try {
          const token = await getOAuthToken(config.botToken, context.workspaceId, "Slack").catch(() => config.botToken);
          const file = files[0];
          const { data: buf } = await axios.get(file.url_private, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "arraybuffer", timeout: 30000,
          });
          const mimeType = file.mimetype || "application/octet-stream";
          attachments = [{ dataUrl: `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType, name: file.name || "file" }];
        } catch (err) {
          console.warn("[slack_trigger] Failed to download file:", err.message);
        }
      }

      return {
        text: event.text ?? "", user: event.user ?? "", channel: event.channel ?? "",
        ts: event.ts ?? "", event, teamId: body?.team_id ?? "",
        hasMedia: attachments.length > 0, attachments,
      };
    },
  },
  discord_trigger: {
    async run(config, input, context = {}) {
      const body = input?.body ?? input;

      let attachments = [];
      const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
      if (rawAttachments.length > 0) {
        const results = await Promise.allSettled(
          rawAttachments.slice(0, 5).map(async (a) => {
            const { data: buf } = await axios.get(a.url, { responseType: "arraybuffer", timeout: 20000 });
            const mimeType = a.content_type || "application/octet-stream";
            return { dataUrl: `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType, name: a.filename || "file" };
          })
        );
        attachments = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      }

      return {
        content: body.content ?? "", author: body.author ?? {}, username: body.author?.username ?? "",
        userId: body.author?.id ?? "", channelId: body.channel_id ?? "", guildId: body.guild_id ?? "",
        messageId: body.id ?? "", hasMedia: attachments.length > 0, attachments, embeds: body.embeds ?? [], message: body,
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
    async run(config, input, context = {}) {
      const body   = input?.body ?? input;
      const provider = config?.provider || "twilio";

      // ── Twilio provider ───────────────────────────────────────────────
      if (provider === "twilio") {
        const text = body?.Body ?? "";
        const from = body?.From ?? "";
        const numMedia = parseInt(body?.NumMedia ?? "0", 10);
        let attachments = [];
        if (numMedia > 0 && body?.MediaUrl0) {
          try {
            // Twilio media URLs require Basic auth with AccountSid:AuthToken
            let auth = undefined;
            if (config?.twilioAuthToken) {
              try {
                const token = await getOAuthToken(config.twilioAuthToken, context.workspaceId, "WhatsApp").catch(() => config.twilioAuthToken);
                const accountSid = body.AccountSid;
                if (accountSid) auth = { username: accountSid, password: token };
              } catch (_) {}
            }
            const { data: buf } = await axios.get(body.MediaUrl0, { auth, responseType: "arraybuffer", timeout: 30000 });
            const mimeType = body.MediaContentType0 || "application/octet-stream";
            attachments = [{ dataUrl: `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType, name: `media.${mimeType.split("/")[1] || "bin"}` }];
          } catch (err) {
            console.warn("[whatsapp_trigger] Twilio media download failed:", err.message);
          }
        }
        return { text, from, to: body?.To ?? "", messageId: body?.MessageSid ?? "", accountSid: body?.AccountSid ?? "", numMedia, hasMedia: attachments.length > 0, attachments, body };
      }

      // ── Meta (Cloud API) provider ─────────────────────────────────────
      const entry  = body?.entry?.[0] ?? {};
      const change = entry?.changes?.[0]?.value ?? {};
      const msg    = change?.messages?.[0] ?? {};

      let mediaInfo = null; let mediaType = null;
      if (msg.image)    { mediaInfo = msg.image;    mediaType = "image"; }
      else if (msg.document) { mediaInfo = msg.document; mediaType = "document"; }
      else if (msg.audio)    { mediaInfo = msg.audio;    mediaType = "audio"; }
      else if (msg.video)    { mediaInfo = msg.video;    mediaType = "video"; }
      else if (msg.sticker)  { mediaInfo = msg.sticker;  mediaType = "sticker"; }

      let attachments = [];
      // Meta media download requires a permanent access token — stored in metaAppSecret credential
      // We skip download if the token isn't available; the media_id is still passed through
      if (mediaInfo?.id && config?.metaAppSecret) {
        try {
          const token = await getOAuthToken(config.metaAppSecret, context.workspaceId, "WhatsApp").catch(() => config.metaAppSecret);
          const { data: mediaData } = await axios.get(`https://graph.facebook.com/v18.0/${mediaInfo.id}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
          const { data: buf } = await axios.get(mediaData.url, { headers: { Authorization: `Bearer ${token}` }, responseType: "arraybuffer", timeout: 30000 });
          const mimeType = mediaInfo.mime_type || mediaData.mime_type || "application/octet-stream";
          const name = mediaInfo.filename || `${mediaType}.${mimeType.split("/")[1] || "bin"}`;
          attachments = [{ dataUrl: `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType, name }];
        } catch (err) {
          console.warn("[whatsapp_trigger] Meta media download failed:", err.message);
        }
      }

      return {
        text: msg.text?.body ?? msg.caption ?? "", from: msg.from ?? "",
        phoneNumberId: change.metadata?.phone_number_id ?? "", message: msg,
        contacts: change.contacts ?? [], hasMedia: attachments.length > 0, mediaType, attachments,
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
  condition: condition,
  success_failed: successFailed,
  stop_error: stopError,
  retry: retry,
  rate_limiter: rateLimiter,
  distributor: distributor,
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
  notification_hub: notificationHub,
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

  // Virtual Computer
  virtual_computer: virtualComputer,

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
  xml_parser: xmlParser,
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
  tiktok_post: tiktok,
  instagram: instagram,
  instagram_post: instagram,
  ocr: ocr,

  // ── Utility nodes ──────────────────────────────────────────────────────────
  base64:              utilityNodes.base64,
  hash:                utilityNodes.hash,
  color_converter:     utilityNodes.color_converter,
  unit_converter:      utilityNodes.unit_converter,
  number_format:       utilityNodes.number_format,
  find_replace:        utilityNodes.find_replace,
  regex_match:         utilityNodes.regex_match,
  math_expression:     utilityNodes.math_expression,
  html_to_text:        utilityNodes.html_to_text,
  json_to_csv:         utilityNodes.json_to_csv,
  markdown_renderer:   utilityNodes.markdown_renderer,
  text_format:         utilityNodes.text_format,
  random_pick:         utilityNodes.random_pick,
  pagination_handler:  utilityNodes.pagination_handler,
  counter:             utilityNodes.counter,
  variable_set_get:    utilityNodes.variable_set_get,
  schedule_check:      utilityNodes.schedule_check,
  semver_compare:      utilityNodes.semver_compare,
  env_variable:        utilityNodes.env_variable,
  error:               utilityNodes.error,
  zip_files:           utilityNodes.zip_files,
  compound_interest:   utilityNodes.compound_interest,
  gst_calculator:      utilityNodes.gst_calculator,
  payroll_calculator:  utilityNodes.payroll_calculator,
  tax_rate_lookup:     utilityNodes.tax_rate_lookup,
  price_alert:         utilityNodes.price_alert,
  ledger_entry:        utilityNodes.ledger_entry,

  // ── Network / infra nodes ──────────────────────────────────────────────────
  dns:                 networkNodes.dns_lookup,
  ssl:                 networkNodes.ssl,
  http_monitor:        networkNodes.http_monitor,
  port_monitor:        networkNodes.port_monitor,
  ip_lookup:           networkNodes.ip_lookup,
  ip_whitelist:        networkNodes.ip_whitelist,

  // ── Public API nodes ───────────────────────────────────────────────────────
  arxiv_search:        publicApiNodes.arxiv_search,
  pubmed_search:       publicApiNodes.pubmed_search,
  clinical_trials:     publicApiNodes.clinical_trials,
  drug_lookup:         publicApiNodes.drug_lookup,
  hackernews:          publicApiNodes.hackernews,
  wikipedia_lookup:    publicApiNodes.wikipedia_lookup,
  npm_package_info:    publicApiNodes.npm_package_info,
  news_search:         publicApiNodes.news_search,
  producthunt:         publicApiNodes.producthunt,
  stock_price:         publicApiNodes.stock_price,
  currency_exchange:   publicApiNodes.currency_exchange,
  twitch_stream_status: publicApiNodes.twitch_stream_status,

  // ── AI content nodes ───────────────────────────────────────────────────────
  remove_background:   aiContentNodes.remove_background,
  invoice_parser:      aiContentNodes.invoice_parser,
  bank_statement_parser: aiContentNodes.bank_statement_parser,
  chat:                aiContentNodes.chat,

  // ── Dev tools nodes ────────────────────────────────────────────────────────
  graphql_request:     devToolNodes.graphql_request,
  grpc_call:           devToolNodes.grpc_call,
  gitlab:              devToolNodes.gitlab,
  azure_devops:        devToolNodes.azure_devops,
  github_issue:        devToolNodes.github_issue,
  docker:              devToolNodes.docker,
  docker_run:          devToolNodes.docker_run,
  ssh:                 devToolNodes.ssh,
  google_docs:         devToolNodes.google_docs,
  google_forms:        devToolNodes.google_forms,
  figma:               devToolNodes.figma,
  figma_comment:       devToolNodes.figma_comment,

  // ── Social / publishing nodes ──────────────────────────────────────────────
  twitter_post:        socialNodes.twitter_post,
  linkedin_post:       socialNodes.linkedin_post,
  youtube_upload:      socialNodes.youtube_upload,
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
  if_condition: logicRouter,

  // Agent Tool Nodes — spread all tool_* exports
  ...Object.fromEntries(
    Object.entries(agentToolNodes).map(([key, val]) => [key, val])
  ),
};
