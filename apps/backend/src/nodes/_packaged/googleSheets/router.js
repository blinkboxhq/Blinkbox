/**
 * Google Sheets — operation router. Merges every v1 resource map into one
 * dispatch table; handlers are called `(config, token)` exactly as the
 * monolith did.
 */
import { handleError } from "./GenericFunctions.js";
import { valueOperations } from "./v1/ValueDescription.js";
import { rowOperations } from "./v1/RowDescription.js";
import { sheetOperations } from "./v1/SheetDescription.js";

export const OPERATIONS = {
  ...valueOperations,
  ...rowOperations,
  ...sheetOperations,
};

export const DEFAULT_OPERATION = "readRange";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Google Sheets: Unknown operation "${op}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
