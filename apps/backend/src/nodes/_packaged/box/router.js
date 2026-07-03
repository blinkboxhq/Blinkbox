/**
 * Box — operation router. Spreads every resource's operations map into a single
 * OPERATIONS registry, then dispatches `run(config, client)` → handler,
 * funneling errors to handleError. Throws on unknown op internally; the slim
 * entry translates missing-op / missing-credential into skip objects.
 */
import { handleError } from "./GenericFunctions.js";
import { fileOperations } from "./v1/FileDescription.js";
import { folderOperations } from "./v1/FolderDescription.js";
import { sharingOperations } from "./v1/SharingDescription.js";
import { userOperations } from "./v1/UserDescription.js";

export const OPERATIONS = {
  ...fileOperations,
  ...folderOperations,
  ...sharingOperations,
  ...userOperations,
};

export const DEFAULT_OPERATION = "listFiles";

export async function run(config, client) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`Box: Unknown operation "${operation}".`);
  try {
    return await handler(config, client);
  } catch (err) {
    handleError(err);
  }
}
