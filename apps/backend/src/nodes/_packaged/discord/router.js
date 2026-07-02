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
