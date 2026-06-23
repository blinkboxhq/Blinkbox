export default {
  async run(config, input) {
    const data = config.data || input?.data || input;
    const rows = Array.isArray(data) ? data : [data];
    if (!rows.length) return { result: "", rows: 0 };

    const delimiter = config.delimiter || ",";
    const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(delimiter) || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(escape).join(delimiter), ...rows.map((r) => headers.map((h) => escape(r[h])).join(delimiter))];
    return { result: lines.join("\n"), headers, rows: rows.length };
  },
};
