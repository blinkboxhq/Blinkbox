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
export const OPERATION_SCHEMA = {
  readRange:   { description: "Read a cell range as rows", recommended: true, scopes: ["spreadsheets.readonly"] },
  appendRow:   { description: "Append a row to the bottom of a sheet", recommended: true, scopes: ["spreadsheets"] },
  lookupRow:   { description: "Find the first row where a column matches a value", recommended: true, scopes: ["spreadsheets.readonly"] },
  updateRow:   { description: "Overwrite the values of an existing row", recommended: true, scopes: ["spreadsheets"] },
  writeRange:  { description: "Write values into a specific range", recommended: true, scopes: ["spreadsheets"] },
  deleteRow:   { description: "Delete a row by index", scopes: ["spreadsheets"] },
  getSheet:    { description: "List the tabs in a spreadsheet", scopes: ["spreadsheets.readonly"] },
};


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
