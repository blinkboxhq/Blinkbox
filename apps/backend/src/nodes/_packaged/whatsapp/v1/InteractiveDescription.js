/**
 * WhatsApp — interactive messages: reply buttons (≤3) and list menus (≤10 rows).
 * Handlers receive `(config, token)`.
 */
import { send } from "../GenericFunctions.js";

async function opSendButtons(config, token) {
  const { phoneNumberId, to, bodyText } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendButtons: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendButtons: 'to' is required.", skipped: true };
  if (!bodyText) return { success: false, error: "WhatsApp sendButtons: 'bodyText' is required.", skipped: true };

  const raw = Array.isArray(config.buttons) ? config.buttons : [];
  const buttons = raw.filter((b) => b && (b.title || b.label)).slice(0, 3).map((b, i) => ({
    type: "reply",
    reply: { id: b.id || `btn_${i}`, title: String(b.title || b.label).substring(0, 20) },
  }));
  if (buttons.length === 0) return { success: false, error: "WhatsApp sendButtons: at least one button with a title is required.", skipped: true };

  const interactive = { type: "button", body: { text: bodyText }, action: { buttons } };
  if (config.headerText) interactive.header = { type: "text", text: config.headerText };
  if (config.footerText) interactive.footer = { text: config.footerText };

  return send(phoneNumberId, token, { messaging_product: "whatsapp", to, type: "interactive", interactive });
}

async function opSendList(config, token) {
  const { phoneNumberId, to, bodyText, buttonText } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendList: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendList: 'to' is required.", skipped: true };
  if (!bodyText) return { success: false, error: "WhatsApp sendList: 'bodyText' is required.", skipped: true };

  const raw = Array.isArray(config.rows) ? config.rows : [];
  const rows = raw.filter((r) => r && (r.title || r.label)).slice(0, 10).map((r, i) => ({
    id: r.id || `row_${i}`,
    title: String(r.title || r.label).substring(0, 24),
    ...(r.description ? { description: String(r.description).substring(0, 72) } : {}),
  }));
  if (rows.length === 0) return { success: false, error: "WhatsApp sendList: at least one row with a title is required.", skipped: true };

  const interactive = {
    type: "list",
    body: { text: bodyText },
    action: { button: (buttonText || "Choose").substring(0, 20), sections: [{ title: config.sectionTitle || "Options", rows }] },
  };
  if (config.headerText) interactive.header = { type: "text", text: config.headerText };
  if (config.footerText) interactive.footer = { text: config.footerText };

  return send(phoneNumberId, token, { messaging_product: "whatsapp", to, type: "interactive", interactive });
}

export const interactiveOperations = {
  sendButtons: opSendButtons,
  sendList: opSendList,
};
