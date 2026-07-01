/**
 * Datadog — Incidents (API v2).
 */
import { skip, need, num } from "../GenericFunctions.js";

async function opListIncidents(config, { v2 }) {
  const { data } = await v2.get("/incidents", { params: { "page[size]": num(config.limit, 25) } });
  return { success: true, incidents: data.data, count: data.data?.length || 0 };
}

async function opGetIncident(config, { v2 }) {
  const e = need(config, "incidentId", "getIncident"); if (e) return e;
  const { data } = await v2.get(`/incidents/${encodeURIComponent(config.incidentId)}`);
  return { success: true, ...data.data };
}

async function opCreateIncident(config, { v2 }) {
  const e = need(config, "title", "createIncident"); if (e) return e;
  const attributes = { title: config.title, customer_impacted: config.customerImpacted === true };
  if (config.severity) attributes.fields = { severity: { type: "dropdown", value: config.severity } };
  const { data } = await v2.post("/incidents", { data: { type: "incidents", attributes } });
  return { success: true, ...data.data };
}

async function opUpdateIncident(config, { v2 }) {
  const e = need(config, "incidentId", "updateIncident"); if (e) return e;
  const attributes = {};
  if (config.title) attributes.title = config.title;
  if (config.status) attributes.fields = { state: { type: "dropdown", value: config.status } };
  if (Object.keys(attributes).length === 0) return skip("updateIncident", "provide a field to update.");
  const { data } = await v2.patch(`/incidents/${encodeURIComponent(config.incidentId)}`, {
    data: { id: config.incidentId, type: "incidents", attributes },
  });
  return { success: true, ...data.data };
}

export const incidentOperations = {
  listIncidents: opListIncidents,
  getIncident: opGetIncident,
  createIncident: opCreateIncident,
  updateIncident: opUpdateIncident,
};
