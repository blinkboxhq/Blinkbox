/**
 * Airtable — operation router. Merges record, bulk, and meta maps (order
 * preserved from the monolith), then dispatches. Exposes NO_BASE_OPS /
 * NO_TABLE_OPS so the slim entry can apply the same field-gate exemptions.
 */
import { handleError } from "./GenericFunctions.js";
import { recordOperations } from "./v1/RecordDescription.js";
import { bulkOperations } from "./v1/BulkDescription.js";
import { metaOperations } from "./v1/MetaDescription.js";

export const OPERATIONS = {
  create: recordOperations.create,
  read: recordOperations.read,
  update: recordOperations.update,
  delete: recordOperations.delete,
  bulkDelete: bulkOperations.bulkDelete,
  getRecord: recordOperations.getRecord,
  search: recordOperations.search,
  bulkCreate: bulkOperations.bulkCreate,
  bulkUpdate: bulkOperations.bulkUpdate,
  listBases: metaOperations.listBases,
  listTables: metaOperations.listTables,
  createTable: metaOperations.createTable,
  createField: metaOperations.createField,
};

export const NO_TABLE_OPS = new Set(["listBases", "listTables", "createTable", "createField"]);
export const NO_BASE_OPS = new Set(["listBases"]);

export const DEFAULT_OPERATION = "create";

export const OPERATION_SCHEMA = {
  create: { description: "Create one record in a table", recommended: true },
  read: { description: "List records from a table, filterable by formula", recommended: true },
  update: { description: "Update fields on an existing record", recommended: true },
  delete: { description: "Delete one record" },
  bulkDelete: { description: "Delete up to 10 records at once" },
  getRecord: { description: "Read one record by ID", recommended: true },
  search: { description: "Find records matching a field value or formula", recommended: true },
  bulkCreate: { description: "Create up to 10 records at once" },
  bulkUpdate: { description: "Update up to 10 records at once" },
  listBases: { description: "List the bases the token can access" },
  listTables: { description: "List a base's tables and their fields" },
  createTable: { description: "Create a table in a base" },
  createField: { description: "Add a field to a table" },
};

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Airtable: Unknown operation "${op}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
