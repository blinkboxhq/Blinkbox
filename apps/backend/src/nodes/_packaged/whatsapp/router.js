/**
 * WhatsApp — operation router. Merges every v1 resource map (order preserved
 * from the monolith), then dispatches. Also owns the attachment-forwarding
 * path: for media ops, an incoming `attachmentIndex` uploads the binary via
 * the Graph media endpoint and swaps in a `_mediaId` before the handler runs.
 */
import { attachmentTooLarge, handleError, uploadMedia } from "./GenericFunctions.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { mediaOperations } from "./v1/MediaDescription.js";
import { contentOperations } from "./v1/ContentDescription.js";
import { interactiveOperations } from "./v1/InteractiveDescription.js";

export const OPERATIONS = {
  sendMessage: messageOperations.sendMessage,
  sendImage: mediaOperations.sendImage,
  sendVideo: mediaOperations.sendVideo,
  sendDocument: mediaOperations.sendDocument,
  sendAudio: mediaOperations.sendAudio,
  sendSticker: mediaOperations.sendSticker,
  sendLocation: contentOperations.sendLocation,
  sendContact: contentOperations.sendContact,
  sendReaction: contentOperations.sendReaction,
  sendButtons: interactiveOperations.sendButtons,
  sendList: interactiveOperations.sendList,
  sendTemplate: messageOperations.sendTemplate,
  markRead: messageOperations.markRead,
};

export const DEFAULT_OPERATION = "sendMessage";

export async function run(config, input, token) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler)
    return { success: false, error: `WhatsApp: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };

  // Allow forwarding attachments from previous node output (standalone canvas use)
  let resolvedConfig = config;
  if (["sendImage", "sendVideo", "sendDocument", "sendAudio", "sendSticker"].includes(operation) && typeof config.attachmentIndex === "number") {
    const att = Array.isArray(input?.attachments) ? input.attachments[config.attachmentIndex] : null;
    if (att?.dataUrl) {
      const base64Data = att.dataUrl.includes(",") ? att.dataUrl.split(",")[1] : att.dataUrl;
      const tooBig = attachmentTooLarge(base64Data, operation);
      if (tooBig) return tooBig;
    }
    if (att) {
      try {
        const mediaId = await uploadMedia(config.phoneNumberId, token, att);
        const urlKey = { sendImage: "imageUrl", sendVideo: "videoUrl", sendDocument: "documentUrl", sendAudio: "audioUrl", sendSticker: "stickerUrl" }[operation];
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
}
