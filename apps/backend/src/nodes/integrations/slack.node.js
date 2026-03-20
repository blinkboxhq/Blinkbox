/**
 * SLACK NODE (Real)
 *
 * Posts messages to Slack via the Web API (chat.postMessage).
 * Replaces the old http_request wrapper with a proper integration.
 *
 * Config:
 *   credentialId — Vault reference to Slack Bot OAuth token (type: "bearer")
 *   channel      — Channel ID or name (e.g., "#general" or "C01ABCDEF")
 *   text         — Message text (already expression-resolved)
 *   username     — Optional bot username override
 *   iconEmoji    — Optional emoji for bot avatar (e.g., ":rocket:")
 *   unfurlLinks  — Unfurl URLs in the message (default: false)
 *
 * Output:
 *   { ok, ts, channel, message }
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const API_URL = "https://slack.com/api/chat.postMessage";

export default {
  async run(config, input, context = {}) {
    const {
      credentialId,
      channel,
      text,
      username,
      iconEmoji,
      unfurlLinks = false,
    } = config;

    if (!text) throw new Error("Slack: 'text' is required.");
    if (!channel) throw new Error("Slack: 'channel' is required.");
    // Vault: resolve + decrypt Bot OAuth token
    const cred = await resolveCredential(credentialId, context.workspaceId, "Slack");
    const botToken = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const payload = {
      channel,
      text,
      unfurl_links: unfurlLinks,
    };

    if (username) payload.username = username;
    if (iconEmoji) payload.icon_emoji = iconEmoji;

    try {
      const response = await axios.post(API_URL, payload, {
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      // Slack returns 200 even on errors — check the `ok` field
      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return {
        ok: true,
        ts: response.data.ts,
        channel: response.data.channel,
        message: response.data.message,
      };
    } catch (err) {
      if (err.message.startsWith("Slack API error:")) throw err;
      if (err.response?.status === 401) throw new Error("Slack: Invalid Bot Token.");
      if (err.response?.status === 429) throw new Error("Slack: Rate limit exceeded. Retry later.");
      throw new Error(`Slack failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
