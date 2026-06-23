/**
 * CSV PARSER NODE
 * Convert between CSV text and JSON arrays (bidirectional).
 *
 * Config:
 *   mode        — "toJson" (default) | "toCsv"
 *   csv         — CSV string to parse (toJson mode) — supports {{ expressions }}
 *   data        — array / expression to convert to CSV (toCsv mode)
 *   delimiter   — field delimiter (default: ",")
 *   hasHeader   — whether first row is a header (default: true) — toJson only
 *   outputKey   — key for the parsed rows (default: "rows") — toJson only
 */

function parseCSV(text, delimiter, hasHeader) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const split = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current); current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  if (hasHeader) {
    const headers = split(lines[0]);
    return lines.slice(1).filter(Boolean).map((line) => {
      const vals = split(line);
      return headers.reduce((obj, h, i) => { obj[h] = vals[i] ?? ""; return obj; }, {});
    });
  }
  return lines.filter(Boolean).map((line) => split(line));
}

function toCSV(data, delimiter) {
  if (!Array.isArray(data) || data.length === 0) return "";
  const rows = typeof data[0] === "object" && !Array.isArray(data[0]) ? data : null;

  const escapeField = (v) => {
    const s = String(v ?? "");
    return s.includes(delimiter) || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };

  if (rows) {
    const headers = Object.keys(rows[0]);
    const headerLine = headers.map(escapeField).join(delimiter);
    const dataLines = rows.map((row) => headers.map((h) => escapeField(row[h])).join(delimiter));
    return [headerLine, ...dataLines].join("\n");
  }
  return data.map((row) => (Array.isArray(row) ? row.map(escapeField).join(delimiter) : escapeField(row))).join("\n");
}

export default {
  async run(config, input) {
    const { mode = "toJson", delimiter = ",", hasHeader = true, outputKey = "rows" } = config;

    if (mode === "toJson") {
      const csvText = config.csv ?? (typeof input === "string" ? input : input?.csv ?? "");
      if (!csvText) return { success: false, error: "CSV Parser: 'csv' input is required for toJson mode — configure this field.", skipped: true };
      const rows = parseCSV(String(csvText), delimiter, hasHeader);
      return { [outputKey]: rows, count: rows.length };
    }

    if (mode === "toCsv") {
      let data = config.data ?? input?.items ?? input;
      if (typeof data === "string") { try { data = JSON.parse(data); } catch {} }
      if (!Array.isArray(data)) throw new Error("CSV Parser: 'data' must be an array for toCsv mode.");
      const csv = toCSV(data, delimiter);
      return { csv, rowCount: data.length };
    }

    throw new Error(`CSV Parser: Unknown mode "${mode}". Use "toJson" or "toCsv".`);
  },
};
