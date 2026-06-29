import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import Automation from "../models/automation.model.js";
import { findAutomationsWithTrigger, getTriggerNodesOfType, getTriggerConfig } from "./triggerNodes.util.js";

import { pollGmail, buildGmailQuery } from "./gmail.poller.js";
import { pollAirtable } from "./airtable.poller.js";
import { pollHubSpot } from "./hubspot.poller.js";
import { pollNotion } from "./notion.poller.js";
import { pollJira } from "./jira.poller.js";
import { pollAsana } from "./asana.poller.js";
import { pollTable } from "./db.poller.js";
import { pollDns } from "./dnsMonitor.poller.js";
import { pollDocker } from "./docker.poller.js";
import { pollRepo } from "./githubIssue.poller.js";
import { pollGitLab } from "./gitlab.poller.js";
import { pollLinear } from "./linear.poller.js";
import { pollCalendar } from "./googleCalendar.poller.js";
import { pollGoogleSheets } from "./googleSheets.poller.js";
import { pollGoogleDrive } from "./googleDrive.poller.js";
import { pollGoogleDocs } from "./googleDocs.poller.js";
import { pollOneDrive } from "./onedrive.poller.js";
import { pollSharePoint } from "./sharepoint.poller.js";
import { pollHackerNews } from "./hackerNews.poller.js";
import { pollHttpMonitor } from "./httpMonitor.poller.js";
import { pollMailbox } from "./imap.poller.js";
import { pollOutlook } from "./outlookEmail.poller.js";
import { pollPipedrive } from "./pipedrive.poller.js";
import { pollPort } from "./portMonitor.poller.js";
import { pollPrice } from "./priceAlert.poller.js";
import { pollSubreddit } from "./reddit.poller.js";
import { pollFeed } from "./rss.poller.js";
import { pollSsh } from "./ssh.poller.js";
import { pollSslCert } from "./sslCert.poller.js";
import { pollTeams } from "./teamsMessage.poller.js";
import { pollDatadog } from "./datadog.poller.js";
import { pollClickUp } from "./clickup.poller.js";
import { pollSentry } from "./sentry.poller.js";
import { pollShopify } from "./shopify.poller.js";
import { pollWooCommerce } from "./woocommerce.poller.js";
import { pollMonday } from "./monday.poller.js";
import { pollZendesk } from "./zendesk.poller.js";
import { pollIntercom } from "./intercom.poller.js";
import { pollCalendly } from "./calendly.poller.js";
import { pollTypeform } from "./typeform.poller.js";
import { pollMailchimp } from "./mailchimp.poller.js";
import { pollPagerDuty } from "./pagerduty.poller.js";
import { pollNetlify } from "./netlify.poller.js";
import { pollVercel } from "./vercel.poller.js";
import { pollInstagram } from "./instagram.poller.js";
import { pollTikTok } from "./tiktok.poller.js";
import { pollSlack } from "./slack.poller.js";
import { pollTrello } from "./trello.poller.js";
import { pollChannel } from "./youtube.poller.js";
import { pollProductHunt } from "./producthunt.poller.js";
import { pollMastodon } from "./mastodon.poller.js";
import { pollVirusTotal } from "./virustotal.poller.js";
import { pollGoogleForms } from "./googleForms.poller.js";
import { pollDiscord } from "./discord.poller.js";
import { pollTelegram } from "./telegram.poller.js";
import { pollAzureDevops } from "./azureDevops.poller.js";

const HUB_QUEUE = "bb-poll-hub";

// ── Per-trigger registry ───────────────────────────────────────────────────────
// Each entry:
//   triggerName  – value of automation.trigger in DB
//   required     – config fields that must be present (skip automation if missing)
//   extract      – (cfg, automation) → job payload
//   repeat       – (cfg) → BullMQ repeat option { pattern } or { every }
//   jobPrefix    – prefix for repeatable job dedup key
//   run          – (jobData) → async call to poll function

const POLL_REGISTRY = {
  gmail_trigger: {
    triggerName: "gmail_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      credentialId: cfg.credentialId,
      query: buildGmailQuery(cfg),
      maxResults: cfg.maxResults || 10,
      onlyNew: cfg.onlyNew !== false,
      workspaceId: automation.workspaceId,
    }),
    repeat: (cfg) => ({ pattern: cfg.pollInterval || "*/5 * * * *" }),
    jobPrefix: "gmail",
    run: async ({ automationId, triggerNodeId, credentialId, query, maxResults, onlyNew, workspaceId }) => {
      await pollGmail(automationId, triggerNodeId, credentialId, query, maxResults, onlyNew, workspaceId);
    },
  },

  airtable_trigger: {
    triggerName: "airtable_trigger",
    required: ["apiKey", "baseId", "tableId"],
    extract: (cfg, automation) => ({
      apiKey: cfg.apiKey, baseId: cfg.baseId, tableId: cfg.tableId,
      viewName: cfg.viewName, filterFormula: cfg.filterFormula,
      maxRecords: cfg.maxRecords || 20, triggerOnUpdate: !!cfg.triggerOnUpdate,
      workspaceId: automation.workspaceId,
      formulaMode: cfg.formulaMode, filterField: cfg.filterField, filterValue: cfg.filterValue,
    }),
    repeat: (cfg) => ({ pattern: cfg.pollInterval || "*/5 * * * *" }),
    jobPrefix: "airtable",
    run: async ({ automationId, triggerNodeId, apiKey, baseId, tableId, viewName, filterFormula, maxRecords, triggerOnUpdate, workspaceId, formulaMode, filterField, filterValue }) => {
      await pollAirtable(automationId, triggerNodeId, apiKey, baseId, tableId, viewName, filterFormula, maxRecords, triggerOnUpdate, workspaceId, { formulaMode, filterField, filterValue });
    },
  },

  hubspot_trigger: {
    triggerName: "hubspot_trigger",
    required: ["apiKey"],
    extract: (cfg, automation) => ({
      apiKey: cfg.apiKey, objectType: cfg.objectType || "contacts",
      filterProperty: cfg.filterProperty, filterValue: cfg.filterValue,
      limit: cfg.limit || 20, triggerOnUpdate: !!cfg.triggerOnUpdate,
      workspaceId: automation.workspaceId,
    }),
    repeat: (cfg) => ({ pattern: cfg.pollInterval || "*/5 * * * *" }),
    jobPrefix: "hubspot",
    run: async ({ automationId, triggerNodeId, apiKey, objectType, filterProperty, filterValue, limit, triggerOnUpdate, workspaceId }) => {
      await pollHubSpot(automationId, triggerNodeId, apiKey, objectType, filterProperty, filterValue, limit, triggerOnUpdate, workspaceId);
    },
  },

  notion_trigger: {
    triggerName: "notion_trigger",
    required: ["apiKey", "databaseId"],
    extract: (cfg, automation) => ({
      apiKey: cfg.apiKey, databaseId: cfg.databaseId,
      filterProperty: cfg.filterProperty, filterValue: cfg.filterValue,
      maxPages: cfg.maxPages || 20, triggerOnUpdate: !!cfg.triggerOnUpdate,
      workspaceId: automation.workspaceId, filterType: cfg.filterType || "status",
    }),
    repeat: (cfg) => ({ pattern: cfg.pollInterval || "*/5 * * * *" }),
    jobPrefix: "notion",
    run: async ({ automationId, triggerNodeId, apiKey, databaseId, filterProperty, filterValue, maxPages, triggerOnUpdate, workspaceId, filterType }) => {
      await pollNotion(automationId, triggerNodeId, apiKey, databaseId, filterProperty, filterValue, maxPages, triggerOnUpdate, workspaceId, filterType);
    },
  },

  jira_trigger: {
    triggerName: "jira_trigger",
    required: ["domain", "token"],
    extract: (cfg) => ({
      cfg: { domain: cfg.domain, email: cfg.email, token: cfg.token, jql: cfg.jql, dedupOn: cfg.dedupOn },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "jira",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollJira(automationId, triggerNodeId, cfg); },
  },

  asana_trigger: {
    triggerName: "asana_trigger",
    required: [],
    extract: (cfg) => ({
      cfg: {
        token: cfg.token || cfg.accessToken,
        projectId: cfg.projectId || cfg.projectGid,
        eventType: cfg.eventType || cfg.watchType,
        dueWithinDays: cfg.dueWithinDays,
        sectionName: cfg.sectionName,
        tagName: cfg.tagName,
      },
    }),
    repeat: (cfg) => {
      const min = Math.max(1, Math.round(
        cfg.pollIntervalMinutes ? parseInt(cfg.pollIntervalMinutes) :
        cfg.pollIntervalSeconds ? parseInt(cfg.pollIntervalSeconds) / 60 : 5,
      ));
      return { pattern: `*/${min} * * * *` };
    },
    jobPrefix: "asana",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollAsana(automationId, triggerNodeId, cfg); },
  },

  db_trigger: {
    triggerName: "db_trigger",
    required: ["tableName"],
    extract: (cfg) => ({
      cfg,
      credentialId: cfg.credentialId || null,
      rawConnectionString: cfg.connectionString || "",
    }),
    repeat: (cfg) => ({ pattern: cfg.pollInterval || "* * * * *" }),
    jobPrefix: "db",
    run: async ({ automationId, triggerNodeId, cfg, credentialId, rawConnectionString }) => {
      let connectionString = rawConnectionString || cfg.connectionString || "";
      if (credentialId && !connectionString) {
        try {
          const { resolveCredential } = await import("../modules/credentials/credential.service.js");
          const cred = await resolveCredential(credentialId);
          connectionString = cred?.value || cred?.connectionString || "";
        } catch (err) {
          console.error(`[PollHub/db] Credential resolution failed for ${automationId}:`, err.message);
          return;
        }
      }
      if (!connectionString) { console.warn(`[PollHub/db] No connection string for ${automationId}`); return; }
      await pollTable(automationId, triggerNodeId, cfg, connectionString);
    },
  },

  dns_trigger: {
    triggerName: "dns_trigger",
    required: ["domain"],
    extract: (cfg) => ({
      cfg: { domain: cfg.domain || cfg.hostname, recordType: cfg.recordType },
    }),
    repeat: (cfg) => {
      const min = Math.max(1, Math.round(
        cfg.pollIntervalMinutes ? parseInt(cfg.pollIntervalMinutes) :
        cfg.pollIntervalSeconds ? parseInt(cfg.pollIntervalSeconds) / 60 : 15,
      ));
      return { pattern: `*/${min} * * * *` };
    },
    jobPrefix: "dns",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollDns(automationId, triggerNodeId, cfg); },
  },

  docker_trigger: {
    triggerName: "docker_trigger",
    required: ["host"],
    extract: (cfg) => ({
      cfg: { host: cfg.host, eventType: cfg.eventType, containerFilter: cfg.containerFilter },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 1} * * * *` }),
    jobPrefix: "docker",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollDocker(automationId, triggerNodeId, cfg); },
  },

  github_issue_trigger: {
    triggerName: "github_issue_trigger",
    required: ["owner", "repo"],
    extract: (cfg, automation) => ({
      credentialId: cfg.credentialId,
      workspaceId: automation.workspaceId,
      owner: cfg.owner, repo: cfg.repo,
      type: cfg.type || cfg.eventType, labelFilter: cfg.labelFilter,
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "ghissue",
    run: async ({ automationId, triggerNodeId, credentialId, workspaceId, owner, repo, type, labelFilter }) => {
      await pollRepo(automationId, triggerNodeId, credentialId, workspaceId, owner, repo, type, labelFilter);
    },
  },

  gitlab_trigger: {
    triggerName: "gitlab_trigger",
    required: ["projectId", "token"],
    extract: (cfg) => ({
      cfg: { host: cfg.host, projectId: cfg.projectId, token: cfg.token, eventType: cfg.eventType },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "gitlab",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollGitLab(automationId, triggerNodeId, cfg); },
  },

  google_calendar_trigger: {
    triggerName: "google_calendar_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      credentialId: cfg.credentialId, workspaceId: automation.workspaceId,
      calendarId: cfg.calendarId || "primary",
      minutesBefore: cfg.minutesBefore, filterQuery: cfg.filterQuery,
      eventType: cfg.eventType || cfg.watchType,
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 1} * * * *` }),
    jobPrefix: "gcal",
    run: async ({ automationId, triggerNodeId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery, eventType }) => {
      await pollCalendar(automationId, triggerNodeId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery, eventType);
    },
  },

  google_sheets_trigger: {
    triggerName: "google_sheets_trigger",
    required: ["spreadsheetId", "credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        spreadsheetId: cfg.spreadsheetId, range: cfg.range, hasHeader: cfg.hasHeader,
        eventType: cfg.eventType || cfg.watchType, columnName: cfg.columnName, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "gsheets",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollGoogleSheets(automationId, triggerNodeId, cfg); },
  },

  google_drive_trigger: {
    triggerName: "google_drive_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        eventType: cfg.eventType || cfg.watchType, folderId: cfg.folderId,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "gdrive",
    run: async ({ automationId, cfg }) => { await pollGoogleDrive(automationId, cfg); },
  },

  google_docs_trigger: {
    triggerName: "google_docs_trigger",
    required: ["credentialId", "docId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        docId: cfg.docId, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "gdocs",
    run: async ({ automationId, cfg }) => { await pollGoogleDocs(automationId, cfg); },
  },

  clickup_trigger: {
    triggerName: "clickup_trigger",
    required: ["credentialId", "listId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        listId: cfg.listId, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "clickup",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollClickUp(automationId, triggerNodeId, cfg); },
  },

  sentry_trigger: {
    triggerName: "sentry_trigger",
    required: ["credentialId", "organization"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        organization: cfg.organization, project: cfg.project, query: cfg.query,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "sentry",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollSentry(automationId, triggerNodeId, cfg); },
  },

  shopify_trigger: {
    triggerName: "shopify_trigger",
    required: ["credentialId", "shop"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        shop: cfg.shop, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "shopify",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollShopify(automationId, triggerNodeId, cfg); },
  },

  woocommerce_trigger: {
    triggerName: "woocommerce_trigger",
    required: ["credentialId", "storeUrl"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        storeUrl: cfg.storeUrl, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "woocommerce",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollWooCommerce(automationId, triggerNodeId, cfg); },
  },

  monday_trigger: {
    triggerName: "monday_trigger",
    required: ["credentialId", "boardId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        boardId: cfg.boardId, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "monday",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollMonday(automationId, triggerNodeId, cfg); },
  },

  zendesk_trigger: {
    triggerName: "zendesk_trigger",
    required: ["credentialId", "subdomain"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        subdomain: cfg.subdomain, email: cfg.email,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "zendesk",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollZendesk(automationId, triggerNodeId, cfg); },
  },

  intercom_trigger: {
    triggerName: "intercom_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "intercom",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollIntercom(automationId, triggerNodeId, cfg); },
  },

  calendly_trigger: {
    triggerName: "calendly_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "calendly",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollCalendly(automationId, triggerNodeId, cfg); },
  },

  typeform_trigger: {
    triggerName: "typeform_trigger",
    required: ["credentialId", "formId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        formId: cfg.formId,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "typeform",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollTypeform(automationId, triggerNodeId, cfg); },
  },

  mailchimp_trigger: {
    triggerName: "mailchimp_trigger",
    required: ["credentialId", "listId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        listId: cfg.listId,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "mailchimp",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollMailchimp(automationId, triggerNodeId, cfg); },
  },

  pagerduty_trigger: {
    triggerName: "pagerduty_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        serviceId: cfg.serviceId,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "pagerduty",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollPagerDuty(automationId, triggerNodeId, cfg); },
  },

  netlify_trigger: {
    triggerName: "netlify_trigger",
    required: ["credentialId", "siteId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        siteId: cfg.siteId,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "netlify",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollNetlify(automationId, triggerNodeId, cfg); },
  },

  vercel_trigger: {
    triggerName: "vercel_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        projectId: cfg.projectId, teamId: cfg.teamId,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "vercel",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollVercel(automationId, triggerNodeId, cfg); },
  },

  instagram_trigger: {
    triggerName: "instagram_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "instagram",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollInstagram(automationId, triggerNodeId, cfg); },
  },

  slack_trigger: {
    triggerName: "slack_trigger",
    required: ["credentialId", "channel"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        channel: cfg.channel,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "slack",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollSlack(automationId, triggerNodeId, cfg); },
  },

  tiktok_trigger: {
    triggerName: "tiktok_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "tiktok",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollTikTok(automationId, triggerNodeId, cfg); },
  },

  datadog_trigger: {
    triggerName: "datadog_trigger",
    required: ["apiKey", "appKey"],
    extract: (cfg) => ({
      cfg: {
        apiKey: cfg.apiKey, appKey: cfg.appKey,
        tags: cfg.tags, priority: cfg.priority,
        windowMinutes: parseInt(cfg.windowMinutes) || 15,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "datadog",
    run: async ({ automationId, cfg }) => { await pollDatadog(automationId, cfg); },
  },

  onedrive_trigger: {
    triggerName: "onedrive_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        eventType: cfg.eventType || cfg.watchType, folderId: cfg.folderId,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "onedrive",
    run: async ({ automationId, cfg }) => { await pollOneDrive(automationId, cfg); },
  },

  sharepoint_trigger: {
    triggerName: "sharepoint_trigger",
    required: ["credentialId", "siteId", "listId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        siteId: cfg.siteId, listId: cfg.listId,
        eventType: cfg.eventType || cfg.watchType,
        columnName: cfg.columnName, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "sharepoint",
    run: async ({ automationId, cfg }) => { await pollSharePoint(automationId, cfg); },
  },

  hackernews_trigger: {
    triggerName: "hackernews_trigger",
    required: [],
    extract: (cfg) => ({
      cfg: { query: cfg.query || cfg.keyword, storyType: cfg.storyType || cfg.feedType, minPoints: cfg.minPoints },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 15} * * * *` }),
    jobPrefix: "hn",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollHackerNews(automationId, triggerNodeId, cfg); },
  },

  http_monitor_trigger: {
    triggerName: "http_monitor_trigger",
    required: ["url"],
    extract: (cfg) => ({
      cfg: { url: cfg.url, expectedKeyword: cfg.expectedKeyword, alertOn: cfg.alertOn, maxResponseMs: cfg.maxResponseMs },
    }),
    repeat: (cfg) => ({ every: (parseInt(cfg.pollIntervalSeconds) || 60) * 1000 }),
    jobPrefix: "httpmon",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollHttpMonitor(automationId, triggerNodeId, cfg); },
  },

  imap_trigger: {
    triggerName: "imap_trigger",
    required: ["imapHost", "imapUser"],
    extract: (cfg) => ({ cfg, credentialId: cfg.credentialId || null }),
    repeat: (cfg) => ({ pattern: cfg.pollInterval || "*/5 * * * *" }),
    jobPrefix: "imap",
    run: async ({ automationId, triggerNodeId, cfg, credentialId }) => {
      let password = "";
      if (credentialId) {
        try {
          const { resolveCredential } = await import("../modules/credentials/credential.service.js");
          const cred = await resolveCredential(credentialId);
          password = cred?.value || cred?.password || "";
        } catch (err) {
          console.error(`[PollHub/imap] Credential resolution failed for ${automationId}:`, err.message);
          return;
        }
      }
      await pollMailbox(automationId, triggerNodeId, cfg, password);
    },
  },

  outlook_trigger: {
    triggerName: "outlook_trigger",
    required: ["credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        eventType: cfg.eventType || cfg.watchType,
        folder: cfg.folder, subjectFilter: cfg.subjectFilter,
        fromEmail: cfg.fromEmail, fromDomain: cfg.fromDomain, onlyUnread: cfg.onlyUnread,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "outlook",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollOutlook(automationId, triggerNodeId, cfg); },
  },

  pipedrive_trigger: {
    triggerName: "pipedrive_trigger",
    required: ["apiToken"],
    extract: (cfg) => ({
      cfg: { apiToken: cfg.apiToken, eventType: cfg.eventType || cfg.watchType, stageFilter: cfg.stageFilter, minValue: cfg.minValue },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "pipedrive",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollPipedrive(automationId, triggerNodeId, cfg); },
  },

  port_monitor_trigger: {
    triggerName: "port_monitor_trigger",
    required: ["host", "port"],
    extract: (cfg) => ({
      cfg: { host: cfg.host, port: cfg.port, alertOn: cfg.alertOn },
    }),
    repeat: (cfg) => ({ every: (parseInt(cfg.pollIntervalSeconds) || 60) * 1000 }),
    jobPrefix: "port",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollPort(automationId, triggerNodeId, cfg); },
  },

  price_alert_trigger: {
    triggerName: "price_alert_trigger",
    required: ["coinId"],
    extract: (cfg) => ({
      cfg: { coinId: cfg.coinId, currency: cfg.currency, condition: cfg.condition, threshold: cfg.threshold },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "pa",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollPrice(automationId, triggerNodeId, cfg); },
  },

  reddit_trigger: {
    triggerName: "reddit_trigger",
    required: ["subreddit"],
    extract: (cfg) => ({
      cfg: { subreddit: cfg.subreddit, searchQuery: cfg.searchQuery, sort: cfg.sort, minScore: cfg.minScore },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 10} * * * *` }),
    jobPrefix: "reddit",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollSubreddit(automationId, triggerNodeId, cfg); },
  },

  rss_trigger: {
    triggerName: "rss_trigger",
    required: ["feedUrl"],
    extract: (cfg) => ({ feedUrl: cfg.feedUrl, onlyNew: cfg.onlyNew !== false, keyword: cfg.keyword || "", matchAll: !!cfg.matchAll }),
    repeat: (cfg) => ({ pattern: cfg.pollInterval || "*/15 * * * *" }),
    jobPrefix: "rss",
    run: async ({ automationId, triggerNodeId, feedUrl, onlyNew, keyword, matchAll }) => { await pollFeed(automationId, triggerNodeId, feedUrl, onlyNew, keyword, matchAll); },
  },

  ssh_trigger: {
    triggerName: "ssh_trigger",
    required: ["host", "command"],
    extract: (cfg) => ({
      cfg: {
        host: cfg.host, port: cfg.port, username: cfg.username,
        password: cfg.password, privateKey: cfg.privateKey, passphrase: cfg.passphrase,
        authMethod: cfg.authMethod, command: cfg.command, onlyOnChange: cfg.onlyOnChange,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "ssh",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollSsh(automationId, triggerNodeId, cfg); },
  },

  ssl_trigger: {
    triggerName: "ssl_trigger",
    required: ["host"],
    extract: (cfg) => ({
      cfg: { host: cfg.host || cfg.hostname, port: cfg.port, warnDays: cfg.warnDays || cfg.warningDays },
    }),
    repeat: () => ({ every: 12 * 60 * 60 * 1000 }),
    jobPrefix: "ssl",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollSslCert(automationId, triggerNodeId, cfg); },
  },

  teams_trigger: {
    triggerName: "teams_trigger",
    required: ["credentialId", "teamId", "channelId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        teamId: cfg.teamId, channelId: cfg.channelId, eventType: cfg.eventType || cfg.watchType,
        keywordFilter: cfg.keywordFilter, fromUser: cfg.fromUser,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 2} * * * *` }),
    jobPrefix: "teams",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollTeams(automationId, triggerNodeId, cfg); },
  },

  trello_trigger: {
    triggerName: "trello_trigger",
    required: ["boardId", "apiKey"],
    extract: (cfg) => ({
      cfg: { boardId: cfg.boardId, apiKey: cfg.apiKey, token: cfg.token, actionType: cfg.actionType || cfg.watchType, listFilter: cfg.listFilter },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "trello",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollTrello(automationId, triggerNodeId, cfg); },
  },

  youtube_trigger: {
    triggerName: "youtube_trigger",
    required: ["channelId", "credentialId"],
    extract: (cfg, automation) => ({
      credentialId: cfg.credentialId, workspaceId: automation.workspaceId,
      channelId: cfg.channelId, maxResults: cfg.maxResults || 10,
      cfg: { eventType: cfg.eventType || cfg.watchType, searchQuery: cfg.searchQuery, minViews: cfg.minViews, minLikes: cfg.minLikes },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 15} * * * *` }),
    jobPrefix: "yt",
    run: async ({ automationId, triggerNodeId, credentialId, workspaceId, channelId, maxResults, cfg }) => {
      await pollChannel(automationId, triggerNodeId, credentialId, workspaceId, channelId, maxResults, cfg);
    },
  },

  producthunt_trigger: {
    triggerName: "producthunt_trigger",
    required: [],
    extract: (cfg) => ({
      cfg: { apiKey: cfg.apiKey, category: cfg.category, minVotes: cfg.minVotes, eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 60} * * * *` }),
    jobPrefix: "ph",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollProductHunt(automationId, triggerNodeId, cfg); },
  },

  mastodon_trigger: {
    triggerName: "mastodon_trigger",
    required: ["instanceUrl", "accessToken"],
    extract: (cfg) => ({
      cfg: { instanceUrl: cfg.instanceUrl, accessToken: cfg.accessToken, eventType: cfg.eventType || cfg.watchType, hashtag: cfg.hashtag },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "mastodon",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollMastodon(automationId, triggerNodeId, cfg); },
  },

  virustotal_trigger: {
    triggerName: "virustotal_trigger",
    required: ["apiKey", "scanTarget"],
    extract: (cfg) => ({
      cfg: {
        apiKey: cfg.apiKey, scanTarget: cfg.scanTarget, scanType: cfg.scanType || "file",
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 60} * * * *` }),
    jobPrefix: "vt",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollVirusTotal(automationId, triggerNodeId, cfg); },
  },

  google_forms_trigger: {
    triggerName: "google_forms_trigger",
    required: ["credentialId", "formId"],
    extract: (cfg, automation) => ({
      cfg: { credentialId: cfg.credentialId, workspaceId: automation.workspaceId, formId: cfg.formId, eventType: cfg.eventType || cfg.watchType, questionTitle: cfg.questionTitle, targetValue: cfg.targetValue },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "gforms",
    run: async ({ automationId, cfg }) => { await pollGoogleForms(automationId, cfg); },
  },

  telegram_trigger: {
    triggerName: "telegram_trigger",
    required: ["botToken"],
    extract: (cfg, automation) => ({
      cfg: { botToken: cfg.botToken, workspaceId: automation.workspaceId?.toString(), eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 1} * * * *` }),
    jobPrefix: "telegram",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollTelegram(automationId, triggerNodeId, cfg); },
  },

  discord_trigger: {
    triggerName: "discord_trigger",
    required: ["botToken"],
    extract: (cfg) => ({
      cfg: {
        botToken: cfg.botToken, channelId: cfg.channelId, guildId: cfg.guildId,
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 2} * * * *` }),
    jobPrefix: "discord",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollDiscord(automationId, triggerNodeId, cfg); },
  },

  azure_devops_trigger: {
    triggerName: "azure_devops_trigger",
    required: ["organization", "project", "pat"],
    extract: (cfg, automation) => ({
      cfg: {
        organization: cfg.organization, project: cfg.project, pat: cfg.pat,
        workspaceId: automation.workspaceId?.toString(),
        eventType: cfg.eventType || cfg.watchType, targetValue: cfg.targetValue,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 3} * * * *` }),
    jobPrefix: "ado",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollAzureDevops(automationId, triggerNodeId, cfg); },
  },

  linear_trigger: {
    triggerName: "linear_trigger",
    required: ["apiKey"],
    extract: (cfg) => ({
      cfg: { apiKey: cfg.apiKey, teamId: cfg.teamId, assigneeId: cfg.assigneeId,
        labelFilter: cfg.labelFilter, statusFilter: cfg.statusFilter, view: cfg.view },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "linear",
    run: async ({ automationId, cfg }) => { await pollLinear(automationId, cfg); },
  },
};

// ── Hub state ──────────────────────────────────────────────────────────────────

let hubQueue = null;
let hubWorker = null;

// ── Dispatch ───────────────────────────────────────────────────────────────────

async function dispatch(job) {
  const { triggerType, automationId, triggerNodeId, ...payload } = job.data;
  const entry = POLL_REGISTRY[triggerType];
  if (!entry) {
    console.warn(`[PollHub] Unknown triggerType "${triggerType}" in job ${job.id}`);
    return;
  }
  await entry.run({ automationId, triggerNodeId, ...payload });
}

// ── Sync ───────────────────────────────────────────────────────────────────────

export async function syncPollerHub(filterTriggerType = null) {
  if (!hubQueue) return;

  const existing = await hubQueue.getRepeatableJobs();

  if (filterTriggerType) {
    for (const job of existing) {
      if (job.id?.startsWith(`${POLL_REGISTRY[filterTriggerType]?.jobPrefix}-`)) {
        await hubQueue.removeRepeatableByKey(job.key);
      }
    }
  } else {
    for (const job of existing) await hubQueue.removeRepeatableByKey(job.key);
  }

  const typesToSync = filterTriggerType
    ? [filterTriggerType]
    : Object.keys(POLL_REGISTRY);

  let total = 0;

  for (const triggerType of typesToSync) {
    const entry = POLL_REGISTRY[triggerType];
    const automations = await findAutomationsWithTrigger(entry.triggerName);

    for (const automation of automations) {
      for (const node of getTriggerNodesOfType(automation, entry.triggerName)) {
        const cfg = getTriggerConfig(node);

        const missing = entry.required.filter((f) => !cfg[f]);
        if (missing.length) {
          console.warn(`[PollHub] ${automation._id} node ${node.id} (${triggerType}) missing: ${missing.join(", ")} — skipping`);
          continue;
        }

        const payload = entry.extract(cfg, automation);
        const repeatOpt = entry.repeat(cfg);
        const jobId = `${entry.jobPrefix}-${automation._id}-${node.id}`;

        await hubQueue.add(
          "poll",
          { triggerType, automationId: automation._id.toString(), triggerNodeId: node.id, ...payload },
          { repeat: repeatOpt, jobId },
        );

        total++;
      }
    }
  }

  if (!filterTriggerType) {
    console.log(`[PollHub] Synced ${total} jobs across ${typesToSync.length} trigger types`);
  }
}

// ── Start / Stop ───────────────────────────────────────────────────────────────

export async function startPollerHub() {
  hubQueue = new Queue(HUB_QUEUE, {
    connection: createBullMQConnection(),
    defaultJobOptions: { attempts: 1, removeOnComplete: { count: 200 }, removeOnFail: { count: 500 } },
  });

  hubWorker = new Worker(HUB_QUEUE, dispatch, {
    connection: createBullMQConnection(),
    concurrency: 8,
  });

  hubWorker.on("failed", (job, err) => {
    const { triggerType, automationId } = job?.data ?? {};
    console.error(`[PollHub] Job failed — type=${triggerType} automation=${automationId}: ${err.message}`);
  });

  await syncPollerHub();
  console.log("[PollHub] Ready — single queue replacing 27 poller instances");
}

export async function stopPollerHub() {
  if (hubWorker) await hubWorker.close();
  if (hubQueue) await hubQueue.close();
}
