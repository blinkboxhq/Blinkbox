/**
 * Telegram — operation router. Merges every v1 resource map into one dispatch
 * table and runs the selected op. Handlers receive `(config, token)` where
 * `token` is the Bot Token string resolved by the backend entry.
 */
import { handleError } from "./GenericFunctions.js";
import { messagingOperations } from "./v1/MessagingDescription.js";
import { mediaOperations } from "./v1/MediaDescription.js";
import { chatOperations } from "./v1/ChatDescription.js";
import { adminOperations } from "./v1/AdminDescription.js";

export const OPERATIONS = {
  ...messagingOperations,
  ...mediaOperations,
  ...chatOperations,
  ...adminOperations,
};

export const DEFAULT_OPERATION = "sendMessage";

export const OPERATION_SCHEMA = {
  sendMessage: { description: "Send a text message to a chat", recommended: true },
  sendPoll: { description: "Send a poll or quiz to a chat" },
  sendDice: { description: "Send an animated dice / slot emoji" },
  sendLocation: { description: "Send a map location" },
  sendVenue: { description: "Send a venue with name and address" },
  sendContact: { description: "Send a phone contact card" },
  copyMessage: { description: "Copy a message to another chat without the forward header" },
  forwardMessage: { description: "Forward a message to another chat" },
  editMessage: { description: "Edit a message's text", recommended: true },
  editMessageCaption: { description: "Edit a media message's caption" },
  deleteMessage: { description: "Delete a message from a chat", recommended: true },
  sendPhoto: { description: "Send a photo by URL or file ID", recommended: true },
  sendDocument: { description: "Send a file as a document", recommended: true },
  sendVideo: { description: "Send a video" },
  sendAudio: { description: "Send an audio track" },
  sendVoice: { description: "Send a voice note" },
  sendAnimation: { description: "Send a GIF / animation" },
  sendSticker: { description: "Send a sticker" },
  sendMediaGroup: { description: "Send an album of photos or videos" },
  getChat: { description: "Read a chat's details" },
  getChatMemberCount: { description: "Count a chat's members" },
  getChatMember: { description: "Read one member's status in a chat" },
  getChatAdministrators: { description: "List a chat's admins" },
  pinMessage: { description: "Pin a message in a chat" },
  unpinMessage: { description: "Unpin a message" },
  unpinAllMessages: { description: "Unpin every message in a chat" },
  sendChatAction: { description: "Show a typing / uploading indicator" },
  setMessageReaction: { description: "React to a message with an emoji" },
  getMe: { description: "Read the bot's own profile" },
  setChatTitle: { description: "Rename a chat" },
  setChatDescription: { description: "Change a chat's description" },
  leaveChat: { description: "Make the bot leave a chat" },
  banChatMember: { description: "Ban a member from a chat" },
  unbanChatMember: { description: "Lift a member's ban" },
  restrictChatMember: { description: "Mute or limit a member's permissions" },
  promoteChatMember: { description: "Give a member admin rights" },
  createInviteLink: { description: "Create an invite link for a chat" },
  revokeInviteLink: { description: "Revoke an invite link" },
  exportInviteLink: { description: "Get the chat's primary invite link" },
};

export async function run(config, token) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Telegram: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, token);
  } catch (err) {
    handleError(err);
  }
}
