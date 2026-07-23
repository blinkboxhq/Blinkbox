/**
 * SendGrid — Dynamic Template operations: list, get.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth } from "../GenericFunctions.js";

async function opListTemplates(config, token) {
  const response = await axios.get(`${BASE}/templates`, {
    headers: auth(token),
    params: { generations: "dynamic", page_size: Math.min(config.maxResults || 50, 200) },
    timeout: 120000,
  });
  return { templates: response.data.result || response.data.templates || [] };
}

async function opGetTemplate(config, token) {
  if (!config.templateId) return { success: false, error: "SendGrid getTemplate: 'templateId' is required.", skipped: true };
  const response = await axios.get(`${BASE}/templates/${encodeURIComponent(config.templateId)}`, { headers: auth(token), timeout: 120000 });
  return { template: response.data };
}

export const templateOperations = {
  listTemplates: opListTemplates,
  getTemplate: opGetTemplate,
};
