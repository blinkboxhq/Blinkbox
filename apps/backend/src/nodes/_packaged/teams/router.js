/**
 * TEAMS — operation router. Spreads the message / channel / meeting operation
 * maps into a single OPERATIONS registry, then dispatches
 * `run(config, client)` → handler, funneling errors to handleError. Throws on
 * unknown op internally; the slim entry preserves the monolith's skip contract
 * by checking OPERATIONS before dispatching.
 */
import { handleError } from "./GenericFunctions.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { channelOperations } from "./v1/ChannelDescription.js";
import { meetingOperations } from "./v1/MeetingDescription.js";

export const OPERATIONS = {
  ...messageOperations,
  ...channelOperations,
  ...meetingOperations,
};

export const DEFAULT_OPERATION = "sendMessage";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Teams: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}
