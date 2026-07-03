/**
 * WhatsApp — text / template / read-receipt operations.
 * Handlers receive `(config, token)` exactly as the monolith did.
 */
import axios from "axios";
import { API_VERSION, send, handleError } from "../GenericFunctions.js";

async function opSendMessage(config, token) {
  const { phoneNumberId, to, text } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendMessage: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendMessage: 'to' is required.", skipped: true };
  if (!text) return { success: false, error: "WhatsApp sendMessage: 'text' is required.", skipped: true };

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text, preview_url: config.previewUrl || false },
  });
}

async function opSendTemplate(config, token) {
  const { phoneNumberId, to, templateName, templateLang = "en_US" } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendTemplate: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendTemplate: 'to' is required.", skipped: true };
  if (!templateName) return { success: false, error: "WhatsApp sendTemplate: 'templateName' is required.", skipped: true };

  const template = { name: templateName, language: { code: templateLang } };

  // Optional template components (header/body/button variables)
  if (Array.isArray(config.components) && config.components.length > 0) {
    template.components = config.components;
  }

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template,
  });
}

async function opMarkRead(config, token) {
  const { phoneNumberId, messageId } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp markRead: 'phoneNumberId' is required.", skipped: true };
  if (!messageId) return { success: false, error: "WhatsApp markRead: 'messageId' is required.", skipped: true };

  const url = `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`;
  try {
    const response = await axios.post(url,
      { messaging_product: "whatsapp", status: "read", message_id: messageId },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 10000 },
    );
    if (response.data?.error) {
      const { message, code } = response.data.error;
      throw new Error(`WhatsApp API error ${code}: ${message}`);
    }
  } catch (err) {
    handleError(err);
  }
  return { ok: true, messageId, status: "read" };
}

export const messageOperations = {
  sendMessage: opSendMessage,
  sendTemplate: opSendTemplate,
  markRead: opMarkRead,
};
