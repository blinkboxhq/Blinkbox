/**
 * TELEGRAM NODE
 *
 * Sends messages via the Telegram Bot API.
 *
 * Config:
 *   credentialId — Vault reference to Bot Token (type: "bearer" or "api_key")
 *   chatId       — Target chat/group/channel ID (required)
 *   text         — Message text (already expression-resolved, supports Markdown)
 *   parseMode    — "MarkdownV2" (default) | "HTML" | "plain"
 *   silent       — Send without notification (default: false)
 *
 * Output:
 *   { ok, messageId, chat }
 */

import axios from "axios";
import Credential from "../../models/credential.model.js";
import { decrypt } from "../../utils/crypto.js";

const BASE_URL = "https://api.telegram.org/bot";

export default {
  async run(config, input, context = {}) {
    const {
      credentialId,
      chatId,
      text,
      parseMode = "MarkdownV2",
      silent = false,
    } = config;

    if (!text) throw new Error("Telegram: 'text' is required.");
    if (!chatId) throw new Error("Telegram: 'chatId' is required.");
    if (!credentialId)
      throw new Error("Telegram: 'credentialId' is required. Add your Bot Token to the Vault.");

    // Vault: decrypt Bot Token
    const query = { _id: credentialId };
    if (context.workspaceId) query.workspaceId = context.workspaceId;
    const cred = await Credential.findOne(query);
    if (!cred) throw new Error("Telegram: Credential not found in Vault.");

    const botToken = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const payload = {
      chat_id: chatId,
      text,
      disable_notification: silent,
    };

    if (parseMode !== "plain") {
      payload.parse_mode = parseMode;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}${botToken}/sendMessage`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        },
      );

      const msg = response.data.result;
      return {
        ok: response.data.ok,
        messageId: msg?.message_id,
        chat: {
          id: msg?.chat?.id,
          type: msg?.chat?.type,
          title: msg?.chat?.title || msg?.chat?.first_name,
        },
      };
    } catch (err) {
      if (err.response?.status === 401) throw new Error("Telegram: Invalid Bot Token.");
      if (err.response?.status === 400)
        throw new Error(`Telegram: Bad request — ${err.response?.data?.description || err.message}`);
      if (err.response?.status === 429) throw new Error("Telegram: Rate limit exceeded. Retry later.");
      throw new Error(`Telegram failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
