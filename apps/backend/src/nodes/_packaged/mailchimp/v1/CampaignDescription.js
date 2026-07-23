/**
 * Mailchimp — Campaign resource. List, get, create, update, delete, send,
 * sendTest, schedule, unschedule, pause, resume, replicate, getContent,
 * setContent. Handlers receive `(config, client)`.
 */
import { req } from "../GenericFunctions.js";

async function opListCampaigns(config, client) {
  const params = {
    count: parseInt(config.limit) || 25,
    offset: parseInt(config.offset) || 0,
  };
  if (config.status) params.status = config.status;
  if (config.listId) params.list_id = config.listId;
  if (config.sortField) params.sort_field = config.sortField;
  if (config.sortDir) params.sort_dir = config.sortDir;
  const data = await req(client, "get", "/campaigns", { params });
  return { campaigns: data.campaigns || [], total: data.total_items };
}

async function opGetCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp getCampaign: 'campaignId' is required.", skipped: true };
  return req(client, "get", `/campaigns/${encodeURIComponent(id)}`, { timeout: 120000 });
}

async function opCreateCampaign(config, client) {
  const listId = config.listId;
  if (!listId) return { success: false, error: "Mailchimp createCampaign: 'listId' is required.", skipped: true };
  const body = {
    type: config.campaignType || "regular",
    recipients: { list_id: listId, ...(config.segmentId ? { segment_opts: { saved_segment_id: Number(config.segmentId) } } : {}) },
    settings: {
      subject_line: config.subject || "",
      title: config.title || config.subject || "Untitled",
      from_name: config.fromName || "",
      reply_to: config.replyTo || "",
      ...(config.previewText ? { preview_text: config.previewText } : {}),
      ...(config.toName ? { to_name: config.toName } : {}),
    },
  };
  const data = await req(client, "post", "/campaigns", { body, timeout: 120000 });
  return { id: data.id, webId: data.web_id, status: data.status, type: data.type };
}

async function opUpdateCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp updateCampaign: 'campaignId' is required.", skipped: true };
  const settings = {};
  if (config.subject) settings.subject_line = config.subject;
  if (config.title) settings.title = config.title;
  if (config.fromName) settings.from_name = config.fromName;
  if (config.replyTo) settings.reply_to = config.replyTo;
  if (config.previewText) settings.preview_text = config.previewText;
  const body = Object.keys(settings).length ? { settings } : {};
  const data = await req(client, "patch", `/campaigns/${encodeURIComponent(id)}`, { body, timeout: 120000 });
  return { id: data.id, status: data.status };
}

async function opDeleteCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp deleteCampaign: 'campaignId' is required.", skipped: true };
  await req(client, "delete", `/campaigns/${encodeURIComponent(id)}`, { timeout: 120000 });
  return { success: true, campaignId: id, deleted: true };
}

async function opSendCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp sendCampaign: 'campaignId' is required.", skipped: true };
  await req(client, "post", `/campaigns/${encodeURIComponent(id)}/actions/send`, { body: {}, timeout: 120000 });
  return { success: true, campaignId: id, sent: true };
}

async function opSendTestCampaign(config, client) {
  const id = config.campaignId;
  const emails = String(config.testEmails || config.email || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!id) return { success: false, error: "Mailchimp sendTestCampaign: 'campaignId' is required.", skipped: true };
  if (emails.length === 0) return { success: false, error: "Mailchimp sendTestCampaign: 'testEmails' (comma-separated) are required.", skipped: true };
  await req(client, "post", `/campaigns/${encodeURIComponent(id)}/actions/test`, {
    body: { test_emails: emails, send_type: config.sendType || "html" },
    timeout: 120000,
  });
  return { success: true, campaignId: id, testSent: emails };
}

async function opScheduleCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp scheduleCampaign: 'campaignId' is required.", skipped: true };
  if (!config.scheduleTime) return { success: false, error: "Mailchimp scheduleCampaign: 'scheduleTime' (ISO datetime) is required.", skipped: true };
  await req(client, "post", `/campaigns/${encodeURIComponent(id)}/actions/schedule`, {
    body: { schedule_time: config.scheduleTime },
    timeout: 120000,
  });
  return { success: true, campaignId: id, scheduledFor: config.scheduleTime };
}

async function opUnscheduleCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp unscheduleCampaign: 'campaignId' is required.", skipped: true };
  await req(client, "post", `/campaigns/${encodeURIComponent(id)}/actions/unschedule`, { body: {}, timeout: 120000 });
  return { success: true, campaignId: id, unscheduled: true };
}

async function opPauseCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp pauseCampaign: 'campaignId' is required.", skipped: true };
  await req(client, "post", `/campaigns/${encodeURIComponent(id)}/actions/pause`, { body: {}, timeout: 120000 });
  return { success: true, campaignId: id, paused: true };
}

async function opResumeCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp resumeCampaign: 'campaignId' is required.", skipped: true };
  await req(client, "post", `/campaigns/${encodeURIComponent(id)}/actions/resume`, { body: {}, timeout: 120000 });
  return { success: true, campaignId: id, resumed: true };
}

async function opReplicateCampaign(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp replicateCampaign: 'campaignId' is required.", skipped: true };
  const data = await req(client, "post", `/campaigns/${encodeURIComponent(id)}/actions/replicate`, { body: {}, timeout: 120000 });
  return { id: data.id, webId: data.web_id, status: data.status, replicatedFrom: id };
}

async function opGetCampaignContent(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp getCampaignContent: 'campaignId' is required.", skipped: true };
  return req(client, "get", `/campaigns/${encodeURIComponent(id)}/content`, { timeout: 120000 });
}

async function opSetCampaignContent(config, client) {
  const id = config.campaignId;
  if (!id) return { success: false, error: "Mailchimp setCampaignContent: 'campaignId' is required.", skipped: true };
  const body = {};
  if (config.html) body.html = config.html;
  if (config.plainText) body.plain_text = config.plainText;
  if (config.templateId) body.template = { id: Number(config.templateId) };
  if (Object.keys(body).length === 0) return { success: false, error: "Mailchimp setCampaignContent: provide 'html', 'plainText', or 'templateId'.", skipped: true };
  const data = await req(client, "put", `/campaigns/${encodeURIComponent(id)}/content`, { body, timeout: 120000 });
  return { success: true, campaignId: id, plainText: data.plain_text ? true : false };
}

export const campaignOperations = {
  listCampaigns: opListCampaigns,
  getCampaign: opGetCampaign,
  createCampaign: opCreateCampaign,
  updateCampaign: opUpdateCampaign,
  deleteCampaign: opDeleteCampaign,
  sendCampaign: opSendCampaign,
  sendTestCampaign: opSendTestCampaign,
  scheduleCampaign: opScheduleCampaign,
  unscheduleCampaign: opUnscheduleCampaign,
  pauseCampaign: opPauseCampaign,
  resumeCampaign: opResumeCampaign,
  replicateCampaign: opReplicateCampaign,
  getCampaignContent: opGetCampaignContent,
  setCampaignContent: opSetCampaignContent,
};
