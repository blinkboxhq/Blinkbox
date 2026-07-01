/**
 * Calendly — Webhook Subscriptions.
 */
import { skip, need, me, csv, pageParams, uuidOf } from "../GenericFunctions.js";

async function opListWebhooks(config, { api }) {
  const u = await me(api);
  const params = { scope: config.scope || "user", ...pageParams(config) };
  params.organization = config.organizationUri || u.current_organization;
  if ((config.scope || "user") === "user") params.user = config.userUri || u.uri;
  const { data } = await api.get("/webhook_subscriptions", { params });
  return { success: true, webhooks: data.collection, pagination: data.pagination };
}

async function opGetWebhook(config, { api }) {
  const g = need(config, "webhookUri", "getWebhook"); if (g) return g;
  const { data } = await api.get(`/webhook_subscriptions/${uuidOf(config.webhookUri)}`);
  return { success: true, ...data.resource };
}

async function opCreateWebhook(config, { api }) {
  const g = need(config, "url", "createWebhook"); if (g) return g;
  if (!/^https:\/\//i.test(config.url)) return skip("createWebhook", "'url' must be an https:// endpoint.");
  const events = csv(config.events).length ? csv(config.events) : ["invitee.created", "invitee.canceled"];
  const u = await me(api);
  const scope = config.scope || "user";
  const body = { url: config.url, events, organization: config.organizationUri || u.current_organization, scope };
  if (scope === "user") body.user = config.userUri || u.uri;
  if (config.signingKey) body.signing_key = config.signingKey;
  const { data } = await api.post("/webhook_subscriptions", body);
  return { success: true, ...data.resource };
}

async function opDeleteWebhook(config, { api }) {
  const g = need(config, "webhookUri", "deleteWebhook"); if (g) return g;
  await api.delete(`/webhook_subscriptions/${uuidOf(config.webhookUri)}`);
  return { success: true, deleted: config.webhookUri };
}

export const webhookOperations = {
  listWebhooks: opListWebhooks,
  getWebhook: opGetWebhook,
  createWebhook: opCreateWebhook,
  deleteWebhook: opDeleteWebhook,
};
