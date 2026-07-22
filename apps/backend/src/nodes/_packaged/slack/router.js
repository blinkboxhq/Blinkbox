/**
 * Slack — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, token)`; the slim entry resolves the
 * Bot Token and passes it (via makeReq) through unchanged.
 */
import { handleError } from "./GenericFunctions.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { fileOperations } from "./v1/FileDescription.js";
import { channelOperations } from "./v1/ChannelDescription.js";
import { userOperations } from "./v1/UserDescription.js";

export const OPERATIONS = {
  ...messageOperations,
  ...fileOperations,
  ...channelOperations,
  ...userOperations,
};

export const DEFAULT_OPERATION = "postMessage";
export const OPERATION_SCHEMA = {
  postMessage:      { description: "Send a plain-text message to a channel or user", recommended: true, scopes: ["chat:write"] },
  replyInThread:    { description: "Reply inside an existing message thread", recommended: true, scopes: ["chat:write"] },
  uploadFile:       { description: "Upload a file to a channel", recommended: true, scopes: ["files:write"] },
  listChannels:     { description: "List the channels the bot can see", recommended: true, scopes: ["channels:read"] },
  getChannelHistory:{ description: "Read recent messages from a channel", recommended: true, scopes: ["channels:history"] },
  postRichMessage:  { description: "Send a message with Block Kit blocks or attachments", scopes: ["chat:write"] },
  sendDM:           { description: "Open a DM with a user and send them a message", scopes: ["chat:write", "im:write"] },
  addReaction:      { description: "Add an emoji reaction to a message", scopes: ["reactions:write"] },
  getUser:          { description: "Look up a user by email or ID", scopes: ["users:read", "users:read.email"] },
  deleteMessage:    { description: "Delete a message the bot posted", scopes: ["chat:write"] },
};


export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Slack: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
