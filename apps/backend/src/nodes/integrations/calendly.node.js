import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE_URL = "https://api.calendly.com";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Calendly");
}

function client(token) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
}

function handleError(err) {
  if (err.message?.startsWith("Calendly")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.title ?? err.message;
  if (status === 401) throw new Error(`Calendly: Authentication failed — check your personal access token.`);
  if (status === 403) throw new Error(`Calendly: Permission denied — ${msg}`);
  if (status === 404) throw new Error(`Calendly: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Calendly: Bad request — ${msg}`);
  if (status === 422) throw new Error(`Calendly: Validation error — ${msg}`);
  if (status === 429) throw new Error(`Calendly: Rate limit exceeded — slow down requests.`);
  throw new Error(`Calendly: ${status ?? "Error"} — ${msg}`);
}

async function getCurrentUser(api) {
  const { data } = await api.get("/users/me");
  return data.resource;
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listEvents";

    if (!config.credentialId) {
      return { success: false, error: "Calendly: credential required.", skipped: true };
    }

    const token = await getToken(config.credentialId, context.workspaceId);
    const api = client(token);

    try {
      switch (operation) {
        case "getUser": {
          const user = await getCurrentUser(api);
          return { success: true, ...user };
        }

        case "listEventTypes": {
          const user = await getCurrentUser(api);
          const { data } = await api.get("/event_types", {
            params: { user: user.uri, count: Math.min(Number(config.count) || 20, 100) },
          });
          return { success: true, eventTypes: data.collection, pagination: data.pagination };
        }

        case "listEvents": {
          const user = await getCurrentUser(api);
          const params = {
            user: user.uri,
            count: Math.min(Number(config.count) || 20, 100),
          };
          if (config.eventUri) params.organization = config.eventUri;
          if (config.status) params.status = config.status;
          if (config.minStartTime) params.min_start_time = config.minStartTime;
          if (config.maxStartTime) params.max_start_time = config.maxStartTime;
          const { data } = await api.get("/scheduled_events", { params });
          return { success: true, events: data.collection, pagination: data.pagination };
        }

        case "getEvent": {
          if (!config.eventUri) return { success: false, error: "Calendly getEvent: 'eventUri' is required.", skipped: true };
          const uuid = config.eventUri.split("/").pop();
          const { data } = await api.get(`/scheduled_events/${uuid}`);
          return { success: true, ...data.resource };
        }

        case "listInvitees": {
          if (!config.eventUri) return { success: false, error: "Calendly listInvitees: 'eventUri' is required.", skipped: true };
          const uuid = config.eventUri.split("/").pop();
          const { data } = await api.get(`/scheduled_events/${uuid}/invitees`, {
            params: { count: Math.min(Number(config.count) || 20, 100) },
          });
          return { success: true, invitees: data.collection, pagination: data.pagination };
        }

        case "cancelEvent": {
          if (!config.eventUri) return { success: false, error: "Calendly cancelEvent: 'eventUri' is required.", skipped: true };
          const uuid = config.eventUri.split("/").pop();
          const body = {};
          if (config.reason) body.reason = config.reason;
          await api.post(`/scheduled_events/${uuid}/cancellation`, body);
          return { success: true, canceled: true, eventUri: config.eventUri };
        }

        case "getInvitee": {
          if (!config.inviteeUuid) return { success: false, error: "Calendly getInvitee: 'inviteeUuid' is required.", skipped: true };
          const { data } = await api.get(`/invitees/${config.inviteeUuid}`);
          return { success: true, ...data.resource };
        }

        case "createWebhook": {
          if (!config.url) return { success: false, error: "Calendly createWebhook: 'url' is required.", skipped: true };
          const events = Array.isArray(config.events) && config.events.length
            ? config.events
            : ["invitee.created", "invitee.canceled"];
          const user = await getCurrentUser(api);
          const { data } = await api.post("/webhook_subscriptions", {
            url: config.url,
            events,
            organization: user.current_organization,
            user: user.uri,
            scope: "user",
          });
          return { success: true, ...data.resource };
        }

        default:
          throw new Error(`Calendly: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
