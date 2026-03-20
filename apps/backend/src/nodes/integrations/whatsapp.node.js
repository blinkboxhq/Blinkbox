/**
 * WHATSAPP NODE
 *
 * Sends messages via the Meta WhatsApp Cloud API.
 *
 * Config:
 *   credentialId   — Vault reference to Meta access token (type: "bearer")
 *   phoneNumberId  — WhatsApp Business phone number ID (from Meta dashboard)
 *   to             — Recipient phone number in international format (e.g., "14155551234")
 *   text           — Message text (already expression-resolved)
 *   templateName   — Optional: use a pre-approved template instead of free-form text
 *   templateLang   — Template language code (default: "en_US")
 *
 * Output:
 *   { messageId, contacts, messages }
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const API_VERSION = "v21.0";

export default {
  async run(config, input, context = {}) {
    const {
      credentialId,
      phoneNumberId,
      to,
      text,
      templateName,
      templateLang = "en_US",
    } = config;

    if (!phoneNumberId) throw new Error("WhatsApp: 'phoneNumberId' is required.");
    if (!to) throw new Error("WhatsApp: 'to' (recipient phone number) is required.");
    if (!text && !templateName) throw new Error("WhatsApp: 'text' or 'templateName' is required.");
    // Vault: resolve + decrypt access token
    const cred = await resolveCredential(credentialId, context.workspaceId, "WhatsApp");
    const accessToken = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // Build payload: template message or free-form text
    let payload;
    if (templateName) {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
        },
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      };
    }

    const apiUrl = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;

    try {
      const response = await axios.post(apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      return {
        messageId: response.data.messages?.[0]?.id,
        contacts: response.data.contacts,
        messages: response.data.messages,
      };
    } catch (err) {
      if (err.response?.status === 401) throw new Error("WhatsApp: Invalid access token.");
      if (err.response?.status === 400) {
        const detail = err.response?.data?.error?.message || err.message;
        throw new Error(`WhatsApp: Bad request — ${detail}`);
      }
      if (err.response?.status === 429) throw new Error("WhatsApp: Rate limit exceeded. Retry later.");
      throw new Error(`WhatsApp failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
