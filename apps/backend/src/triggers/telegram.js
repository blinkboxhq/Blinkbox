import axios from "axios";
import crypto from "crypto";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input, context = {}) {
    const body = input?.body ?? input;
    const headers = input?.headers ?? {};

    // ── Secret token verification (timing-safe, like n8n v1.2+) ─────────────
    if (config?.telegramSecretToken) {
      try {
        const secret = await getOAuthToken(config.telegramSecretToken, context.workspaceId, "Telegram").catch(() => config.telegramSecretToken);
        const provided = headers["x-telegram-bot-api-secret-token"] ?? "";
        const secretBuf = Buffer.from(String(secret));
        const providedBuf = Buffer.from(String(provided));
        if (
          secretBuf.byteLength !== providedBuf.byteLength ||
          !crypto.timingSafeEqual(secretBuf, providedBuf)
        ) {
          throw new Error("[telegram_trigger] Invalid secret token");
        }
      } catch (err) {
        if (err.message.includes("Invalid secret token")) throw err;
        console.warn("[telegram_trigger] Secret token check error:", err.message);
      }
    }

    const msg = body?.message ?? body?.edited_message ?? body?.channel_post ?? {};

    // ── Chat ID / User ID filtering (like n8n v1.2) ───────────────────────────
    if (config?.allowedChatIds) {
      const allowed = String(config.allowedChatIds).split(",").map((s) => s.trim()).filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(String(msg?.chat?.id ?? ""))) {
        return null;
      }
    }

    if (config?.allowedUserIds) {
      const allowed = String(config.allowedUserIds).split(",").map((s) => s.trim()).filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(String(msg?.from?.id ?? ""))) {
        return null;
      }
    }

    // ── Media resolution ──────────────────────────────────────────────────────
    let mediaFileId   = null;
    let mediaMimeType = "application/octet-stream";
    let mediaName     = "file";
    let mediaType     = null;

    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      const idx  = msg.photo.length >= 3 ? msg.photo.length - 2 : msg.photo.length >= 2 ? 1 : 0;
      const best = msg.photo[idx];
      mediaFileId = best.file_id; mediaMimeType = "image/jpeg"; mediaName = "photo.jpg"; mediaType = "photo";
    } else if (msg.document) {
      mediaFileId = msg.document.file_id; mediaMimeType = msg.document.mime_type || "application/octet-stream"; mediaName = msg.document.file_name || "document"; mediaType = "document";
    } else if (msg.video) {
      mediaFileId = msg.video.file_id; mediaMimeType = msg.video.mime_type || "video/mp4"; mediaName = msg.video.file_name || "video.mp4"; mediaType = "video";
    } else if (msg.audio) {
      mediaFileId = msg.audio.file_id; mediaMimeType = msg.audio.mime_type || "audio/mpeg"; mediaName = msg.audio.file_name || "audio.mp3"; mediaType = "audio";
    } else if (msg.voice) {
      mediaFileId = msg.voice.file_id; mediaMimeType = "audio/ogg"; mediaName = "voice.ogg"; mediaType = "voice";
    } else if (msg.sticker) {
      mediaFileId = msg.sticker.file_id; mediaMimeType = msg.sticker.is_animated ? "application/x-tgsticker" : "image/webp"; mediaName = "sticker.webp"; mediaType = "sticker";
    }

    let attachments = [];
    if (mediaFileId && config?.botToken) {
      try {
        const token = await getOAuthToken(config.botToken, context.workspaceId, "Telegram").catch(() => config.botToken);
        const { data: fileInfo } = await axios.get(`https://api.telegram.org/bot${token}/getFile`, { params: { file_id: mediaFileId }, timeout: 10000 });
        const filePath = fileInfo?.result?.file_path;
        if (filePath) {
          const { data: buf } = await axios.get(`https://api.telegram.org/file/bot${token}/${filePath}`, { responseType: "arraybuffer", timeout: 30000 });
          attachments = [{ dataUrl: `data:${mediaMimeType};base64,${Buffer.from(buf).toString("base64")}`, mimeType: mediaMimeType, name: mediaName }];
        }
      } catch (err) {
        console.warn("[telegram_trigger] Media download failed:", err.message);
      }
    }

    return {
      text:      msg.text ?? msg.caption ?? "",
      from:      msg.from ?? {},
      chat:      msg.chat ?? {},
      date:      msg.date ?? null,
      messageId: msg.message_id ?? null,
      updateId:  body?.update_id ?? null,
      hasMedia:  attachments.length > 0,
      mediaType,
      attachments,
    };
  },
};
