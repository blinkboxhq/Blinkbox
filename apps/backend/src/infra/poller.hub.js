import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import Automation from "../models/automation.model.js";
import { findAutomationsWithTrigger, getTriggerNodesOfType, getTriggerConfig } from "./triggerNodes.util.js";

import { pollGmail } from "./gmail.poller.js";
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
import { pollTrello } from "./trello.poller.js";
import { pollChannel } from "./youtube.poller.js";
import { pollProductHunt } from "./producthunt.poller.js";
import { pollMastodon } from "./mastodon.poller.js";
import { pollVirusTotal } from "./virustotal.poller.js";
import { pollGoogleForms } from "./googleForms.poller.js";

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
      query: cfg.query || "is:unread",
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
    }),
    repeat: (cfg) => ({ pattern: cfg.pollInterval || "*/5 * * * *" }),
    jobPrefix: "airtable",
    run: async ({ automationId, triggerNodeId, apiKey, baseId, tableId, viewName, filterFormula, maxRecords, triggerOnUpdate, workspaceId }) => {
      await pollAirtable(automationId, triggerNodeId, apiKey, baseId, tableId, viewName, filterFormula, maxRecords, triggerOnUpdate, workspaceId);
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
        eventType: cfg.eventType,
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
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 1} * * * *` }),
    jobPrefix: "gcal",
    run: async ({ automationId, triggerNodeId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery }) => {
      await pollCalendar(automationId, triggerNodeId, credentialId, workspaceId, calendarId, minutesBefore, filterQuery);
    },
  },

  google_sheets_trigger: {
    triggerName: "google_sheets_trigger",
    required: ["spreadsheetId", "credentialId"],
    extract: (cfg, automation) => ({
      cfg: {
        credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(),
        spreadsheetId: cfg.spreadsheetId, range: cfg.range, hasHeader: cfg.hasHeader,
      },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "gsheets",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollGoogleSheets(automationId, triggerNodeId, cfg); },
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
        folder: cfg.folder, subjectFilter: cfg.subjectFilter, onlyUnread: cfg.onlyUnread,
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
      cfg: { apiToken: cfg.apiToken, watchType: cfg.watchType || cfg.entityType, stageFilter: cfg.stageFilter },
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
        teamId: cfg.teamId, channelId: cfg.channelId, keywordFilter: cfg.keywordFilter,
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
      cfg: { boardId: cfg.boardId, apiKey: cfg.apiKey, token: cfg.token, watchType: cfg.watchType, listFilter: cfg.listFilter },
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
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 15} * * * *` }),
    jobPrefix: "yt",
    run: async ({ automationId, triggerNodeId, credentialId, workspaceId, channelId, maxResults }) => {
      await pollChannel(automationId, triggerNodeId, credentialId, workspaceId, channelId, maxResults);
    },
  },

  producthunt_trigger: {
    triggerName: "producthunt_trigger",
    required: [],
    extract: (cfg) => ({
      cfg: { apiKey: cfg.apiKey, category: cfg.category, minVotes: cfg.minVotes },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 60} * * * *` }),
    jobPrefix: "ph",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollProductHunt(automationId, triggerNodeId, cfg); },
  },

  mastodon_trigger: {
    triggerName: "mastodon_trigger",
    required: ["instanceUrl", "accessToken"],
    extract: (cfg) => ({
      cfg: { instanceUrl: cfg.instanceUrl, accessToken: cfg.accessToken, notificationTypes: cfg.notificationTypes },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "mastodon",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollMastodon(automationId, triggerNodeId, cfg); },
  },

  virustotal_trigger: {
    triggerName: "virustotal_trigger",
    required: ["apiKey", "scanTarget"],
    extract: (cfg) => ({
      cfg: { apiKey: cfg.apiKey, scanTarget: cfg.scanTarget, scanType: cfg.scanType || "file" },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 60} * * * *` }),
    jobPrefix: "vt",
    run: async ({ automationId, triggerNodeId, cfg }) => { await pollVirusTotal(automationId, triggerNodeId, cfg); },
  },

  google_forms_trigger: {
    triggerName: "google_forms_trigger",
    required: ["credentialId", "formId"],
    extract: (cfg, automation) => ({
      cfg: { credentialId: cfg.credentialId, workspaceId: automation.workspaceId, formId: cfg.formId },
    }),
    repeat: (cfg) => ({ pattern: `*/${parseInt(cfg.pollIntervalMinutes) || 5} * * * *` }),
    jobPrefix: "gforms",
    run: async ({ automationId, cfg }) => { await pollGoogleForms(automationId, cfg); },
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
