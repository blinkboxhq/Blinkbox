/**
 * TYPEFORM — Form resource. listForms / getForm / createForm preserved
 * verbatim from the monolith; updateForm, deleteForm, listWorkspaces added for
 * parity with n8n's Typeform surface. Handlers receive (config, client).
 */
import { parseJson } from "../GenericFunctions.js";

async function opListForms(config, client) {
  const res = await client.get(`/forms`, { params: { page_size: 200 } });
  return { items: res.data.items ?? [], total_items: res.data.total_items ?? 0, page_count: res.data.page_count ?? 0 };
}

async function opGetForm(config, client) {
  if (!config.formId) return { success: false, error: "Typeform getForm: 'formId' is required.", skipped: true };
  const res = await client.get(`/forms/${encodeURIComponent(config.formId)}`);
  return res.data;
}

async function opCreateForm(config, client) {
  if (!config.title) return { success: false, error: "Typeform createForm: 'title' is required.", skipped: true };
  const body = { title: config.title };
  if (config.fields) {
    try {
      body.fields = parseJson(config.fields);
    } catch {
      return { success: false, error: "Typeform createForm: 'fields' must be valid JSON.", skipped: true };
    }
  }
  const res = await client.post(`/forms`, body);
  return { id: res.data.id, title: res.data.title, _links: res.data._links };
}

async function opUpdateForm(config, client) {
  if (!config.formId) return { success: false, error: "Typeform updateForm: 'formId' is required.", skipped: true };
  let body;
  try {
    body = config.formDefinition ? parseJson(config.formDefinition) : {};
  } catch {
    return { success: false, error: "Typeform updateForm: 'formDefinition' must be valid JSON.", skipped: true };
  }
  if (config.title) body.title = config.title;
  const res = await client.put(`/forms/${encodeURIComponent(config.formId)}`, body);
  return { updated: true, formId: config.formId, id: res.data?.id ?? config.formId, title: res.data?.title };
}

async function opDeleteForm(config, client) {
  if (!config.formId) return { success: false, error: "Typeform deleteForm: 'formId' is required.", skipped: true };
  await client.del(`/forms/${encodeURIComponent(config.formId)}`);
  return { deleted: true, formId: config.formId };
}

async function opListWorkspaces(config, client) {
  const params = { page_size: Math.min(Number(config.pageSize ?? 200), 200) };
  if (config.search) params.search = config.search;
  const res = await client.get(`/workspaces`, { params });
  return { items: res.data.items ?? [], total_items: res.data.total_items ?? 0, page_count: res.data.page_count ?? 0 };
}

export const formOperations = {
  listForms: opListForms,
  getForm: opGetForm,
  createForm: opCreateForm,
  updateForm: opUpdateForm,
  deleteForm: opDeleteForm,
  listWorkspaces: opListWorkspaces,
};
