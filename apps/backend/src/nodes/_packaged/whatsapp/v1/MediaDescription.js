/**
 * WhatsApp — media operations: image, video, document, audio, sticker.
 * Each accepts either a hosted URL (`link`) or a pre-uploaded media id
 * (`config._mediaId`, set by the entry's attachment-forwarding path).
 * Handlers receive `(config, token)`.
 */
import { send } from "../GenericFunctions.js";

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

async function opSendVideo(config, token) {
  const { phoneNumberId, to, videoUrl } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendVideo: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendVideo: 'to' is required.", skipped: true };
  if (!videoUrl && !config._mediaId) return { success: false, error: "WhatsApp sendVideo: 'videoUrl' or an attachment is required.", skipped: true };
  if (videoUrl && !/^https?:\/\//i.test(videoUrl)) throw new Error("WhatsApp sendVideo: 'videoUrl' must be an http/https URL.");

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp", to, type: "video",
    video: config._mediaId
      ? { id: config._mediaId, caption: config.caption || undefined }
      : { link: videoUrl, caption: config.caption || undefined },
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

async function opSendSticker(config, token) {
  const { phoneNumberId, to, stickerUrl } = config;
  if (!phoneNumberId) return { success: false, error: "WhatsApp sendSticker: 'phoneNumberId' is required.", skipped: true };
  if (!to) return { success: false, error: "WhatsApp sendSticker: 'to' is required.", skipped: true };
  if (!stickerUrl && !config._mediaId) return { success: false, error: "WhatsApp sendSticker: 'stickerUrl' or an attachment is required.", skipped: true };
  if (stickerUrl && !/^https?:\/\//i.test(stickerUrl)) throw new Error("WhatsApp sendSticker: 'stickerUrl' must be an http/https URL.");

  return send(phoneNumberId, token, {
    messaging_product: "whatsapp", to, type: "sticker",
    sticker: config._mediaId ? { id: config._mediaId } : { link: stickerUrl },
  });
}

export const mediaOperations = {
  sendImage: opSendImage,
  sendVideo: opSendVideo,
  sendDocument: opSendDocument,
  sendAudio: opSendAudio,
  sendSticker: opSendSticker,
};
