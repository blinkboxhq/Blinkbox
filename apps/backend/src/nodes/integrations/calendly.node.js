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
  });
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

    switch (operation) {
      case "getUser": {
        const user = await getCurrentUser(api);
        return { success: true, ...user };
      }

      case "listEventTypes": {
        const user = await getCurrentUser(api);
        const { data } = await api.get("/event_types", {
          params: { user: user.uri, count: Number(config.count) || 20 },
        });
        return { success: true, eventTypes: data.collection, pagination: data.pagination };
      }

      case "listEvents": {
        const user = await getCurrentUser(api);
        const params = {
          user: user.uri,
          count: Number(config.count) || 20,
        };
        if (config.eventUri) params.organization = config.eventUri;
        if (config.status) params.status = config.status;
        if (config.minStartTime) params.min_start_time = config.minStartTime;
        if (config.maxStartTime) params.max_start_time = config.maxStartTime;
        const { data } = await api.get("/scheduled_events", { params });
        return { success: true, events: data.collection, pagination: data.pagination };
      }

      case "getEvent": {
        const eventUri = config.eventUri;
        if (!eventUri) return { success: false, error: "Calendly: eventUri required.", skipped: true };
        const uuid = eventUri.split("/").pop();
        const { data } = await api.get(`/scheduled_events/${uuid}`);
        return { success: true, ...data.resource };
      }

      case "listInvitees": {
        const eventUri = config.eventUri;
        if (!eventUri) return { success: false, error: "Calendly: eventUri required.", skipped: true };
        const uuid = eventUri.split("/").pop();
        const { data } = await api.get(`/scheduled_events/${uuid}/invitees`, {
          params: { count: Number(config.count) || 20 },
        });
        return { success: true, invitees: data.collection, pagination: data.pagination };
      }

      case "cancelEvent": {
        const eventUri = config.eventUri;
        if (!eventUri) return { success: false, error: "Calendly: eventUri required.", skipped: true };
        const uuid = eventUri.split("/").pop();
        const body = {};
        if (config.reason) body.reason = config.reason;
        await api.post(`/scheduled_events/${uuid}/cancellation`, body);
        return { success: true, canceled: true, eventUri };
      }

      case "getInvitee": {
        if (!config.inviteeUuid) return { success: false, error: "Calendly: inviteeUuid required.", skipped: true };
        const { data } = await api.get(`/invitees/${config.inviteeUuid}`);
        return { success: true, ...data.resource };
      }

      case "createWebhook": {
        if (!config.url) return { success: false, error: "Calendly: url required.", skipped: true };
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
        return { success: false, error: `Calendly: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
