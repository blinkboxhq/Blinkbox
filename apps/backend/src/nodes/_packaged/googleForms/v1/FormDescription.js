/**
 * GOOGLE FORMS — Form resource. getResponses/getForm preserved verbatim from the
 * monolith; getResponse, listWatches, createWatch, deleteWatch, renewWatch added
 * for parity. All ops are formId-scoped (the slim gates formId). Handlers receive
 * (config, client).
 */

async function opGetResponses(config, client) {
  const res = await client.get(`/${config.formId}/responses`);
  const responses = (res.data.responses || []).map((r) => ({ responseId: r.responseId, createTime: r.createTime, answers: r.answers }));
  return { responses, count: responses.length, formId: config.formId };
}

async function opGetResponse(config, client) {
  if (!config.responseId) return { success: false, error: "google_forms getResponse: 'responseId' is required.", skipped: true };
  const res = await client.get(`/${config.formId}/responses/${config.responseId}`);
  return { responseId: res.data.responseId, createTime: res.data.createTime, lastSubmittedTime: res.data.lastSubmittedTime, answers: res.data.answers };
}

async function opGetForm(config, client) {
  const res = await client.get(`/${config.formId}`);
  return { formId: config.formId, title: res.data.info?.title, description: res.data.info?.description, questions: res.data.items?.length || 0 };
}

async function opListWatches(config, client) {
  const res = await client.get(`/${config.formId}/watches`);
  return { watches: (res.data.watches || []).map((w) => ({ id: w.id, eventType: w.eventType, state: w.state, createTime: w.createTime })), count: (res.data.watches || []).length };
}

async function opCreateWatch(config, client) {
  const eventType = config.eventType || "RESPONSES";
  const body = { watch: { target: { topic: { topicName: config.topicName } }, eventType } };
  if (!config.topicName) return { success: false, error: "google_forms createWatch: 'topicName' (Pub/Sub topic) is required.", skipped: true };
  const res = await client.post(`/${config.formId}/watches`, body);
  return { id: res.data.id, eventType: res.data.eventType, state: res.data.state };
}

async function opRenewWatch(config, client) {
  if (!config.watchId) return { success: false, error: "google_forms renewWatch: 'watchId' is required.", skipped: true };
  const res = await client.post(`/${config.formId}/watches/${config.watchId}:renew`, {});
  return { id: res.data.id, state: res.data.state, expireTime: res.data.expireTime };
}

async function opDeleteWatch(config, client) {
  if (!config.watchId) return { success: false, error: "google_forms deleteWatch: 'watchId' is required.", skipped: true };
  await client.del(`/${config.formId}/watches/${config.watchId}`);
  return { formId: config.formId, watchId: config.watchId, deleted: true };
}

export const formOperations = {
  getResponses: opGetResponses,
  getResponse: opGetResponse,
  getForm: opGetForm,
  listWatches: opListWatches,
  createWatch: opCreateWatch,
  renewWatch: opRenewWatch,
  deleteWatch: opDeleteWatch,
};
