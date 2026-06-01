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
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API_VERSION = "v21.0";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "WhatsApp");
}

function handleError(err) {
  if (err.message.startsWith("WhatsApp")) throw err;
  if (err.response?.status === 401) throw new Error("WhatsApp: Invalid or expired access token.");
  if (err.response?.status === 400) {
    const detail = err.response?.data?.error?.message || err.message;
    const errorCode = err.response?.data?.error?.code;
    if (errorCode === 131030) throw new Error("WhatsApp: Recipient phone number is not registered on WhatsApp.");
    if (errorCode === 131047) throw new Error("WhatsApp: Re-engagement message blocked — user must initiate conversation first.");
    if (errorCode === 132000) throw new Error(`WhatsApp: Template error — ${detail}`);
    throw new Error(`WhatsApp: Bad request — ${detail}`);
  }
  if (err.response?.status === 403) throw new Error("WhatsApp: Access denied. Check your Meta app permissions and phone number ID.");
  if (err.response?.status === 404) throw new Error("WhatsApp: Phone number ID not found. Verify it in Meta Business dashboard.");
  if (err.response?.status === 429) throw new Error("WhatsApp: Rate limit exceeded. Retry later.");
  if (err.response?.status === 500) throw new Error("WhatsApp: Meta server error (500). Retry later.");
  if (err.code === "ECONNABORTED") throw new Error("WhatsApp: Request timed out.");
  throw new Error(`WhatsApp failed: ${err.response?.status || err.code} — ${err.message}`);
}

async function send(phoneNumberId, token, payload) {
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    timeout: 15000,
  });
  if (response.data?.error) {
    const { message, code } = response.data.error;
    if (code === 131030) throw new Error("WhatsApp: Recipient phone number is not registered on WhatsApp.");
    if (code === 131047) throw new Error("WhatsApp: Re-engagement message blocked — user must initiate conversation first.");
    if (code === 132000) throw new Error(`WhatsApp: Template error — ${message}`);
    throw new Error(`WhatsApp API error ${code}: ${message}`);
  }
  return {
    messageId: response.data.messages?.[0]?.id,
    contacts: response.data.contacts,
    messages: response.data.messages,
  };
}

// ── Handlers ────────────────────────────────────────────────────────────────

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

async function opSendImage(config, token) {
  const { phoneNumberId, to, imageUrl } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendImage: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendImage: 'to' is required.", skipped: true };
  if (!imageUrl && !config._mediaId) return { success: false, error: "WhatsApp sendImage: 'imageUrl' or an attachmentIndex is required.", skipped: true };
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) throw new Error("WhatsApp sendImage: 'imageUrl' must be an http/https URL.");

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp", to, type: "image",
    image: config._mediaId
      ? { id: config._mediaId, caption: config.caption || undefined }
      : { link: imageUrl, caption: config.caption || undefined },
  });
}

async function opSendDocument(config, token) {
  const { phoneNumberId, to, documentUrl } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendDocument: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendDocument: 'to' is required.", skipped: true };
  if (!documentUrl && !config._mediaId) return { success: false, error: "WhatsApp sendDocument: 'documentUrl' or an attachmentIndex is required.", skipped: true };
  if (documentUrl && !/^https?:\/\//i.test(documentUrl)) throw new Error("WhatsApp sendDocument: 'documentUrl' must be an http/https URL.");

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp", to, type: "document",
    document: config._mediaId
      ? { id: config._mediaId, caption: config.caption || undefined, filename: config.filename || undefined }
      : { link: documentUrl, caption: config.caption || undefined, filename: config.filename || undefined },
  });
}

async function opSendAudio(config, token) {
  const { phoneNumberId, to, audioUrl } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendAudio: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendAudio: 'to' is required.", skipped: true };
  if (!audioUrl) return { success: false, error: "WhatsApp sendAudio: 'audioUrl' is required.", skipped: true };
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

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
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

async function uploadMedia(phoneNumberId, token, attachment) {
  const base64Data = attachment.dataUrl.includes(",") ? attachment.dataUrl.split(",")[1] : attachment.dataUrl;
  const mimeType = attachment.mimeType || "application/octet-stream";
  const filename = attachment.name || `file.${mimeType.split("/")[1] || "bin"}`;
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(base64Data, "base64")], { type: mimeType }), filename);
  form.append("type", mimeType);
  form.append("messaging_product", "whatsapp");
  const { data } = await axios.post(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
    form,
    { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
  );
  return data.id;
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "sendMessage";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`WhatsApp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    const token = await getToken(config.credentialId, context.workspaceId);

    // Allow forwarding attachments from previous node output (standalone canvas use)
    let resolvedConfig = config;
    if (["sendImage", "sendDocument", "sendAudio"].includes(operation) && typeof config.attachmentIndex === "number") {
      const att = Array.isArray(input?.attachments) ? input.attachments[config.attachmentIndex] : null;
      if (att) {
        try {
          const mediaId = await uploadMedia(config.phoneNumberId, token, att);
          const urlKey = operation === "sendImage" ? "imageUrl" : operation === "sendDocument" ? "documentUrl" : "audioUrl";
          resolvedConfig = { ...config, [urlKey]: undefined, _mediaId: mediaId };
        } catch (err) {
          console.warn("[whatsapp] Binary upload failed, falling back to URL mode:", err.message);
        }
      }
    }

    try {
      return await handler(resolvedConfig, token);
    } catch (err) {
      handleError(err);
    }
  },
};
