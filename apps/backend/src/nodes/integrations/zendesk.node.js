/**
 * ZENDESK NODE
 *
 * Operations:
 *   listTickets   — List recent tickets (default)
 *   getTicket     — Get a single ticket by ID
 *   createTicket  — Create a new support ticket
 *   updateTicket  — Update status, priority, or add a comment
 *   searchTickets — Full-text search across tickets
 *   listUsers     — List agents/end-users
 *   createUser    — Create a new end-user
 *
 * Auth: Zendesk API token + agent email, stored in vault as JSON: { "email": "...", "token": "..." }
 * Basic Auth: email/token:apitoken
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Zendesk");
  let token, email;
  try {
    const j = JSON.parse(raw);
    token = j.token;
    email = j.email;
  } catch {
    token = raw;
  }
  return { token, email };
}

function handleError(err) {
  if (err.message.startsWith("Zendesk")) throw err;
  const status = err.response?.status;
  const desc = err.response?.data?.description || err.response?.data?.error || err.message;
  if (status === 401) throw new Error("Zendesk: Invalid email or API token.");
  if (status === 403) throw new Error(`Zendesk: Forbidden — ${desc}. Check your agent permissions.`);
  if (status === 404) throw new Error(`Zendesk: Resource not found — ${desc}`);
  if (status === 422) throw new Error(`Zendesk: Validation error — ${desc}`);
  if (status === 429) throw new Error("Zendesk: Rate limit exceeded. Retry later.");
  throw new Error(`Zendesk failed: ${status || err.code} — ${err.message}`);
}

function buildClient(subdomain, email, token) {
  const base = `https://${subdomain}.zendesk.com/api/v2`;
  const auth = { username: `${email}/token`, password: token };
  const headers = { "Content-Type": "application/json" };
  return { base, auth, headers };
}

async function opListTickets(config, client) {
  const params = new URLSearchParams({
    per_page: String(parseInt(config.limit) || 25),
    sort_by: "created_at",
    sort_order: "desc",
  });
  if (config.status) params.set("status", config.status);
  const { data } = await axios.get(`${client.base}/tickets.json?${params}`, {
    auth: client.auth,
    headers: client.headers,
    timeout: 15000,
  });
  return { tickets: data.tickets || [], count: data.count };
}

async function opGetTicket(config, client) {
  const id = config.ticketId;
  if (!id) return { success: false, error: "Zendesk getTicket: 'ticketId' is required.", skipped: true };
  const { data } = await axios.get(`${client.base}/tickets/${id}.json`, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return data.ticket;
}

async function opCreateTicket(config, client) {
  if (!config.subject) return { success: false, error: "Zendesk createTicket: 'subject' is required.", skipped: true };
  const body = config.description || config.body || "";
  if (!body) return { success: false, error: "Zendesk createTicket: 'description' (ticket body) is required.", skipped: true };

  const ticket = {
    subject: config.subject,
    comment: { body },
    priority: config.priority || "normal",
    type: config.type || "incident",
  };
  if (config.requesterEmail) ticket.requester = { email: config.requesterEmail, name: config.requesterName || config.requesterEmail };
  if (config.assigneeId) ticket.assignee_id = parseInt(config.assigneeId);
  if (config.tags) ticket.tags = String(config.tags).split(",").map((t) => t.trim()).filter(Boolean);

  const { data } = await axios.post(`${client.base}/tickets.json`, { ticket }, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return data.ticket;
}

async function opUpdateTicket(config, client) {
  const id = config.ticketId;
  if (!id) return { success: false, error: "Zendesk updateTicket: 'ticketId' is required.", skipped: true };
  const update = {};
  if (config.status) update.status = config.status;
  if (config.priority) update.priority = config.priority;
  if (config.assigneeId) update.assignee_id = parseInt(config.assigneeId);
  if (config.comment) update.comment = { body: config.comment, public: config.publicComment !== false };
  if (config.tags) update.tags = String(config.tags).split(",").map((t) => t.trim()).filter(Boolean);
  if (!Object.keys(update).length) return { success: false, error: "Zendesk updateTicket: provide at least one field to update.", skipped: true };

  const { data } = await axios.put(`${client.base}/tickets/${id}.json`, { ticket: update }, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return data.ticket;
}

async function opSearchTickets(config, client) {
  const q = config.query;
  if (!q) return { success: false, error: "Zendesk searchTickets: 'query' is required.", skipped: true };
  const params = new URLSearchParams({
    query: `type:ticket ${q}`,
    per_page: String(parseInt(config.limit) || 25),
  });
  const { data } = await axios.get(`${client.base}/search.json?${params}`, {
    auth: client.auth,
    headers: client.headers,
    timeout: 15000,
  });
  return { results: data.results || [], count: data.count };
}

async function opListUsers(config, client) {
  const params = new URLSearchParams({ per_page: String(parseInt(config.limit) || 25) });
  if (config.role) params.set("role[]", config.role);
  const { data } = await axios.get(`${client.base}/users.json?${params}`, {
    auth: client.auth,
    headers: client.headers,
    timeout: 15000,
  });
  return { users: data.users || [], count: data.count };
}

async function opCreateUser(config, client) {
  const email = config.email;
  const name = config.name;
  if (!email) return { success: false, error: "Zendesk createUser: 'email' is required.", skipped: true };
  if (!name) return { success: false, error: "Zendesk createUser: 'name' is required.", skipped: true };

  const user = { name, email, role: config.role || "end-user" };
  if (config.phone) user.phone = config.phone;
  if (config.externalId) user.external_id = config.externalId;

  const { data } = await axios.post(`${client.base}/users.json`, { user }, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return data.user;
}

async function opAssignTicket(config, client) {
  const id = config.ticketId;
  if (!id) return { success: false, error: "Zendesk assignTicket: 'ticketId' is required.", skipped: true };
  const assigneeId = config.assigneeId;
  if (!assigneeId) return { success: false, error: "Zendesk assignTicket: 'assigneeId' is required.", skipped: true };
  const { data } = await axios.put(`${client.base}/tickets/${id}.json`, { ticket: { assignee_id: parseInt(assigneeId) } }, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return data.ticket;
}

async function opAddComment(config, client) {
  return opReplyTicket(config, client);
}

async function opReplyTicket(config, client) {
  const id = config.ticketId;
  if (!id) return { success: false, error: "Zendesk replyTicket: 'ticketId' is required.", skipped: true };
  const body = config.body || config.comment || "";
  if (!body) return { success: false, error: "Zendesk replyTicket: reply 'body' is required.", skipped: true };

  const update = {
    comment: { body, public: config.public !== false },
  };
  if (config.status) update.status = config.status;

  const { data } = await axios.put(`${client.base}/tickets/${id}.json`, { ticket: update }, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return data.ticket;
}

async function opCloseTicket(config, client) {
  const id = config.ticketId;
  if (!id) return { success: false, error: "Zendesk closeTicket: 'ticketId' is required.", skipped: true };

  const { data } = await axios.put(`${client.base}/tickets/${id}.json`, { ticket: { status: "closed" } }, {
    auth: client.auth,
    headers: client.headers,
    timeout: 10000,
  });
  return data.ticket;
}

const OPERATIONS = {
  listTickets: opListTickets,
  getTicket: opGetTicket,
  createTicket: opCreateTicket,
  updateTicket: opUpdateTicket,
  replyTicket: opReplyTicket,
  addComment: opAddComment,
  closeTicket: opCloseTicket,
  assignTicket: opAssignTicket,
  searchTickets: opSearchTickets,
  listUsers: opListUsers,
  createUser: opCreateUser,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listTickets";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`Zendesk: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const subdomain = config.subdomain || input?.subdomain || "";
    if (!subdomain)
      throw new Error("Zendesk: 'subdomain' is required (e.g. 'mycompany' for mycompany.zendesk.com).");

    if (!config.credentialId)
      throw new Error("Zendesk: No credential configured — add a Zendesk API token credential first.");

    let token, email;
    try {
      ({ token, email } = await getCreds(config.credentialId, context.workspaceId));
    } catch (err) {
      handleError(err);
    }

    email = email || config.email;
    if (!token) throw new Error("Zendesk: API token missing from credential.");
    if (!email) throw new Error("Zendesk: Agent email missing — store as JSON { email, token } or set config.email.");

    const client = buildClient(subdomain, email, token);

    try {
      return await handler(config, client);
    } catch (err) {
      handleError(err);
    }
  },
};
