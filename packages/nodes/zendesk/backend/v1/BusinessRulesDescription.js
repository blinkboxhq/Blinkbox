/**
 * Zendesk — Fields / Macros / Views.
 */
import { need, lim, enc } from "../GenericFunctions.js";

async function opListTicketFields(config, { api }) {
  const { data } = await api.get(`/ticket_fields.json`);
  return { success: true, ticket_fields: data.ticket_fields || [] };
}
async function opCreateTicketField(config, { api }) {
  const t = need(config, "fieldType", "createTicketField"); if (t) return t;
  const l = need(config, "title", "createTicketField"); if (l) return l;
  const { data } = await api.post(`/ticket_fields.json`, { ticket_field: { type: config.fieldType, title: config.title } });
  return data.ticket_field;
}
async function opListMacros(config, { api }) {
  const { data } = await api.get(`/macros.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, macros: data.macros || [], count: data.count };
}
async function opApplyMacro(config, { api }) {
  const t = need(config, "ticketId", "applyMacro"); if (t) return t;
  const m = need(config, "macroId", "applyMacro"); if (m) return m;
  const { data } = await api.get(`/tickets/${enc(config.ticketId)}/macros/${enc(config.macroId)}/apply.json`);
  return data.result || data;
}
async function opListViews(config, { api }) {
  const { data } = await api.get(`/views.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, views: data.views || [], count: data.count };
}
async function opExecuteView(config, { api }) {
  const v = need(config, "viewId", "executeView"); if (v) return v;
  const { data } = await api.get(`/views/${enc(config.viewId)}/tickets.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, tickets: data.tickets || [], count: data.count };
}
async function opCountView(config, { api }) {
  const v = need(config, "viewId", "countView"); if (v) return v;
  const { data } = await api.get(`/views/${enc(config.viewId)}/count.json`);
  return { success: true, count: data.view_count?.value ?? data.view_count };
}

export const businessRulesOperations = {
  listTicketFields: opListTicketFields, createTicketField: opCreateTicketField,
  listMacros: opListMacros, applyMacro: opApplyMacro,
  listViews: opListViews, executeView: opExecuteView, countView: opCountView,
};
