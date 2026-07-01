/**
 * Calendly — Routing Forms, Groups (Enterprise) & Data Compliance.
 */
import { need, me, csv, pageParams, uuidOf } from "../GenericFunctions.js";

async function opListRoutingForms(config, { api }) {
  const u = await me(api);
  const { data } = await api.get("/routing_forms", {
    params: { organization: config.organizationUri || u.current_organization, ...pageParams(config) },
  });
  return { success: true, routingForms: data.collection, pagination: data.pagination };
}

async function opGetRoutingForm(config, { api }) {
  const g = need(config, "routingFormUri", "getRoutingForm"); if (g) return g;
  const { data } = await api.get(`/routing_forms/${uuidOf(config.routingFormUri)}`);
  return { success: true, ...data.resource };
}

async function opListRoutingFormSubmissions(config, { api }) {
  const g = need(config, "routingFormUri", "listRoutingFormSubmissions"); if (g) return g;
  const { data } = await api.get("/routing_form_submissions", {
    params: { form: config.routingFormUri, ...pageParams(config) },
  });
  return { success: true, submissions: data.collection, pagination: data.pagination };
}

async function opListGroups(config, { api }) {
  const u = await me(api);
  const { data } = await api.get("/groups", {
    params: { organization: config.organizationUri || u.current_organization, ...pageParams(config) },
  });
  return { success: true, groups: data.collection, pagination: data.pagination };
}

async function opGetGroup(config, { api }) {
  const g = need(config, "groupUri", "getGroup"); if (g) return g;
  const { data } = await api.get(`/groups/${uuidOf(config.groupUri)}`);
  return { success: true, ...data.resource };
}

async function opDeleteInviteeData(config, { api }) {
  const g = need(config, "emails", "deleteInviteeData"); if (g) return g;
  await api.post("/data_compliance/deletion/invitees", { emails: csv(config.emails) });
  return { success: true, requested: csv(config.emails) };
}

export const miscOperations = {
  listRoutingForms: opListRoutingForms,
  getRoutingForm: opGetRoutingForm,
  listRoutingFormSubmissions: opListRoutingFormSubmissions,
  listGroups: opListGroups,
  getGroup: opGetGroup,
  deleteInviteeData: opDeleteInviteeData,
};
