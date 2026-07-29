/**
 * SORT ARRAY NODE
 * Reorders the items in an array by a per-item field value.
 *
 * Config:
 *   arrayPath    — dot-path to the array in input (blank = use input directly).
 *                  Supports bracket indexes: results.data[0].rows
 *   field        — dot-path to the field to sort by (blank = sort primitives directly)
 *   direction    — "asc" (default) | "desc"
 *   type         — "auto" (default) | "string" | "number" | "date"
 *   missingLast  — when true (default) null/empty fields sink to the bottom
 *   outputKey    — key for the result array (default: "items")
 *
 * Returns: { [outputKey]: [...], count }
 */

function getPath(obj, path) {
  if (obj == null) return undefined;
  if (!path) return obj;
  const parts = String(path)
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let acc = obj;
  for (const key of parts) {
    if (acc == null) return undefined;
    acc = acc[key];
  }
  return acc;
}

function isMissing(v) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/;

function coerce(val, type) {
  if (type === "number") return Number(val);
  if (type === "date") return new Date(val).getTime();
  if (type === "string") return String(val ?? "").toLowerCase();

  // auto: detect number → date → fall back to string
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
  const s = String(val ?? "").trim();
  if (s === "") return "";
  if (DATE_RE.test(s)) {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;
  }
  const n = Number(s);
  if (!Number.isNaN(n) && s !== "") return n;
  return s.toLowerCase();
}

function compare(av, bv) {
  if (typeof av === "number" && typeof bv === "number") {
    if (Number.isNaN(av) && Number.isNaN(bv)) return 0;
    if (Number.isNaN(av)) return 1;
    if (Number.isNaN(bv)) return -1;
    return av - bv;
  }
  // natural string compare (handles "item2" < "item10")
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
}

export default {
  async run(config = {}, input) {
    const {
      arrayPath = "",
      field = "",
      direction = "asc",
      type = "auto",
      missingLast = true,
      outputKey = "items",
    } = config;

    // A `{{ }}` expression in this field resolves to the array itself, not a path.
    const src = Array.isArray(arrayPath)
      ? arrayPath
      : arrayPath
        ? getPath(input, arrayPath)
        : input;

    if (src == null) {
      throw new Error(`[sortArray] no array found at path "${arrayPath || "(input)"}".`);
    }

    const arr = Array.isArray(src) ? src : [src];
    const key = String(outputKey || "items").trim() || "items";
    const dir = direction === "desc" ? -1 : 1;
    const sinkMissing = missingLast !== false;

    // Decorate-sort-undecorate keeps the sort stable and coerces each field once.
    const decorated = arr.map((item, idx) => {
      const raw = field ? getPath(item, field) : item;
      return { item, idx, raw, missing: isMissing(raw) };
    });

    decorated.sort((a, b) => {
      if (a.missing || b.missing) {
        if (a.missing && b.missing) return a.idx - b.idx;
        if (sinkMissing) return a.missing ? 1 : -1;      // missing always at end, ignore dir
        return (a.missing ? -1 : 1) * dir;
      }
      const cmp = compare(coerce(a.raw, type), coerce(b.raw, type));
      if (cmp !== 0) return cmp * dir;
      return a.idx - b.idx; // stable tie-break
    });

    const sorted = decorated.map((d) => d.item);
    return { [key]: sorted, count: sorted.length };
  },
};
