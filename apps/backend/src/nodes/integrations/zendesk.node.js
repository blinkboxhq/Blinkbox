import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listTickets";
    const subdomain = config.subdomain || input.subdomain || "";
    if (!subdomain) return { success: false, error: "Zendesk: 'subdomain' required (e.g. mycompany).", skipped: true };

    let token, email;
    if (config.credentialId) {
      const raw = await getOAuthToken(config.credentialId, context.workspaceId, "Zendesk");
      try { const j = JSON.parse(raw); token = j.token; email = j.email; } catch { token = raw; }
    }
    email = email || config.email;
    if (!token) return { success: false, error: "Zendesk: API token required.", skipped: true };

    const BASE = `https://${subdomain}.zendesk.com/api/v2`;
    const auth = { username: `${email}/token`, password: token };
    const headers = { "Content-Type": "application/json" };

    switch (operation) {
      case "listTickets": {
        const { data } = await axios.get(`${BASE}/tickets.json?per_page=${config.limit || 25}&sort_by=created_at&sort_order=desc`, { auth, headers, timeout: 15000 });
        return { tickets: data.tickets, count: data.count };
      }
      case "getTicket": {
        const id = config.ticketId || input.ticketId;
        if (!id) return { success: false, error: "Zendesk getTicket: 'ticketId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/tickets/${id}.json`, { auth, headers, timeout: 10000 });
        return data.ticket;
      }
      case "createTicket": {
        const body = { subject: config.subject || "Support Request", comment: { body: config.description || config.body || "" }, priority: config.priority || "normal", type: config.type || "incident" };
        if (config.requesterEmail) body.requester = { email: config.requesterEmail, name: config.requesterName || config.requesterEmail };
        if (config.tags) body.tags = config.tags.split(",").map(t => t.trim());
        const { data } = await axios.post(`${BASE}/tickets.json`, { ticket: body }, { auth, headers, timeout: 10000 });
        return data.ticket;
      }
      case "updateTicket": {
        const id = config.ticketId || input.ticketId;
        if (!id) return { success: false, error: "Zendesk updateTicket: 'ticketId' required.", skipped: true };
        const update = {};
        if (config.status) update.status = config.status;
        if (config.priority) update.priority = config.priority;
        if (config.comment) update.comment = { body: config.comment };
        if (config.tags) update.tags = config.tags.split(",").map(t => t.trim());
        const { data } = await axios.put(`${BASE}/tickets/${id}.json`, { ticket: update }, { auth, headers, timeout: 10000 });
        return data.ticket;
      }
      case "searchTickets": {
        const q = config.query || input.query || "";
        if (!q) return { success: false, error: "Zendesk searchTickets: 'query' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/search.json?query=type:ticket ${encodeURIComponent(q)}&per_page=${config.limit || 25}`, { auth, headers, timeout: 15000 });
        return { results: data.results, count: data.count };
      }
      case "listUsers": {
        const { data } = await axios.get(`${BASE}/users.json?per_page=${config.limit || 25}`, { auth, headers, timeout: 15000 });
        return { users: data.users, count: data.count };
      }
      default:
        return { success: false, error: `Zendesk: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
