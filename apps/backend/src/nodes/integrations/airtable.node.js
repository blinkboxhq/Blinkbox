/**
 * AIRTABLE NODE — slim entry.
 * Resolves the Airtable Personal Access Token, applies the base/table field
 * gates (with meta-op exemptions), then delegates to the modular router in
 * _packaged/airtable/ (records, bulk, schema/meta — 13 operations).
 */
import { run as runAirtable, OPERATIONS, DEFAULT_OPERATION, NO_BASE_OPS, NO_TABLE_OPS } from "../_packaged/airtable/router.js";
import { getToken, makeReq } from "../_packaged/airtable/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[operation])
      return { success: false, error: `Airtable: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };

    if (!config.credentialId) return { success: false, error: "Airtable: credential required.", skipped: true };
    if (!NO_BASE_OPS.has(operation) && !config.baseId)
      return { success: false, error: "Airtable: 'baseId' is required — configure this field.", skipped: true };
    if (!NO_TABLE_OPS.has(operation) && !config.tableName)
      return { success: false, error: "Airtable: 'tableName' is required — configure this field.", skipped: true };

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Airtable: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runAirtable(config, makeReq(token));
  },
};
