/**
 * GOOGLE SHEETS NODE — slim entry.
 * Resolves the Google OAuth credential, then delegates to the modular router
 * in _packaged/googleSheets/ (values, rows, sheets/spreadsheets — 15
 * operations).
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runGoogleSheets, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/googleSheets/router.js";
import { makeReq } from "../_packaged/googleSheets/GenericFunctions.js";

const NO_SPREADSHEET_OPS = new Set(["createSpreadsheet"]);

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!OPERATIONS[operation])
      return { success: false, error: `Google Sheets: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`, skipped: true };

    if (!NO_SPREADSHEET_OPS.has(operation) && !config.spreadsheetId) return { success: false, error: "Google Sheets: 'spreadsheetId' is required.", skipped: true };
    if (!config.credentialId) return { success: false, error: "Google Sheets: No credential selected.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Google Sheets");
    } catch (e) {
      return { success: false, error: `Google Sheets: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runGoogleSheets(config, makeReq(token));
  },
};
