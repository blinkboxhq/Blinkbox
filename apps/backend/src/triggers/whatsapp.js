import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input, context = {}) {
    const body     = input?.body ?? input;
    const provider = config?.provider || "twilio";

    // ── Twilio provider ────────────────────────────────────────────────────────
    if (provider === "twilio") {
      const text      = body?.Body      ?? "";
      const from      = body?.From      ?? "";
      const numMedia  = parseInt(body?.NumMedia ?? "0", 10);

      let attachments = [];
      if (numMedia > 0 && body?.MediaUrl0) {
        try {
          let auth;
          if (config?.twilioAuthToken) {
            const token = await getOAuthToken(config.twilioAuthToken, context.workspaceId, "WhatsApp").catch(() => config.twilioAuthToken);
            if (body.AccountSid) auth = { username: body.AccountSid, password: token };
          }
          const { data: buf } = await axios.get(body.MediaUrl0, { auth, responseType: "arraybuffer", timeout: 30000 });
          const mimeType = body.MediaContentType0 || "application/octet-stream";
          attachments = [{ dataUrl: `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType, name: `media.${mimeType.split("/")[1] || "bin"}` }];
        } catch (err) {
          console.warn("[whatsapp_trigger] Twilio media download failed:", err.message);
        }
      }

      return {
        text,
        from,
        to:          body?.To          ?? "",
        messageId:   body?.MessageSid  ?? "",
        accountSid:  body?.AccountSid  ?? "",
        numMedia,
        hasMedia:    attachments.length > 0,
        attachments,
        body,
        provider:    "twilio",
      };
    }

    // ── Meta Cloud API provider ────────────────────────────────────────────────
    const entry  = body?.entry?.[0]  ?? {};
    const change = entry?.changes?.[0]?.value ?? {};
    const msg    = change?.messages?.[0] ?? {};

    let mediaInfo = null;
    let mediaType = null;
    if (msg.image)    { mediaInfo = msg.image;    mediaType = "image"; }
    else if (msg.document) { mediaInfo = msg.document; mediaType = "document"; }
    else if (msg.audio)    { mediaInfo = msg.audio;    mediaType = "audio"; }
    else if (msg.video)    { mediaInfo = msg.video;    mediaType = "video"; }
    else if (msg.sticker)  { mediaInfo = msg.sticker;  mediaType = "sticker"; }

    let attachments = [];
    if (mediaInfo?.id && config?.metaAppSecret) {
      try {
        const token = await getOAuthToken(config.metaAppSecret, context.workspaceId, "WhatsApp").catch(() => config.metaAppSecret);
        const { data: mediaData } = await axios.get(`https://graph.facebook.com/v18.0/${mediaInfo.id}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
        const { data: buf } = await axios.get(mediaData.url, { headers: { Authorization: `Bearer ${token}` }, responseType: "arraybuffer", timeout: 30000 });
        const mimeType = mediaInfo.mime_type || mediaData.mime_type || "application/octet-stream";
        const name     = mediaInfo.filename  || `${mediaType}.${mimeType.split("/")[1] || "bin"}`;
        attachments = [{ dataUrl: `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType, name }];
      } catch (err) {
        console.warn("[whatsapp_trigger] Meta media download failed:", err.message);
      }
    }

    return {
      text:           msg.text?.body     ?? msg.caption ?? "",
      from:           msg.from           ?? "",
      phoneNumberId:  change.metadata?.phone_number_id ?? "",
      displayNumber:  change.metadata?.display_phone_number ?? "",
      message:        msg,
      contacts:       change.contacts    ?? [],
      hasMedia:       attachments.length > 0,
      mediaType,
      attachments,
      provider:       "meta",
    };
  },
};
