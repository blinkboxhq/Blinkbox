import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "getUser";
    let token;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Calendly");
      token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!token) return { success: false, error: "Calendly: personal access token required.", skipped: true };

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const BASE = "https://api.calendly.com";

    // Helper: get current user URI
    async function getUserUri() {
      const { data } = await axios.get(`${BASE}/users/me`, { headers, timeout: 10000 });
      return data.resource.uri;
    }

    switch (operation) {
      case "getUser": {
        const { data } = await axios.get(`${BASE}/users/me`, { headers, timeout: 10000 });
        return data.resource;
      }
      case "listEventTypes": {
        const userUri = await getUserUri();
        const { data } = await axios.get(`${BASE}/event_types`, { headers, params: { user: userUri, count: config.limit || 20, active: config.activeOnly !== false }, timeout: 15000 });
        return { eventTypes: data.collection, count: data.collection.length };
      }
      case "listEvents": {
        const userUri = await getUserUri();
        const params = { user: userUri, count: config.limit || 20, status: config.status || "active" };
        if (config.from) params.min_start_time = config.from;
        if (config.to) params.max_start_time = config.to;
        const { data } = await axios.get(`${BASE}/scheduled_events`, { headers, params, timeout: 15000 });
        return { events: data.collection, count: data.collection.length, nextPage: data.pagination?.next_page };
      }
      case "getEvent": {
        const uri = config.eventUri || input.eventUri || "";
        if (!uri) return { success: false, error: "Calendly getEvent: 'eventUri' required.", skipped: true };
        const uuid = uri.split("/").pop();
        const { data } = await axios.get(`${BASE}/scheduled_events/${uuid}`, { headers, timeout: 10000 });
        return data.resource;
      }
      case "listInvitees": {
        const uri = config.eventUri || input.eventUri || "";
        if (!uri) return { success: false, error: "Calendly listInvitees: 'eventUri' required.", skipped: true };
        const uuid = uri.split("/").pop();
        const { data } = await axios.get(`${BASE}/scheduled_events/${uuid}/invitees`, { headers, params: { count: config.limit || 50 }, timeout: 15000 });
        return { invitees: data.collection, count: data.collection.length };
      }
      case "cancelEvent": {
        const uri = config.eventUri || input.eventUri || "";
        if (!uri) return { success: false, error: "Calendly cancelEvent: 'eventUri' required.", skipped: true };
        const uuid = uri.split("/").pop();
        const { data } = await axios.post(`${BASE}/scheduled_events/${uuid}/cancellation`, { reason: config.reason || "Cancelled via BlinkBox" }, { headers, timeout: 10000 });
        return { success: true, uuid, reason: data.resource?.reason };
      }
      default:
        return { success: false, error: `Calendly: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
