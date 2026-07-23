/**
 * Discord — operation router. Merges every v1 resource map into one dispatch
 * table. Webhook ops are called `(config)` with the webhook URL already
 * resolved by the slim entry; Bot REST ops are called `(config, token)`.
 * Each transport keeps its own error wrapper, moved verbatim from the monolith.
 */
import { handleError, handleWebhookError } from "./GenericFunctions.js";
import { webhookOperations, WEBHOOK_OP_NAMES } from "./v1/WebhookDescription.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { channelOperations } from "./v1/ChannelDescription.js";
import { memberOperations } from "./v1/MemberDescription.js";
import { guildOperations } from "./v1/GuildDescription.js";

export const OPERATIONS = {
  ...webhookOperations,
  ...messageOperations,
  ...channelOperations,
  ...memberOperations,
  ...guildOperations,
};

export const WEBHOOK_OPS = new Set(WEBHOOK_OP_NAMES);

export const DEFAULT_OPERATION = "sendMessage";

export const OPERATION_SCHEMA = {
  sendMessage: { description: "Send a plain-text message via webhook", recommended: true },
  sendEmbed: { description: "Send a rich embed card via webhook", recommended: true },
  sendFile: { description: "Send a file attachment via webhook" },
  botSendMessage: { description: "Send a message to a channel as the bot", recommended: true },
  editMessage: { description: "Edit a message the bot sent" },
  deleteMessage: { description: "Delete a message from a channel" },
  getMessages: { description: "Read recent messages from a channel", recommended: true },
  pinMessage: { description: "Pin a message in a channel" },
  unpinMessage: { description: "Unpin a message" },
  addReaction: { description: "Add an emoji reaction to a message", recommended: true },
  removeReaction: { description: "Remove the bot's reaction from a message" },
  createThread: { description: "Start a thread from a message or in a channel" },
  createChannel: { description: "Create a channel in the server" },
  listChannels: { description: "List the server's channels" },
  getChannel: { description: "Read one channel's details" },
  addRole: { description: "Give a member a role" },
  removeRole: { description: "Remove a role from a member" },
  kickMember: { description: "Kick a member from the server" },
  banMember: { description: "Ban a member from the server" },
  unbanMember: { description: "Lift a member's ban" },
  getMember: { description: "Read one member's roles and profile" },
  listMembers: { description: "List the server's members" },
  getGuild: { description: "Read the server's metadata" },
  listRoles: { description: "List the server's roles" },
};

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Discord: Unknown operation "${op}".`, skipped: true };

  if (WEBHOOK_OPS.has(op)) {
    try {
      return await handler(config);
    } catch (err) {
      handleWebhookError(err);
    }
  }

  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
