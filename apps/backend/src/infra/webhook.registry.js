/**
 * Generic Webhook Auto-Registrar
 *
 * One spec table + one register/unregister driver for every app whose native
 * webhook API lets us create a subscription per automation. Each app declares:
 *   - resolveToken(cfg, workspaceId) → the bearer/API token to call the app with
 *   - create(ctx)  → { method, url, headers, body } to POST to create the webhook
 *   - extractId(responseJson) → the app's webhook id (for later deletion)
 *   - deletePath(ctx) → the app path to DELETE the webhook
 *   - secretKey    → which config key the inbound controller reads to verify sigs
 *   - genSecret    → whether the driver mints an HMAC secret we control
 *
 * The lifecycle (create → store {webhookId, secret, webhookRegistered:true} into
 * the trigger node config → delete + clear on teardown) is identical for all, so
 * it lives once in registerWebhook / unregisterWebhook below.
 *
 * Apps with a challenge/handshake instead of a stored HMAC secret (asana
 * X-Hook-Secret, figma passcode, monday challenge) set genSecret:false and rely
 * on the inbound controller's per-app handling.
 */

import crypto from "crypto";
import { BACKEND_URL, GOOGLE_PUBSUB_TOPIC, PUBSUB_PUSH_TOKEN } from "../config/env.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

function webhookUrl(automationId) {
  return `${BACKEND_URL}/webhook/${automationId}`;
}

// Token resolvers — how each app authenticates the management API call.
const oauth = (label) => (cfg, workspaceId) => getOAuthToken(cfg.credentialId, workspaceId, label);
const raw = (field) => (cfg) => cfg[field];

/**
 * WEBHOOK_APPS: one entry per registerable trigger type.
 * ctx passed to create/deletePath/extractId: { url, secret, cfg, token, automationId }
 */
export const WEBHOOK_APPS = {
  gitlab_trigger: {
    resolveToken: raw("token"),
    secretKey: "gitlabWebhookSecret",
    genSecret: true,
    create: ({ url, secret, cfg, token }) => ({
      method: "POST",
      url: `${cfg.host || "https://gitlab.com"}/api/v4/projects/${encodeURIComponent(cfg.projectId)}/hooks`,
      headers: { "PRIVATE-TOKEN": token, "Content-Type": "application/json" },
      body: {
        url,
        token: secret,
        push_events: true,
        issues_events: true,
        merge_requests_events: true,
        enable_ssl_verification: true,
      },
    }),
    extractId: (j) => j.id,
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `${cfg.host || "https://gitlab.com"}/api/v4/projects/${encodeURIComponent(cfg.projectId)}/hooks/${webhookId}`,
      headers: { "PRIVATE-TOKEN": token },
    }),
  },

  calendly_trigger: {
    resolveToken: oauth("Calendly trigger"),
    secretKey: "calendlyWebhookSecret",
    genSecret: true,
    create: ({ url, secret, cfg, token }) => ({
      method: "POST",
      url: "https://api.calendly.com/webhook_subscriptions",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        url,
        events: ["invitee.created", "invitee.canceled"],
        organization: cfg.organization,
        scope: cfg.organization ? "organization" : "user",
        ...(cfg.user ? { user: cfg.user } : {}),
        signing_key: secret,
      },
    }),
    extractId: (j) => j.resource?.uri,
    deletePath: ({ webhookId, token }) => ({
      method: "DELETE",
      url: webhookId,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  clickup_trigger: {
    resolveToken: oauth("ClickUp trigger"),
    secretKey: "clickupWebhookSecret",
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: `https://api.clickup.com/api/v2/team/${cfg.teamId || cfg.workspaceId}/webhook`,
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: {
        endpoint: url,
        events: ["taskCreated", "taskUpdated", "taskStatusUpdated", "taskDeleted"],
        ...(cfg.listId ? { list_id: cfg.listId } : {}),
      },
    }),
    extractId: (j) => j.id,
    storeExtra: (j) => ({ clickupWebhookSecret: j.webhook?.secret }),
    deletePath: ({ webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.clickup.com/api/v2/webhook/${webhookId}`,
      headers: { Authorization: token },
    }),
  },

  zendesk_trigger: {
    resolveToken: oauth("Zendesk trigger"),
    secretKey: "zendeskWebhookSecret",
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: `https://${cfg.subdomain}.zendesk.com/api/v2/webhooks`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        webhook: {
          name: "BlinkBox",
          status: "active",
          endpoint: url,
          http_method: "POST",
          request_format: "json",
          subscriptions: ["conditional_ticket_events"],
        },
      },
    }),
    extractId: (j) => j.webhook?.id,
    storeExtra: (j) => ({ zendeskWebhookSecret: j.webhook?.signing_secret?.secret }),
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://${cfg.subdomain}.zendesk.com/api/v2/webhooks/${webhookId}`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  woocommerce_trigger: {
    resolveToken: oauth("WooCommerce trigger"),
    secretKey: "woocommerceWebhookSecret",
    genSecret: true,
    create: ({ url, secret, cfg, token }) => ({
      method: "POST",
      url: `${cfg.storeUrl.replace(/\/$/, "")}/wp-json/wc/v3/webhooks`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        name: "BlinkBox",
        topic: cfg.topic || "order.created",
        delivery_url: url,
        secret,
        status: "active",
      },
    }),
    extractId: (j) => j.id,
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `${cfg.storeUrl.replace(/\/$/, "")}/wp-json/wc/v3/webhooks/${webhookId}?force=true`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  pipedrive_trigger: {
    resolveToken: raw("apiToken"),
    secretKey: null,
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: `https://api.pipedrive.com/v1/webhooks?api_token=${encodeURIComponent(token)}`,
      headers: { "Content-Type": "application/json" },
      body: {
        subscription_url: url,
        event_action: "*",
        event_object: cfg.eventObject || "*",
      },
    }),
    extractId: (j) => j.data?.id,
    deletePath: ({ webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.pipedrive.com/v1/webhooks/${webhookId}?api_token=${encodeURIComponent(token)}`,
    }),
  },

  pagerduty_trigger: {
    resolveToken: oauth("PagerDuty trigger"),
    secretKey: "pagerdutyWebhookSecret",
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: "https://api.pagerduty.com/webhook_subscriptions",
      headers: {
        Authorization: `Token token=${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pagerduty+json;version=2",
      },
      body: {
        webhook_subscription: {
          type: "webhook_subscription",
          delivery_method: { type: "http_delivery_method", url },
          events: ["incident.triggered", "incident.acknowledged", "incident.resolved"],
          filter: cfg.serviceId
            ? { type: "service_reference", id: cfg.serviceId }
            : { type: "account_reference" },
        },
      },
    }),
    extractId: (j) => j.webhook_subscription?.id,
    storeExtra: (j) => ({ pagerdutyWebhookSecret: j.webhook_subscription?.delivery_method?.secret }),
    deletePath: ({ webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.pagerduty.com/webhook_subscriptions/${webhookId}`,
      headers: {
        Authorization: `Token token=${token}`,
        Accept: "application/vnd.pagerduty+json;version=2",
      },
    }),
  },

  vercel_trigger: {
    resolveToken: oauth("Vercel trigger"),
    secretKey: "vercelWebhookSecret",
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: `https://api.vercel.com/v1/webhooks${cfg.teamId ? `?teamId=${cfg.teamId}` : ""}`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        url,
        events: ["deployment.created", "deployment.succeeded", "deployment.error", "deployment.canceled"],
        ...(cfg.projectId ? { projectIds: [cfg.projectId] } : {}),
      },
    }),
    extractId: (j) => j.id,
    storeExtra: (j) => ({ vercelWebhookSecret: j.secret }),
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.vercel.com/v1/webhooks/${webhookId}${cfg.teamId ? `?teamId=${cfg.teamId}` : ""}`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  netlify_trigger: {
    resolveToken: oauth("Netlify trigger"),
    secretKey: "netlifyWebhookSecret",
    genSecret: true,
    create: ({ url, secret, cfg, token }) => ({
      method: "POST",
      url: "https://api.netlify.com/api/v1/hooks",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        site_id: cfg.siteId,
        type: "url",
        event: cfg.event || "deploy_created",
        data: { url, signature_secret: secret },
      },
    }),
    extractId: (j) => j.id,
    deletePath: ({ webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.netlify.com/api/v1/hooks/${webhookId}`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  airtable_trigger: {
    resolveToken: raw("apiKey"),
    secretKey: "airtableWebhookSecret",
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: `https://api.airtable.com/v0/bases/${cfg.baseId}/webhooks`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        notificationUrl: url,
        specification: {
          options: {
            filters: {
              dataTypes: ["tableData"],
              ...(cfg.tableId ? { recordChangeScope: cfg.tableId } : {}),
            },
          },
        },
      },
    }),
    extractId: (j) => j.id,
    storeExtra: (j) => ({ airtableWebhookSecret: j.macSecretBase64 }),
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.airtable.com/v0/bases/${cfg.baseId}/webhooks/${webhookId}`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  jira_trigger: {
    resolveToken: (cfg) => `${cfg.email}:${cfg.token}`,
    secretKey: null,
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: `https://${cfg.domain}/rest/api/3/webhook`,
      headers: {
        Authorization: `Basic ${Buffer.from(token).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: {
        url,
        webhooks: [
          {
            events: ["jira:issue_created", "jira:issue_updated"],
            jqlFilter: cfg.jql || "created >= -1d",
          },
        ],
      },
    }),
    extractId: (j) => j.webhookRegistrationResult?.[0]?.createdWebhookId,
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://${cfg.domain}/rest/api/3/webhook`,
      headers: {
        Authorization: `Basic ${Buffer.from(token).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: { webhookIds: [Number(webhookId)] },
    }),
  },

  asana_trigger: {
    resolveToken: raw("token"),
    secretKey: "asanaWebhookSecret",
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: "https://app.asana.com/api/1.0/webhooks",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: { data: { resource: cfg.projectId || cfg.projectGid, target: url } },
    }),
    extractId: (j) => j.data?.gid,
    deletePath: ({ webhookId, token }) => ({
      method: "DELETE",
      url: `https://app.asana.com/api/1.0/webhooks/${webhookId}`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  figma_trigger: {
    resolveToken: raw("token"),
    secretKey: "figmaWebhookPasscode",
    genSecret: true,
    create: ({ url, secret, cfg, token }) => ({
      method: "POST",
      url: "https://api.figma.com/v2/webhooks",
      headers: { "X-Figma-Token": token, "Content-Type": "application/json" },
      body: {
        event_type: cfg.eventType === "file_comment" ? "FILE_COMMENT" : "FILE_UPDATE",
        team_id: cfg.teamId,
        endpoint: url,
        passcode: secret,
      },
    }),
    extractId: (j) => j.id,
    deletePath: ({ webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.figma.com/v2/webhooks/${webhookId}`,
      headers: { "X-Figma-Token": token },
    }),
  },

  monday_trigger: {
    resolveToken: oauth("Monday trigger"),
    secretKey: null,
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: "https://api.monday.com/v2",
      headers: { Authorization: token, "Content-Type": "application/json" },
      graphql: {
        query: `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
          create_webhook (board_id: $boardId, url: $url, event: $event) { id board_id }
        }`,
        variables: {
          boardId: String(cfg.boardId),
          url,
          event: cfg.event || "create_item",
        },
      },
    }),
    extractId: (j) => j.data?.create_webhook?.id,
    deletePath: ({ webhookId, token }) => ({
      method: "POST",
      url: "https://api.monday.com/v2",
      headers: { Authorization: token, "Content-Type": "application/json" },
      graphql: {
        query: `mutation ($id: ID!) { delete_webhook (id: $id) { id } }`,
        variables: { id: String(webhookId) },
      },
    }),
  },

  mailchimp_trigger: {
    // Mailchimp signs nothing — it verifies ownership via a secret in the URL
    // query string. We append ?bbsecret=<secret> and check it on delivery.
    resolveToken: oauth("Mailchimp trigger"),
    secretKey: "mailchimpWebhookSecret",
    genSecret: true,
    create: ({ url, secret, cfg, token }) => ({
      method: "POST",
      url: `https://${(cfg.dc || (cfg.credentialId && cfg.dc) || "us1")}.api.mailchimp.com/3.0/lists/${cfg.listId}/webhooks`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        url: `${url}?bbsecret=${secret}`,
        events: { subscribe: true, unsubscribe: true, profile: true, cleaned: true, upemail: true, campaign: true },
        sources: { user: true, admin: true, api: true },
      },
    }),
    extractId: (j) => j.id,
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://${cfg.dc || "us1"}.api.mailchimp.com/3.0/lists/${cfg.listId}/webhooks/${webhookId}`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  azure_devops_trigger: {
    resolveToken: raw("pat"),
    secretKey: null,
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: `https://dev.azure.com/${cfg.organization}/_apis/hooks/subscriptions?api-version=7.1`,
      headers: {
        Authorization: `Basic ${Buffer.from(`:${token}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: {
        publisherId: "tfs",
        eventType: cfg.eventType || "workitem.created",
        resourceVersion: "1.0",
        consumerId: "webHooks",
        consumerActionId: "httpRequest",
        publisherInputs: { projectId: cfg.project },
        consumerInputs: { url },
      },
    }),
    extractId: (j) => j.id,
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://dev.azure.com/${cfg.organization}/_apis/hooks/subscriptions/${webhookId}?api-version=7.1`,
      headers: { Authorization: `Basic ${Buffer.from(`:${token}`).toString("base64")}` },
    }),
  },

  trello_trigger: {
    resolveToken: (cfg) => ({ key: cfg.apiKey, token: cfg.token }),
    secretKey: null,
    genSecret: false,
    create: ({ url, cfg, token }) => ({
      method: "POST",
      url: `https://api.trello.com/1/webhooks/?key=${encodeURIComponent(token.key)}&token=${encodeURIComponent(token.token)}`,
      headers: { "Content-Type": "application/json" },
      body: { callbackURL: url, idModel: cfg.boardId, description: "BlinkBox" },
    }),
    extractId: (j) => j.id,
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.trello.com/1/webhooks/${webhookId}?key=${encodeURIComponent(token.key)}&token=${encodeURIComponent(token.token)}`,
    }),
  },

  jotform_trigger: {
    resolveToken: oauth("Jotform trigger"),
    secretKey: "jotformWebhookSecret",
    genSecret: true,
    // Jotform sends no signature header — secret rides the callback URL as ?s= and is checked on receive
    create: ({ url, secret, cfg, token }) => ({
      method: "POST",
      url: `https://api.jotform.com/form/${encodeURIComponent(cfg.formId)}/webhooks`,
      headers: { APIKEY: token, "Content-Type": "application/x-www-form-urlencoded" },
      form: { webhookURL: `${url}?s=${secret}` },
    }),
    // content is an index→URL map; the new hook is the highest index
    extractId: (j) => {
      const keys = Object.keys(j.content || {});
      return keys.length ? keys[keys.length - 1] : undefined;
    },
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://api.jotform.com/form/${encodeURIComponent(cfg.formId)}/webhooks/${webhookId}`,
      headers: { APIKEY: token },
    }),
  },

  // Graph/Drive push notifications carry no payload — they wake the receive
  // path, which re-runs the node's normal poll check (pushPollType). Both are
  // `optional`: registration fails on non-HTTPS/localhost, and the activation
  // controller must fall back to polling instead of failing the activation.
  outlook_trigger: {
    optional: true,
    resolveToken: oauth("Outlook trigger"),
    secretKey: "outlookWebhookSecret",
    genSecret: true,
    // resource is all messages — folder/sender filters are applied by the poll
    // check itself, so the subscription never needs recreating on config edits
    create: ({ url, secret, token }) => ({
      method: "POST",
      url: "https://graph.microsoft.com/v1.0/subscriptions",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        changeType: "created",
        notificationUrl: url,
        resource: "me/messages",
        expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(),
        clientState: secret,
      },
    }),
    extractId: (j) => j.id,
    storeExtra: () => ({ pushPollType: "outlook_trigger" }),
    deletePath: ({ webhookId, token }) => ({
      method: "DELETE",
      url: `https://graph.microsoft.com/v1.0/subscriptions/${webhookId}`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  google_sheets_trigger: {
    optional: true,
    resolveToken: oauth("Google Sheets trigger"),
    secretKey: "sheetsWebhookSecret",
    genSecret: true,
    create: ({ url, secret, cfg, token, automationId }) => ({
      method: "POST",
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(cfg.spreadsheetId)}/watch`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: {
        id: `bb-${automationId}-${Date.now()}`,
        type: "web_hook",
        address: url,
        token: secret,
        expiration: String(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
    extractId: (j) => j.id,
    // Drive channels cannot be renewed — push.renewal.js swaps in a fresh one
    // before driveExpiresAt; channels/stop needs the resourceId
    storeExtra: (j) => ({
      pushPollType: "google_sheets_trigger",
      driveResourceId: j?.resourceId || "",
      driveExpiresAt: j?.expiration ? Number(j.expiration) : 0,
    }),
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "POST",
      url: "https://www.googleapis.com/drive/v3/channels/stop",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: { id: webhookId, resourceId: cfg.driveResourceId },
    }),
  },

  // Gmail/Forms watches publish to the user's Pub/Sub topic, not to a URL —
  // Pub/Sub pushes to the global /webhook/pubsub/google endpoint (verified by
  // PUBSUB_PUSH_TOKEN there, so no per-node secret). Both are `optional`: when
  // the topic/token env vars are unset, registration throws and polling stays.
  gmail_trigger: {
    optional: true,
    resolveToken: oauth("Gmail trigger"),
    // watch is deliberately unfiltered — with the poller off, a label-only
    // filter would silently drop mail that skips INBOX; the poll check applies
    // the user's query filters instead
    create: ({ token }) => {
      if (!GOOGLE_PUBSUB_TOPIC || !PUBSUB_PUSH_TOKEN) {
        throw new Error("GOOGLE_PUBSUB_TOPIC / PUBSUB_PUSH_TOKEN not configured");
      }
      return {
        method: "POST",
        url: "https://gmail.googleapis.com/gmail/v1/users/me/watch",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: { topicName: GOOGLE_PUBSUB_TOPIC },
      };
    },
    // watch returns no subscription id — historyId stands in; stop needs nothing
    extractId: (j) => j.historyId || "watch",
    storeExtra: (j) => ({ gmailWatchExpiresAt: j?.expiration ? Number(j.expiration) : 0 }),
    deletePath: ({ token }) => ({
      method: "POST",
      url: "https://gmail.googleapis.com/gmail/v1/users/me/stop",
      headers: { Authorization: `Bearer ${token}` },
    }),
  },
  google_forms_trigger: {
    optional: true,
    resolveToken: oauth("Google Forms trigger"),
    // all Forms event variants classify responses at poll time, so the watch
    // eventType is always RESPONSES
    create: ({ cfg, token }) => {
      if (!GOOGLE_PUBSUB_TOPIC || !PUBSUB_PUSH_TOKEN) {
        throw new Error("GOOGLE_PUBSUB_TOPIC / PUBSUB_PUSH_TOKEN not configured");
      }
      return {
        method: "POST",
        url: `https://forms.googleapis.com/v1/forms/${encodeURIComponent(cfg.formId)}/watches`,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: {
          watch: {
            target: { topic: { topicName: GOOGLE_PUBSUB_TOPIC } },
            eventType: "RESPONSES",
          },
        },
      };
    },
    extractId: (j) => j.id,
    storeExtra: (j) => ({ formsWatchExpiresAt: j?.expireTime ? Date.parse(j.expireTime) : 0 }),
    deletePath: ({ cfg, webhookId, token }) => ({
      method: "DELETE",
      url: `https://forms.googleapis.com/v1/forms/${encodeURIComponent(cfg.formId)}/watches/${webhookId}`,
      headers: { Authorization: `Bearer ${token}` },
    }),
  },
};

async function callApi(spec) {
  const body = spec.graphql
    ? JSON.stringify(spec.graphql)
    : spec.form
      ? new URLSearchParams(spec.form).toString()
      : spec.body
        ? JSON.stringify(spec.body)
        : undefined;
  const res = await fetch(spec.url, { method: spec.method, headers: spec.headers || {}, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(`${spec.method} ${spec.url} → ${res.status}: ${JSON.stringify(json.errors || json.message || json).slice(0, 300)}`);
  }
  return json;
}

function findEntryNode(automation, nodeId) {
  const targetId = nodeId || automation.entryNodeId;
  return automation.nodes.find((n) => n.id === targetId);
}

/**
 * Register a webhook for `triggerType` on the given automation node.
 * Stores { <idKey>, [secretKey], webhookRegistered:true } into the node config.
 */
export async function registerWebhook(triggerType, automationId, cfg, workspaceId, nodeId = null) {
  const app = WEBHOOK_APPS[triggerType];
  if (!app) throw new Error(`No webhook registrar for ${triggerType}`);

  const token = await app.resolveToken(cfg, workspaceId);
  if (!token) throw new Error(`${triggerType} requires a connected account / token.`);

  const url = webhookUrl(automationId);
  const secret = app.genSecret ? crypto.randomBytes(24).toString("hex") : null;

  const created = await callApi(app.create({ url, secret, cfg, token, automationId }));
  const webhookId = app.extractId(created);
  if (webhookId === undefined || webhookId === null) {
    throw new Error(`${triggerType} webhook create returned no id.`);
  }

  const idKey = `${triggerType}_webhookId`;
  const extra = app.storeExtra ? app.storeExtra(created) : {};

  const automation = await Automation.findById(automationId);
  if (automation) {
    const entryNode = findEntryNode(automation, nodeId);
    if (entryNode) {
      entryNode.data = entryNode.data || {};
      entryNode.data.config = {
        ...(entryNode.data.config || {}),
        [idKey]: webhookId,
        ...(secret && app.secretKey ? { [app.secretKey]: secret } : {}),
        ...extra,
        webhookRegistered: true,
      };
    }
    await automation.save();
  }

  console.log(`[Webhook] Registered ${triggerType} ${webhookId} for automation ${automationId}`);
  return { webhookId, secret };
}

/**
 * Delete the previously-registered webhook and clear its config keys.
 */
export async function unregisterWebhook(triggerType, automationId, cfg, workspaceId, nodeId = null) {
  const app = WEBHOOK_APPS[triggerType];
  if (!app) return;

  const idKey = `${triggerType}_webhookId`;
  const webhookId = cfg[idKey];
  if (!webhookId) return;

  try {
    const token = await app.resolveToken(cfg, workspaceId);
    await callApi(app.deletePath({ cfg, webhookId, token }));
    console.log(`[Webhook] Deleted ${triggerType} ${webhookId}`);
  } catch (err) {
    if (!/404|not.?found/i.test(err.message)) {
      console.error(`[Webhook] ${triggerType} teardown failed:`, err.message);
    }
  }

  const automation = await Automation.findById(automationId);
  if (automation) {
    const entryNode = findEntryNode(automation, nodeId);
    if (entryNode?.data?.config) {
      delete entryNode.data.config[idKey];
      if (app.secretKey) delete entryNode.data.config[app.secretKey];
      if (app.storeExtra) {
        for (const k of Object.keys(app.storeExtra({}) || {})) delete entryNode.data.config[k];
      }
      entryNode.data.config.webhookRegistered = false;
      await automation.save();
    }
  }
}
