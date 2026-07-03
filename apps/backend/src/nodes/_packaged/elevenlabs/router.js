/**
 * ELEVENLABS — operation router. Spreads the speech and voice/model/user/history
 * operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, apiKey)` → handler, funneling errors to handleError. Throws on
 * unknown op with the original double-quoted message text that lists valid ops.
 * All handlers use the (config, apiKey) signature. Handlers receive (config, apiKey).
 */
import { handleError } from "./GenericFunctions.js";
import { speechOperations } from "./v1/SpeechDescription.js";
import { voiceOperations } from "./v1/VoiceDescription.js";

export const OPERATIONS = {
  ...speechOperations,
  ...voiceOperations,
};

export const DEFAULT_OPERATION = "textToSpeech";

export function unknownOperationError(operation) {
  return new Error(`ElevenLabs: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);
}

export async function run(config, apiKey) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw unknownOperationError(operation);
  try {
    return await handler(config, apiKey);
  } catch (err) {
    handleError(err);
  }
}
