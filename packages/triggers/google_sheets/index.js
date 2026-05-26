import axios from "axios";
import { getOAuthToken } from "../../../apps/backend/src/utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.rows) return input;
    const token = await getOAuthToken(config.credentialId, config.workspaceId, "Google Sheets");
    const spreadsheetId = config.spreadsheetId;
    if (!spreadsheetId) throw new Error("[google_sheets_trigger] spreadsheetId is required");
    const range = config.range || `${config.sheetName || "Sheet1"}!A:Z`;
    const { data } = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      { headers: { Authorization: `Bearer ${token}` }, params: { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "FORMATTED_STRING" }, timeout: 15000 }
    );
    const rawRows = data?.values ?? [];
    const headers = rawRows[0] ?? [];
    const dataRows = rawRows.slice(1);
    const lastN = Math.min(config.lastNRows || 5, dataRows.length);
    const latestRows = dataRows.slice(-lastN).map((row, i) => {
      const obj = {};
      headers.forEach((h, j) => { obj[h || `col${j + 1}`] = row[j] ?? null; });
      obj._rowIndex = dataRows.length - lastN + i + 2;
      return obj;
    });
    return {
      spreadsheetId, range, sheetName: config.sheetName || "Sheet1",
      headers, totalRows: dataRows.length, newRows: latestRows,
      latestRow: latestRows[latestRows.length - 1] ?? null,
      triggeredAt: new Date().toISOString(),
    };
  },
};
