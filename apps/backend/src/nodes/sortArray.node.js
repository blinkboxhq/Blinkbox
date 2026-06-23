/**
 * SORT ARRAY NODE
 * Sorts an array by a field value.
 *
 * Config:
 *   arrayPath  — dot-path to the array in input (blank = use input directly)
 *   field      — dot-path to field to sort by
 *   direction  — "asc" (default) | "desc"
 *   type       — "auto" (default) | "string" | "number" | "date"
 *   outputKey  — key for the result array (default: "items")
 */

function getPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

function coerce(val, type) {
  if (type === "number") return Number(val);
  if (type === "date")   return new Date(val).getTime();
  if (type === "string") return String(val ?? "").toLowerCase();
  // auto: detect
  if (val instanceof Date || (typeof val === "string" && !isNaN(Date.parse(val)) && /\d{4}-\d{2}-\d{2}/.test(val))) {
    return new Date(val).getTime();
  }
  const n = Number(val);
  if (!isNaN(n)) return n;
  return String(val ?? "").toLowerCase();
}

export default {
  async run(config, input) {
    const { arrayPath, field = "", direction = "asc", type = "auto", outputKey = "items" } = config;

    const src = arrayPath ? getPath(input, arrayPath) : input;
    const arr = Array.isArray(src) ? src : [src];

    const sorted = [...arr].sort((a, b) => {
      const av = coerce(getPath(a, field), type);
      const bv = coerce(getPath(b, field), type);
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return direction === "desc" ? -cmp : cmp;
    });

    return { [outputKey]: sorted, count: sorted.length };
  },
};
