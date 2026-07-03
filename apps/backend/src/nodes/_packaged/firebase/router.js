/**
 * FIREBASE — operation router. Spreads the firestore / auth / messaging
 * operation maps into a single OPERATIONS registry, then dispatches
 * `run(config, fb)` → handler, funneling errors to handleError. Throws on
 * unknown op (the monolith's switch default threw), with the original
 * single-quoted message text. Handlers receive (config, { db, auth, messaging }).
 */
import { handleError } from "./GenericFunctions.js";
import { firestoreOperations } from "./v1/FirestoreDescription.js";
import { authOperations } from "./v1/AuthDescription.js";
import { messagingOperations } from "./v1/MessagingDescription.js";

export const OPERATIONS = {
  ...firestoreOperations,
  ...authOperations,
  ...messagingOperations,
};

export const DEFAULT_OPERATION = "getDocument";

export async function run(config, fb) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Firebase: Unknown operation '${operation}'.`);
  try {
    return await handler(config, fb);
  } catch (err) {
    handleError(err);
  }
}
