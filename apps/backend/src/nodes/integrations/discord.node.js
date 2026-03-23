/**
 * DISCORD NODE
 *
 * Sends messages to Discord via Incoming Webhooks.
 * Replaces the old http_request wrapper — properly serializes message content
 * so special characters (quotes, newlines, emoji) never break the payload.
 *
 * Config:
 *   webhookUrl — Discord webhook URL (required, already expression-resolved)
 *   message    — Message text (required, already expression-resolved)
 *   username   — Bot name override (optional)
 *   avatarUrl  — Bot avatar URL override (optional)
 *
 * Output:
 *   { ok, webhookId }
 */

import axios from "axios";

export default {
  async run(config, input, context = {}) {
    const {
      webhookUrl,
      message,
      username,
      avatarUrl,
    } = config;

    if (!webhookUrl) throw new Error("Discord: 'webhookUrl' is required.");
    if (!message) throw new Error("Discord: 'message' is required.");

    if (!/^https:\/\/discord\.com\/api\/webhooks\//.test(webhookUrl)) {
      throw new Error(
        "Discord: Invalid webhook URL. It should start with https://discord.com/api/webhooks/",
      );
    }

    // Build payload as a proper object — axios serializes it correctly,
    // so quotes, newlines, and emoji in `message` are never mangled.
    const payload = { content: message };
    if (username) payload.username = username;
    if (avatarUrl) payload.avatar_url = avatarUrl;

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
        validateStatus: null,
      });

      // Discord webhooks return 204 No Content on success
      if (response.status >= 200 && response.status < 300) {
        // Extract webhook ID from URL for diagnostics
        const parts = webhookUrl.split("/");
        const webhookId = parts[5] || null;

        return {
          ok: true,
          webhookId,
        };
      }

      // Discord returned an error — throw with details
      const errMsg = response.data?.message || response.statusText || "Unknown error";
      const errCode = response.data?.code || response.status;

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Discord: Webhook unauthorized (${errCode}). The webhook may have been deleted — recreate it in Server Settings → Integrations.`);
      }
      if (response.status === 404) {
        throw new Error("Discord: Webhook not found. It may have been deleted — recreate it in Server Settings → Integrations → Webhooks.");
      }
      if (response.status === 429) {
        throw new Error("Discord: Rate limit exceeded. Add a Delay node or reduce message frequency.");
      }
      if (response.status === 400) {
        throw new Error(`Discord: Bad request — ${errMsg}. Check your message content isn't empty or over 2000 characters.`);
      }
      throw new Error(`Discord failed: ${response.status} — ${errMsg}`);
    } catch (err) {
      if (err.message.startsWith("Discord:")) throw err;
      throw new Error(`Discord failed: ${err.code || "UNKNOWN"} — ${err.message}`);
    }
  },
};
