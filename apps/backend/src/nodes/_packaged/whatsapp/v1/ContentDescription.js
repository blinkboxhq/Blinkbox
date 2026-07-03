/**
 * WhatsApp — location, contact card, and emoji reaction operations.
 * Handlers receive `(config, token)`.
 */
import { send } from "../GenericFunctions.js";

async function opSendLocation(config, token) {
  const { phoneNumberId, to, latitude, longitude } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendLocation: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendLocation: 'to' is required.", skipped: true };
  if (latitude === undefined || latitude === null) return { success: false, error: "WhatsApp sendLocation: 'latitude' is required.", skipped: true };
  if (longitude === undefined || longitude === null) return { success: false, error: "WhatsApp sendLocation: 'longitude' is required.", skipped: true };

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "location",
    location: {
      latitude: Number(latitude),
      longitude: Number(longitude),
      name: config.locationName || undefined,
      address: config.address || undefined,
    },
  });
}

async function opSendContact(config, token) {
  const { phoneNumberId, to, contactName, contactPhone } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendContact: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendContact: 'to' is required.", skipped: true };
  if (!contactName) return { success: false, error: "WhatsApp sendContact: 'contactName' is required.", skipped: true };
  if (!contactPhone) return { success: false, error: "WhatsApp sendContact: 'contactPhone' is required.", skipped: true };

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp", to, type: "contacts",
    contacts: [{
      name: { formatted_name: contactName, first_name: contactName },
      phones: [{ phone: contactPhone, type: "CELL" }],
      ...(config.contactEmail ? { emails: [{ email: config.contactEmail, type: "WORK" }] } : {}),
    }],
  });
}

async function opSendReaction(config, token) {
  const { phoneNumberId, to, messageId, emoji } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendReaction: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendReaction: 'to' is required.", skipped: true };
  if (!messageId) return { success: false, error: "WhatsApp sendReaction: 'messageId' is required.", skipped: true };

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp", to, type: "reaction",
    reaction: { message_id: messageId, emoji: emoji || "" },
  });
}

export const contentOperations = {
  sendLocation: opSendLocation,
  sendContact: opSendContact,
  sendReaction: opSendReaction,
};
