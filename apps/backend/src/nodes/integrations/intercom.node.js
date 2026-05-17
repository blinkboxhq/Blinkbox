import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE_URL = "https://api.intercom.io";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Intercom");
}

function client(token) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Intercom-Version": "2.10",
    },
  });
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createContact";

    if (!config.credentialId) {
      return { success: false, error: "Intercom: credential required.", skipped: true };
    }

    const token = await getToken(config.credentialId, context.workspaceId);
    const api = client(token);

    switch (operation) {
      case "listContacts": {
        const { data } = await api.get("/contacts", {
          params: { per_page: Number(config.limit) || 25 },
        });
        return { success: true, contacts: data.data, total: data.total_count };
      }

      case "getContact": {
        if (!config.contactId) return { success: false, error: "Intercom: contactId required.", skipped: true };
        const { data } = await api.get(`/contacts/${config.contactId}`);
        return { success: true, ...data };
      }

      case "createContact": {
        const body = { role: config.role || "user" };
        if (config.email) body.email = config.email;
        if (config.name) body.name = config.name;
        if (config.customAttributes) {
          try {
            body.custom_attributes = typeof config.customAttributes === "string"
              ? JSON.parse(config.customAttributes)
              : config.customAttributes;
          } catch {
            return { success: false, error: "Intercom: customAttributes must be valid JSON.", skipped: true };
          }
        }
        const { data } = await api.post("/contacts", body);
        return { success: true, ...data };
      }

      case "updateContact": {
        if (!config.contactId) return { success: false, error: "Intercom: contactId required.", skipped: true };
        const body = {};
        if (config.email) body.email = config.email;
        if (config.name) body.name = config.name;
        if (config.role) body.role = config.role;
        if (config.customAttributes) {
          try {
            body.custom_attributes = typeof config.customAttributes === "string"
              ? JSON.parse(config.customAttributes)
              : config.customAttributes;
          } catch {
            return { success: false, error: "Intercom: customAttributes must be valid JSON.", skipped: true };
          }
        }
        const { data } = await api.put(`/contacts/${config.contactId}`, body);
        return { success: true, ...data };
      }

      case "sendMessage": {
        if (!config.contactId) return { success: false, error: "Intercom: contactId required.", skipped: true };
        if (!config.body) return { success: false, error: "Intercom: body required.", skipped: true };
        const { data } = await api.post("/messages", {
          message_type: config.messageType || "inapp",
          subject: config.subject || "",
          body: config.body,
          template: "plain",
          to: { type: "user", id: config.contactId },
        });
        return { success: true, ...data };
      }

      case "createConversation": {
        if (!config.body) return { success: false, error: "Intercom: body required.", skipped: true };
        const toId = config.contactId || config.userId;
        if (!toId) return { success: false, error: "Intercom: contactId required.", skipped: true };
        const { data } = await api.post("/messages", {
          message_type: config.messageType || "inapp",
          body: config.body,
          to: { type: "user", id: toId },
        });
        return { success: true, ...data };
      }

      case "listConversations": {
        const { data } = await api.get("/conversations", {
          params: { per_page: Number(config.limit) || 25 },
        });
        return { success: true, conversations: data.conversations, total: data.total_count };
      }

      case "replyConversation": {
        if (!config.conversationId) return { success: false, error: "Intercom: conversationId required.", skipped: true };
        if (!config.body) return { success: false, error: "Intercom: body required.", skipped: true };
        const { data } = await api.post(`/conversations/${config.conversationId}/reply`, {
          message_type: "comment",
          type: "admin",
          body: config.body,
        });
        return { success: true, ...data };
      }

      case "addTag": {
        if (!config.contactId) return { success: false, error: "Intercom: contactId required.", skipped: true };
        if (!config.tagName) return { success: false, error: "Intercom: tagName required.", skipped: true };
        const tagRes = await api.post("/tags", { name: config.tagName });
        const tagId = tagRes.data.id;
        const { data } = await api.post(`/contacts/${config.contactId}/tags`, { id: tagId });
        return { success: true, tagId, tagName: config.tagName, contact: data };
      }

      case "createEvent": {
        if (!config.eventName) return { success: false, error: "Intercom: eventName required.", skipped: true };
        if (!config.userId) return { success: false, error: "Intercom: userId required.", skipped: true };
        const body = {
          event_name: config.eventName,
          created_at: Math.floor(Date.now() / 1000),
          user_id: config.userId,
        };
        if (config.metadata) {
          try {
            body.metadata = typeof config.metadata === "string"
              ? JSON.parse(config.metadata)
              : config.metadata;
          } catch {
            return { success: false, error: "Intercom: metadata must be valid JSON.", skipped: true };
          }
        }
        await api.post("/events", body);
        return { success: true, event_name: config.eventName, user_id: config.userId };
      }

      default:
        return { success: false, error: `Intercom: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
