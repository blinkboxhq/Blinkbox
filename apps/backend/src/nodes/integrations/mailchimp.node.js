/**
 * MAILCHIMP NODE
 *
 * Operations:
 *   listCampaigns    — List campaigns with optional status filter (default)
 *   getCampaign      — Get a single campaign by ID
 *   sendCampaign     — Send a ready campaign
 *   listAudiences    — List all audiences/lists
 *   listSubscribers  — List members of an audience
 *   addSubscriber    — Add or subscribe a contact to an audience
 *   updateSubscriber — Update a member's status or merge fields
 *
 * Auth: Mailchimp API key in vault (format: key-dcXX)
 * Basic Auth: anystring:apikey — NOT Bearer token
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { createHash } from "crypto";

async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Mailchimp");
}

function handleError(err) {
  if (err.message.startsWith("Mailchimp")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.detail || err.response?.data?.errors?.[0]?.message || err.message;
  const title = err.response?.data?.title || "";
  if (status === 401) throw new Error("Mailchimp: Invalid API key.");
  if (status === 403) throw new Error(`Mailchimp: Forbidden — ${detail}`);
  if (status === 404) throw new Error(`Mailchimp: Resource not found — ${detail}`);
  if (status === 400) throw new Error(`Mailchimp: Bad request — ${title}: ${detail}`);
  if (status === 429) throw new Error("Mailchimp: Rate limit exceeded. Retry later.");
  throw new Error(`Mailchimp failed: ${status || err.code} — ${err.message}`);
}

function buildClient(apiKey) {
  const dc = apiKey.split("-").pop();
  if (!dc || dc === apiKey) throw new Error("Mailchimp: API key format invalid — expected 'key-dcXX' (e.g. abc123-us6).");
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const auth = { username: "anystring", password: apiKey };
  const headers = { "Content-Type": "application/json" };
  return { base, auth, headers };
}

function emailHash(email) {
  return createHash("md5").update(String(email).toLowerCase().trim()).digest("hex");
}

async function opListCampaigns(config, client) {
  const params = new URLSearchParams({
    count: String(parseInt(config.limit) || 25),
    offset: String(parseInt(config.offset) || 0),
  });
  if (config.status) params.set("status", config.status);
  const { data } = await axios.get(`${client.base}/campaigns?${params}`, {
    auth: client.auth,
    headers: client.headers,
    timeout: 15000,
  });
  return { campaigns: data.campaigns || [], total: data.total_items };
}

async function opGetCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp getCampaign: 'campaignId' is required.", skipped: true };
  const { data } = await axios.get(`${client.base}/campaigns/${encodeURIComponent(id)}`, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return data;
}

async function opSendCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp sendCampaign: 'campaignId' is required.", skipped: true };
  await axios.post(`${client.base}/campaigns/${encodeURIComponent(id)}/actions/send`, {}, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return { success: true, campaignId: id, sent: true };
}

async function opListAudiences(config, client) {
  const { data } = await axios.get(
    `${client.base}/lists?count=${parseInt(config.limit) || 25}`,
    { auth: client.auth, headers: client.headers, timeout: 10000 },
  );
  return { lists: data.lists || [], total: data.total_items };
}

async function opListSubscribers(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp listSubscribers: 'listId' is required.", skipped: true };
  const params = new URLSearchParams({
    count: String(parseInt(config.limit) || 50),
    status: config.memberStatus || "subscribed",
  });
  const { data } = await axios.get(`${client.base}/lists/${encodeURIComponent(listId)}/members?${params}`, {
    auth: client.auth,
    headers: client.headers,
    timeout: 15000,
  });
  return { members: data.members || [], total: data.total_items };
}

async function opAddSubscriber(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp addSubscriber: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp addSubscriber: 'email' is required.", skipped: true };

  const body = {
    email_address: email,
    status: config.status || "subscribed",
    merge_fields: {},
  };
  if (config.firstName) body.merge_fields.FNAME = config.firstName;
  if (config.lastName) body.merge_fields.LNAME = config.lastName;

  const { data } = await axios.post(`${client.base}/lists/${encodeURIComponent(listId)}/members`, body, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return { id: data.id, email: data.email_address, status: data.status };
}

async function opUpdateSubscriber(config, client) {
  const listId = config.listId;
  const email = config.email;
  if (!listId) return { success: false, error: "Mailchimp updateSubscriber: 'listId' is required.", skipped: true };
  if (!email) return { success: false, error: "Mailchimp updateSubscriber: 'email' is required.", skipped: true };

  const hash = emailHash(email);
  const body = {};
  if (config.status) body.status = config.status;
  const merge = {};
  if (config.firstName) merge.FNAME = config.firstName;
  if (config.lastName) merge.LNAME = config.lastName;
  if (Object.keys(merge).length) body.merge_fields = merge;

  const { data } = await axios.patch(`${client.base}/lists/${encodeURIComponent(listId)}/members/${hash}`, body, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return { id: data.id, email: data.email_address, status: data.status };
}

const OPERATIONS = {
  listCampaigns: opListCampaigns,
  getCampaign: opGetCampaign,
  sendCampaign: opSendCampaign,
  listAudiences: opListAudiences,
  listSubscribers: opListSubscribers,
  addSubscriber: opAddSubscriber,
  updateSubscriber: opUpdateSubscriber,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listCampaigns";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Mailchimp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      return { success: false, error: "Mailchimp: No credential selected — pick a Mailchimp API key credential.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Mailchimp: Could not resolve credential — ${e.message}`, skipped: true };
    }

    let client;
    try {
      client = buildClient(apiKey);
    } catch (err) {
      throw err;
    }

    try {
      return await handler(config, client);
    } catch (err) {
      handleError(err);
    }
  },
};
