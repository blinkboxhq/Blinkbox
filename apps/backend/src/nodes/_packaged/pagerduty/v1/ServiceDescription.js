/**
 * PagerDuty — services & escalation policies. Handlers receive `(config, { api })`.
 */
import { need, num, ref, skip } from "../GenericFunctions.js";

async function opListServices(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/services", { params });
  return { success: true, total: data.total, services: data.services };
}

async function opGetService(config, { api }) {
  const e = need(config, "serviceId", "getService"); if (e) return e;
  const { data } = await api.get(`/services/${config.serviceId}`);
  return { success: true, ...data.service };
}

async function opCreateService(config, { api }) {
  let e = need(config, "name", "createService"); if (e) return e;
  e = need(config, "escalationPolicyId", "createService"); if (e) return e;
  const service = {
    type: "service",
    name: config.name,
    escalation_policy: ref(config.escalationPolicyId, "escalation_policy_reference"),
  };
  if (config.description) service.description = config.description;
  if (config.urgency) service.acknowledgement_timeout = null;
  const { data } = await api.post("/services", { service });
  return { success: true, ...data.service };
}

async function opUpdateService(config, { api }) {
  const e = need(config, "serviceId", "updateService"); if (e) return e;
  const service = { type: "service" };
  if (config.name) service.name = config.name;
  if (config.description) service.description = config.description;
  if (config.status) service.status = config.status;
  if (config.escalationPolicyId) service.escalation_policy = ref(config.escalationPolicyId, "escalation_policy_reference");
  const { data } = await api.put(`/services/${config.serviceId}`, { service });
  return { success: true, ...data.service };
}

async function opDeleteService(config, { api }) {
  const e = need(config, "serviceId", "deleteService"); if (e) return e;
  await api.delete(`/services/${config.serviceId}`);
  return { success: true, deleted: config.serviceId };
}

async function opListEscalationPolicies(config, { api }) {
  const params = { limit: num(config.limit, 25) };
  if (config.query) params.query = config.query;
  const { data } = await api.get("/escalation_policies", { params });
  return { success: true, total: data.total, escalationPolicies: data.escalation_policies };
}

async function opGetEscalationPolicy(config, { api }) {
  const e = need(config, "escalationPolicyId", "getEscalationPolicy"); if (e) return e;
  const { data } = await api.get(`/escalation_policies/${config.escalationPolicyId}`);
  return { success: true, ...data.escalation_policy };
}

async function opDeleteEscalationPolicy(config, { api }) {
  const e = need(config, "escalationPolicyId", "deleteEscalationPolicy"); if (e) return e;
  await api.delete(`/escalation_policies/${config.escalationPolicyId}`);
  return { success: true, deleted: config.escalationPolicyId };
}

export const serviceOperations = {
  listServices: opListServices,
  getService: opGetService,
  createService: opCreateService,
  updateService: opUpdateService,
  deleteService: opDeleteService,
  listEscalationPolicies: opListEscalationPolicies,
  getEscalationPolicy: opGetEscalationPolicy,
  deleteEscalationPolicy: opDeleteEscalationPolicy,
};
