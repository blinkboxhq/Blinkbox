import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE_URL = "https://api.intercom.io";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Intercom");
}

function client(token) {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Intercom-Version": "2.10",
    },
  });
}

function handleError(err) {
  if (err.message?.startsWith("Intercom")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errors?.[0]?.message ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Intercom: Auth failed — ${msg}. Check your access token.`);
  if (status === 403) throw new Error(`Intercom: Permission denied — ${msg}.`);
  if (status === 404) throw new Error(`Intercom: Resource not found — ${msg}.`);
  if (status === 409) throw new Error(`Intercom: Conflict — ${msg}. A contact with this email may already exist.`);
  if (status === 422) throw new Error(`Intercom: Validation error — ${msg}.`);
  if (status === 429) throw new Error(`Intercom: Rate limit exceeded — slow down requests.`);
  throw new Error(`Intercom: ${status ?? "Error"} — ${msg}`);
}

function parseJson(value, fieldName) {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Intercom: ${fieldName} must be valid JSON.`);
  }
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createContact";

    if (!config.credentialId) {
      return { success: false, error: "Intercom: No credential selected — pick an Intercom Access Token credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Intercom: Could not resolve credential — ${e.message}`, skipped: true };
    }
    const api = client(token);

    try {
      switch (operation) {
        case "listContacts": {
          const { data } = await api.get("/contacts", {
            params: { per_page: Math.min(Number(config.limit) || 25, 150) },
          });
          return { success: true, contacts: data.data ?? [], total: data.total_count };
        }

        case "getContact": {
          if (!config.contactId) return { success: false, error: "Intercom getContact: contactId required.", skipped: true };
          const { data } = await api.get(`/contacts/${config.contactId}`);
          return { success: true, ...data };
        }

        case "searchContacts": {
          if (!config.email && !config.query) return { success: false, error: "Intercom searchContacts: email or query required.", skipped: true };
          const body = {
            query: config.email
              ? { field: "email", operator: "=", value: config.email }
              : { field: "name", operator: "~", value: config.query },
            pagination: { per_page: Math.min(Number(config.limit) || 25, 150) },
          };
          const { data } = await api.post("/contacts/search", body);
          return { success: true, contacts: data.data ?? [], total: data.total_count };
        }

        case "createContact": {
          const body = { role: config.role || "user" };
          if (config.email) body.email = config.email;
          if (config.name) body.name = config.name;
          if (config.phone) body.phone = config.phone;
          if (config.externalId) body.external_id = config.externalId;
          const attrs = parseJson(config.customAttributes, "customAttributes");
          if (attrs) body.custom_attributes = attrs;
          const { data } = await api.post("/contacts", body);
          return { success: true, id: data.id, email: data.email, name: data.name, role: data.role };
        }

        case "updateContact": {
          if (!config.contactId) return { success: false, error: "Intercom updateContact: contactId required.", skipped: true };
          const body = {};
          if (config.email) body.email = config.email;
          if (config.name) body.name = config.name;
          if (config.role) body.role = config.role;
          if (config.phone) body.phone = config.phone;
          const attrs = parseJson(config.customAttributes, "customAttributes");
          if (attrs) body.custom_attributes = attrs;
          const { data } = await api.put(`/contacts/${config.contactId}`, body);
          return { success: true, id: data.id, email: data.email, name: data.name };
        }

        case "archiveContact": {
          if (!config.contactId) return { success: false, error: "Intercom archiveContact: contactId required.", skipped: true };
          const { data } = await api.post(`/contacts/${config.contactId}/archive`);
          return { success: true, id: data.id, archived: data.archived };
        }

        case "sendMessage": {
          if (!config.contactId) return { success: false, error: "Intercom sendMessage: contactId required.", skipped: true };
          if (!config.body) return { success: false, error: "Intercom sendMessage: body required.", skipped: true };
          if (!config.adminId) return { success: false, error: "Intercom sendMessage: adminId required to send messages.", skipped: true };
          const { data } = await api.post("/messages", {
            message_type: config.messageType || "inapp",
            subject: config.subject || "",
            body: config.body,
            template: "plain",
            from: { type: "admin", id: String(config.adminId) },
            to: { type: config.role === "lead" ? "lead" : "user", id: config.contactId },
          });
          return { success: true, id: data.id, type: data.type };
        }

        case "createConversation": {
          if (!config.body) return { success: false, error: "Intercom createConversation: body required.", skipped: true };
          const toId = config.contactId || config.userId;
          if (!toId) return { success: false, error: "Intercom createConversation: contactId required.", skipped: true };
          if (!config.adminId) return { success: false, error: "Intercom createConversation: adminId required.", skipped: true };
          const { data } = await api.post("/messages", {
            message_type: config.messageType || "inapp",
            body: config.body,
            from: { type: "admin", id: String(config.adminId) },
            to: { type: "user", id: toId },
          });
          return { success: true, id: data.id, type: data.type };
        }

        case "listConversations": {
          const { data } = await api.get("/conversations", {
            params: { per_page: Math.min(Number(config.limit) || 25, 150) },
          });
          return { success: true, conversations: data.conversations ?? [], total: data.total_count };
        }

        case "getConversation": {
          if (!config.conversationId) return { success: false, error: "Intercom getConversation: conversationId required.", skipped: true };
          const { data } = await api.get(`/conversations/${config.conversationId}`);
          return { success: true, ...data };
        }

        case "replyConversation": {
          if (!config.conversationId) return { success: false, error: "Intercom replyConversation: conversationId required.", skipped: true };
          if (!config.body) return { success: false, error: "Intercom replyConversation: body required.", skipped: true };
          const replyBody = {
            message_type: "comment",
            body: config.body,
          };
          if (config.adminId) {
            replyBody.type = "admin";
            replyBody.admin_id = String(config.adminId);
          } else if (config.contactId) {
            replyBody.type = "user";
            replyBody.intercom_user_id = config.contactId;
          } else {
            return { success: false, error: "Intercom replyConversation: adminId or contactId required to identify the replier.", skipped: true };
          }
          const { data } = await api.post(`/conversations/${config.conversationId}/reply`, replyBody);
          return { success: true, id: data.id, type: data.type };
        }

        case "closeConversation": {
          if (!config.conversationId) return { success: false, error: "Intercom closeConversation: conversationId required.", skipped: true };
          if (!config.adminId) return { success: false, error: "Intercom closeConversation: adminId required.", skipped: true };
          const { data } = await api.post(`/conversations/${config.conversationId}/parts`, {
            message_type: "close",
            type: "admin",
            admin_id: String(config.adminId),
          });
          return { success: true, id: data.id, state: "closed" };
        }

        case "addTag": {
          if (!config.contactId) return { success: false, error: "Intercom addTag: contactId required.", skipped: true };
          if (!config.tagName) return { success: false, error: "Intercom addTag: tagName required.", skipped: true };
          const tagRes = await api.post("/tags", { name: config.tagName });
          const tagId = tagRes.data.id;
          const { data } = await api.post(`/contacts/${config.contactId}/tags`, { id: tagId });
          return { success: true, tagId, tagName: config.tagName, contact: data };
        }

        case "createEvent": {
          if (!config.eventName) return { success: false, error: "Intercom createEvent: eventName required.", skipped: true };
          if (!config.userId) return { success: false, error: "Intercom createEvent: userId required.", skipped: true };
          const body = {
            event_name: config.eventName,
            created_at: Math.floor(Date.now() / 1000),
            user_id: config.userId,
          };
          const meta = parseJson(config.metadata, "metadata");
          if (meta) body.metadata = meta;
          await api.post("/events", body);
          return { success: true, event_name: config.eventName, user_id: config.userId };
        }

        default:
          throw new Error(`Intercom: Unknown operation "${operation}".`);
      }
    } catch (err) {
      handleError(err);
    }
  },
};
