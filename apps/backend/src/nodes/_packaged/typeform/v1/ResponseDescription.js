/**
 * TYPEFORM — Response resource. listResponses / getResponse / deleteResponse
 * preserved verbatim from the monolith; countResponses, listWebhooks,
 * createWebhook, deleteWebhook added for parity with n8n's Typeform surface.
 * Handlers receive (config, client).
 */

async function opListResponses(config, client) {
  if (!config.formId) return { success: false, error: "Typeform listResponses: 'formId' is required.", skipped: true };
  const params = { page_size: Math.min(Number(config.pageSize ?? 25), 1000) };
  if (config.since) params.since = config.since;
  if (config.includeHidden) params.fields = "hidden";
  const res = await client.get(`/forms/${encodeURIComponent(config.formId)}/responses`, { params });
  return {
    items: res.data.items ?? [],
    total_items: res.data.total_items ?? 0,
    page_count: res.data.page_count ?? 0,
  };
}

async function opGetResponse(config, client) {
  if (!config.formId) return { success: false, error: "Typeform getResponse: 'formId' is required.", skipped: true };
  if (!config.responseToken) return { success: false, error: "Typeform getResponse: 'responseToken' is required.", skipped: true };
  const res = await client.get(`/forms/${encodeURIComponent(config.formId)}/responses`, {
    params: { included_tokens: config.responseToken },
  });
  const items = res.data.items ?? [];
  const match = items.find((r) => r.token === config.responseToken);
  return match ?? { items, total_items: res.data.total_items };
}

async function opDeleteResponse(config, client) {
  if (!config.formId) return { success: false, error: "Typeform deleteResponse: 'formId' is required.", skipped: true };
  if (!config.responseToken) return { success: false, error: "Typeform deleteResponse: 'responseToken' is required.", skipped: true };
  await client.del(`/forms/${encodeURIComponent(config.formId)}/responses`, {
    params: { included_tokens: config.responseToken },
  });
  return { deleted: true, formId: config.formId, token: config.responseToken };
}

async function opCountResponses(config, client) {
  if (!config.formId) return { success: false, error: "Typeform countResponses: 'formId' is required.", skipped: true };
  const params = { page_size: 1 };
  if (config.since) params.since = config.since;
  const res = await client.get(`/forms/${encodeURIComponent(config.formId)}/responses`, { params });
  return { formId: config.formId, total_items: res.data.total_items ?? 0, page_count: res.data.page_count ?? 0 };
}

async function opListWebhooks(config, client) {
  if (!config.formId) return { success: false, error: "Typeform listWebhooks: 'formId' is required.", skipped: true };
  const res = await client.get(`/forms/${encodeURIComponent(config.formId)}/webhooks`);
  return { items: res.data.items ?? [] };
}

async function opCreateWebhook(config, client) {
  if (!config.formId) return { success: false, error: "Typeform createWebhook: 'formId' is required.", skipped: true };
  if (!config.tag) return { success: false, error: "Typeform createWebhook: 'tag' is required.", skipped: true };
  if (!config.webhookUrl) return { success: false, error: "Typeform createWebhook: 'webhookUrl' is required.", skipped: true };
  const body = {
    url: config.webhookUrl,
    enabled: config.enabled === false ? false : true,
  };
  if (config.secret) body.secret = config.secret;
  if (config.verifySsl !== undefined) body.verify_ssl = config.verifySsl !== false;
  const res = await client.put(`/forms/${encodeURIComponent(config.formId)}/webhooks/${encodeURIComponent(config.tag)}`, body);
  return { created: true, formId: config.formId, tag: config.tag, id: res.data?.id, url: res.data?.url, enabled: res.data?.enabled };
}

async function opDeleteWebhook(config, client) {
  if (!config.formId) return { success: false, error: "Typeform deleteWebhook: 'formId' is required.", skipped: true };
  if (!config.tag) return { success: false, error: "Typeform deleteWebhook: 'tag' is required.", skipped: true };
  await client.del(`/forms/${encodeURIComponent(config.formId)}/webhooks/${encodeURIComponent(config.tag)}`);
  return { deleted: true, formId: config.formId, tag: config.tag };
}

export const responseOperations = {
  listResponses: opListResponses,
  getResponse: opGetResponse,
  deleteResponse: opDeleteResponse,
  countResponses: opCountResponses,
  listWebhooks: opListWebhooks,
  createWebhook: opCreateWebhook,
  deleteWebhook: opDeleteWebhook,
};
