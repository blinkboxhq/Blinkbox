/**
 * ONEDRIVE — operation router. Spreads the file / folder / sharing operation
 * maps into a single OPERATIONS registry, then dispatches `run(config, ctx)`
 * → handler, funneling errors to handleError. Throws on unknown op internally;
 * the slim entry translates missing-op / missing-credential / cred-resolution
 * failures into skip objects and resolves the OAuth token before calling run.
 */
import { handleError } from "./GenericFunctions.js";
import { fileOperations } from "./v1/FileDescription.js";
import { folderOperations } from "./v1/FolderDescription.js";
import { sharingOperations } from "./v1/SharingDescription.js";

export const OPERATIONS = {
  ...fileOperations,
  ...folderOperations,
  ...sharingOperations,
};

export const DEFAULT_OPERATION = "listFiles";

export async function run(config, ctx) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`OneDrive: Unknown operation "${operation}".`);
  try {
    return await handler(config, ctx);
  } catch (err) {
    handleError(err);
  }
}
