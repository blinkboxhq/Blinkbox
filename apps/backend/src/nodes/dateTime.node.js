/**
 * DATE/TIME NODE
 * Format, parse, add/subtract, compare, and convert dates.
 *
 * Config:
 *   operation  — "format" | "parse" | "add" | "subtract" | "diff" | "now" | "convert"
 *   date       — input date string / timestamp / ISO (not needed for "now")
 *   format     — output format tokens: YYYY MM DD HH mm ss (default: ISO)
 *   parseFormat — input format hint for "parse" (optional)
 *   amount     — number for add/subtract
 *   unit       — "ms" | "s" | "m" | "h" | "d" | "w" | "M" | "y"
 *   date2      — second date for "diff" operation
 *   timezone   — IANA tz string for "convert" (e.g. "America/New_York")
 */

function parseDate(input) {
  if (input == null || input === "") return new Date();
  if (typeof input === "number") return new Date(input);
  return new Date(input);
}

const UNIT_MS = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, M: 2592000000, y: 31536000000 };

function formatDate(d, fmt) {
  if (!fmt || fmt === "iso") return d.toISOString();
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  return fmt
    .replace("YYYY", d.getFullYear())
    .replace("YY",   String(d.getFullYear()).slice(-2))
    .replace("MM",   pad(d.getMonth() + 1))
    .replace("M",    d.getMonth() + 1)
    .replace("DD",   pad(d.getDate()))
    .replace("D",    d.getDate())
    .replace("HH",   pad(d.getHours()))
    .replace("H",    d.getHours())
    .replace("mm",   pad(d.getMinutes()))
    .replace("m",    d.getMinutes())
    .replace("ss",   pad(d.getSeconds()))
    .replace("s",    d.getSeconds())
    .replace("SSS",  pad(d.getMilliseconds(), 3));
}

export default {
  async run(config, input) {
    const { operation = "now", date, date2, format, amount, unit = "d", timezone } = config;

    switch (operation) {
      case "now": {
        const now = new Date();
        return { date: formatDate(now, format), timestamp: now.getTime(), iso: now.toISOString() };
      }

      case "format": {
        const d = parseDate(date ?? input?.date);
        if (isNaN(d)) throw new Error("DateTime: Invalid date input for 'format'.");
        return { date: formatDate(d, format), timestamp: d.getTime(), iso: d.toISOString() };
      }

      case "parse": {
        const raw = date ?? input?.date;
        const d = parseDate(raw);
        if (isNaN(d)) throw new Error(`DateTime: Cannot parse date from "${raw}".`);
        return {
          iso: d.toISOString(),
          timestamp: d.getTime(),
          year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
          hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds(),
          weekday: d.toLocaleString("en-US", { weekday: "long" }),
        };
      }

      case "add":
      case "subtract": {
        const d = parseDate(date ?? input?.date);
        if (isNaN(d)) throw new Error("DateTime: Invalid date for add/subtract.");
        const ms = Number(amount ?? 1) * (UNIT_MS[unit] ?? UNIT_MS.d);
        const result = new Date(d.getTime() + (operation === "add" ? ms : -ms));
        return { date: formatDate(result, format), timestamp: result.getTime(), iso: result.toISOString() };
      }

      case "diff": {
        const d1 = parseDate(date ?? input?.date);
        const d2 = parseDate(date2 ?? input?.date2);
        if (isNaN(d1) || isNaN(d2)) return { success: false, error: "DateTime: Both 'date' and 'date2' are required for diff.", skipped: true };
        const diffMs = d2.getTime() - d1.getTime();
        return {
          ms: diffMs, s: diffMs / 1000, m: diffMs / 60000,
          h: diffMs / 3600000, d: diffMs / 86400000,
          absolute: Math.abs(diffMs),
        };
      }

      case "convert": {
        const d = parseDate(date ?? input?.date);
        if (isNaN(d)) throw new Error("DateTime: Invalid date for 'convert'.");
        const converted = timezone
          ? d.toLocaleString("en-CA", { timeZone: timezone, hour12: false }).replace(", ", "T")
          : d.toISOString();
        return { date: converted, timezone: timezone ?? "UTC", iso: d.toISOString() };
      }

      default:
        throw new Error(`DateTime: Unknown operation "${operation}". Valid: now | format | parse | add | subtract | diff | convert`);
    }
  },
};
