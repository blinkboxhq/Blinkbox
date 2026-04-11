/**
 * WHATSAPP NODE
 *
 * Sends messages via the Meta WhatsApp Cloud API.
 *
 * Operations:
 *   sendMessage  — Send a text message (default)
 *   sendImage    — Send an image with optional caption
 *   sendDocument — Send a PDF/file with optional caption
 *   sendAudio    — Send an audio file
 *   sendLocation — Send a lat/lng location pin
 *   sendTemplate — Send a pre-approved template message
 *   markRead     — Mark an incoming message as read
 *
 * Config (all ops):
 *   credentialId  — Vault reference to Meta access token
 *   phoneNumberId — WhatsApp Business phone number ID
 *   to            — Recipient phone in international format (e.g. "14155551234")
 *   operation     — one of the above (default: "sendMessage")
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const API_VERSION = "v21.0";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "WhatsApp");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function handleError(err) {
  if (err.message.startsWith("WhatsApp")) throw err;
  if (err.response?.status === 401) throw new Error("WhatsApp: Invalid access token.");
  if (err.response?.status === 400) {
    const detail = err.response?.data?.error?.message || err.message;
    throw new Error(`WhatsApp: Bad request — ${detail}`);
  }
  if (err.response?.status === 429) throw new Error("WhatsApp: Rate limit exceeded. Retry later.");
  throw new Error(`WhatsApp failed: ${err.response?.status || err.code} — ${err.message}`);
}

async function send(phoneNumberId, token, payload) {
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    timeout: 15000,
  });
  return {
    messageId: response.data.messages?.[0]?.id,
    contacts: response.data.contacts,
    messages: response.data.messages,
  };
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function opSendMessage(config, token) {
  const { phoneNumberId, to, text } = config;
  if (!phoneNumberId) throw new Error("WhatsApp sendMessage: 'phoneNumberId' is required.");
  if (!to) throw new Error("WhatsApp sendMessage: 'to' is required.");
  if (!text) throw new Error("WhatsApp sendMessage: 'text' is required.");

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text, preview_url: config.previewUrl || false },
  });
}

async function opSendImage(config, token) {
  const { phoneNumberId, to, imageUrl } = config;
  if (!phoneNumberId) throw new Error("WhatsApp sendImage: 'phoneNumberId' is required.");
  if (!to) throw new Error("WhatsApp sendImage: 'to' is required.");
  if (!imageUrl) throw new Error("WhatsApp sendImage: 'imageUrl' is required.");
  if (!/^https?:\/\//i.test(imageUrl)) throw new Error("WhatsApp sendImage: 'imageUrl' must be an http/https URL.");

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: { link: imageUrl, caption: config.caption || undefined },
  });
}

async function opSendDocument(config, token) {
  const { phoneNumberId, to, documentUrl } = config;
  if (!phoneNumberId) throw new Error("WhatsApp sendDocument: 'phoneNumberId' is required.");
  if (!to) throw new Error("WhatsApp sendDocument: 'to' is required.");
  if (!documentUrl) throw new Error("WhatsApp sendDocument: 'documentUrl' is required.");
  if (!/^https?:\/\//i.test(documentUrl)) throw new Error("WhatsApp sendDocument: 'documentUrl' must be an http/https URL.");

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: {
      link: documentUrl,
      caption: config.caption || undefined,
      filename: config.filename || undefined,
    },
  });
}

async function opSendAudio(config, token) {
  const { phoneNumberId, to, audioUrl } = config;
  if (!phoneNumberId) throw new Error("WhatsApp sendAudio: 'phoneNumberId' is required.");
  if (!to) throw new Error("WhatsApp sendAudio: 'to' is required.");
  if (!audioUrl) throw new Error("WhatsApp sendAudio: 'audioUrl' is required.");
  if (!/^https?:\/\//i.test(audioUrl)) throw new Error("WhatsApp sendAudio: 'audioUrl' must be an http/https URL.");

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "audio",
    audio: { link: audioUrl },
  });
}

async function opSendLocation(config, token) {
  const { phoneNumberId, to, latitude, longitude } = config;
  if (!phoneNumberId) throw new Error("WhatsApp sendLocation: 'phoneNumberId' is required.");
  if (!to) throw new Error("WhatsApp sendLocation: 'to' is required.");
  if (latitude === undefined || latitude === null) throw new Error("WhatsApp sendLocation: 'latitude' is required.");
  if (longitude === undefined || longitude === null) throw new Error("WhatsApp sendLocation: 'longitude' is required.");

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

async function opSendTemplate(config, token) {
  const { phoneNumberId, to, templateName, templateLang = "en_US" } = config;
  if (!phoneNumberId) throw new Error("WhatsApp sendTemplate: 'phoneNumberId' is required.");
  if (!to) throw new Error("WhatsApp sendTemplate: 'to' is required.");
  if (!templateName) throw new Error("WhatsApp sendTemplate: 'templateName' is required.");

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
  if (!phoneNumberId) throw new Error("WhatsApp markRead: 'phoneNumberId' is required.");
  if (!messageId) throw new Error("WhatsApp markRead: 'messageId' is required.");

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  await axios.post(url,
    { messaging_product: "whatsapp", status: "read", message_id: messageId },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 10000 },
  );
  return { ok: true, messageId, status: "read" };
}

// ── Operations map ───────────────────────────────────────────────────────────

const OPERATIONS = {
  sendMessage: opSendMessage,
  sendImage: opSendImage,
  sendDocument: opSendDocument,
  sendAudio: opSendAudio,
  sendLocation: opSendLocation,
  sendTemplate: opSendTemplate,
  markRead: opMarkRead,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendMessage";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`WhatsApp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const token = await getToken(config.credentialId, context.workspaceId);

    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};
