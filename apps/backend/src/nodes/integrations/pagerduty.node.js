import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE_URL = "https://api.pagerduty.com";

function handleError(err) {
  if (err.message?.startsWith("PagerDuty")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.response?.data?.error ?? err.message;
  if (status === 400) throw new Error(`PagerDuty: Bad request — ${msg}`);
  if (status === 401) throw new Error(`PagerDuty: Authentication failed — check your API key.`);
  if (status === 403) throw new Error(`PagerDuty: Forbidden — ${msg}. Key may lack required permissions.`);
  if (status === 404) throw new Error(`PagerDuty: Not found — ${msg}. Check incidentId / serviceId.`);
  if (status === 409) throw new Error(`PagerDuty: Conflict — ${msg}`);
  if (status === 429) throw new Error(`PagerDuty: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`PagerDuty: ${status ?? "Network"} error — ${msg}`);
}

function client(token) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Token token=${token}`,
      Accept: "application/vnd.pagerduty+json;version=2",
      "Content-Type": "application/json",
    },
  });
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createIncident";

    if (!config.credentialId) {
      return { success: false, error: "PagerDuty: No credential selected — pick a PagerDuty credential.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "PagerDuty");
    } catch (e) {
      return { success: false, error: `PagerDuty: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const api = client(token);

    try {
      switch (operation) {
        case "listIncidents": {
          const params = { limit: Number(config.limit) || 25 };
          if (config.statuses) params["statuses[]"] = config.statuses;
          const { data } = await api.get("/incidents", { params });
          return { success: true, incidents: data.incidents, total: data.total };
        }

        case "getIncident": {
          if (!config.incidentId) return { success: false, error: "PagerDuty getIncident: 'incidentId' is required.", skipped: true };
          const { data } = await api.get(`/incidents/${config.incidentId}`);
          return { success: true, ...data.incident };
        }

        case "createIncident": {
          if (!config.title) return { success: false, error: "PagerDuty createIncident: 'title' is required.", skipped: true };
          if (!config.serviceId) return { success: false, error: "PagerDuty createIncident: 'serviceId' is required.", skipped: true };
          const payload = {
            incident: {
              type: "incident",
              title: config.title,
              urgency: config.urgency || "high",
              service: { id: config.serviceId, type: "service_reference" },
            },
          };
          if (config.body) payload.incident.body = { type: "incident_body", details: config.body };
          if (config.severity) payload.incident.incident_key = config.severity;
          const { data } = await api.post("/incidents", payload);
          return { success: true, ...data.incident };
        }

        case "resolveIncident": {
          if (!config.incidentId) return { success: false, error: "PagerDuty resolveIncident: 'incidentId' is required.", skipped: true };
          const { data } = await api.put(`/incidents/${config.incidentId}`, {
            incident: { type: "incident", status: "resolved" },
          });
          return { success: true, ...data.incident };
        }

        case "acknowledgeIncident": {
          if (!config.incidentId) return { success: false, error: "PagerDuty acknowledgeIncident: 'incidentId' is required.", skipped: true };
          const { data } = await api.put(`/incidents/${config.incidentId}`, {
            incident: { type: "incident", status: "acknowledged" },
          });
          return { success: true, ...data.incident };
        }

        case "addNote": {
          if (!config.incidentId) return { success: false, error: "PagerDuty addNote: 'incidentId' is required.", skipped: true };
          if (!config.content) return { success: false, error: "PagerDuty addNote: 'content' is required.", skipped: true };
          const { data } = await api.post(`/incidents/${config.incidentId}/notes`, {
            note: { content: config.content },
          });
          return { success: true, ...data.note };
        }

        case "listServices": {
          const { data } = await api.get("/services");
          return { success: true, services: data.services };
        }

        case "listOnCalls": {
          const { data } = await api.get("/oncalls");
          return { success: true, oncalls: data.oncalls };
        }

        default:
          return { success: false, error: `PagerDuty: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};
