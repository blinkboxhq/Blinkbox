/**
 * Google Drive — operation router. Merges every v1 resource map into one
 * dispatch table; handlers are called `(config, token, context)` exactly as
 * the monolith did (context is unused today but preserved).
 */
import { handleError } from "./GenericFunctions.js";
import { fileOperations } from "./v1/FileDescription.js";
import { permissionOperations } from "./v1/PermissionDescription.js";
import { driveOperations } from "./v1/DriveDescription.js";

export const OPERATIONS = {
  ...fileOperations,
  ...permissionOperations,
  ...driveOperations,
};

export const DEFAULT_OPERATION = "listFiles";

export async function run(config, req, context = {}) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Google Drive: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req, context);
  } catch (err) {
    handleError(err);
  }
}
