import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input, context = {}) {
    const body  = input?.body ?? input;
    const event = body?.event ?? body;

    let resolvedUser    = null;
    let resolvedChannel = null;
    let attachments     = [];

    const token = config?.botToken
      ? await getOAuthToken(config.botToken, context.workspaceId, "Slack").catch(() => config.botToken)
      : null;

    // ── File downloads ────────────────────────────────────────────────────────
    const files = Array.isArray(event?.files) ? event.files : [];
    if (files.length > 0 && token) {
      try {
        const file = files[0];
        const { data: buf } = await axios.get(file.url_private, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "arraybuffer",
          timeout: 30000,
        });
        const mimeType = file.mimetype || "application/octet-stream";
        attachments = [{ dataUrl: `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType, name: file.name || "file" }];
      } catch (err) {
        console.warn("[slack_trigger] File download failed:", err.message);
      }
    }

    // ── ID resolution (like n8n's resolveIds option) ─────────────────────────
    if (config?.resolveIds && token) {
      const userId    = event?.user ?? event?.message?.user;
      const channelId = event?.channel ?? event?.item?.channel ?? event?.channel_id;

      if (userId) {
        try {
          const { data } = await axios.get("https://slack.com/api/users.info", {
            params: { user: userId },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000,
          });
          if (data.ok && data.user) {
            resolvedUser = {
              id:          data.user.id,
              name:        data.user.name,
              realName:    data.user.real_name,
              displayName: data.user.profile?.display_name,
              email:       data.user.profile?.email,
              isBot:       data.user.is_bot,
            };
          }
        } catch (err) {
          console.warn("[slack_trigger] User resolution failed:", err.message);
        }
      }

      if (channelId) {
        try {
          const { data } = await axios.get("https://slack.com/api/conversations.info", {
            params: { channel: channelId },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000,
          });
          if (data.ok && data.channel) {
            resolvedChannel = {
              id:         data.channel.id,
              name:       data.channel.name,
              isPrivate:  data.channel.is_private,
              isMpim:     data.channel.is_mpim,
              topic:      data.channel.topic?.value,
              purpose:    data.channel.purpose?.value,
              memberCount: data.channel.num_members,
            };
          }
        } catch (err) {
          console.warn("[slack_trigger] Channel resolution failed:", err.message);
        }
      }
    }

    return {
      text:            event.text    ?? "",
      user:            event.user    ?? "",
      channel:         event.channel ?? "",
      ts:              event.ts      ?? "",
      eventType:       event.type    ?? "",
      subtype:         event.subtype ?? null,
      threadTs:        event.thread_ts ?? null,
      teamId:          body?.team_id ?? "",
      resolvedUser,
      resolvedChannel,
      hasMedia:        attachments.length > 0,
      attachments,
      event,
    };
  },
};
