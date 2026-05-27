import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input, context = {}) {
    const body  = input?.body ?? input;
    const event = body?.event ?? body;

    let attachments = [];
    const files = Array.isArray(event?.files) ? event.files : [];

    if (files.length > 0 && config?.botToken) {
      try {
        const token = await getOAuthToken(config.botToken, context.workspaceId, "Slack").catch(() => config.botToken);
        const file  = files[0];
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

    return {
      text:     event.text    ?? "",
      user:     event.user    ?? "",
      channel:  event.channel ?? "",
      ts:       event.ts      ?? "",
      event,
      teamId:   body?.team_id ?? "",
      hasMedia: attachments.length > 0,
      attachments,
    };
  },
};
