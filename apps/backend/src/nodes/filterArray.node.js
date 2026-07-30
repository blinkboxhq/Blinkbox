/**
 * FILTER ARRAY NODE
 * Keeps only the items in an array that match a condition on a per-item field.
 *
 * Config:
 *   arrayPath   — dot-path to the array in input (blank = use input directly).
 *                 Supports bracket indexes: results.data[0].rows
 *   field       — dot-path to the field within each item to test (blank = test the item itself)
 *   operator    — equals | notEquals | contains | notContains | startsWith | endsWith |
 *                 gt | gte | lt | lte | isEmpty | isNotEmpty | exists | notExists
 *   value       — comparison value (string / number / boolean)
 *   outputKey   — key under which to return the filtered array (default: "items")
 *
 * Returns: { [outputKey]: [...], filteredCount, totalCount }
 */

const NEEDS_VALUE = new Set([
  "equals", "notEquals", "contains", "notContains",
  "startsWith", "endsWith", "gt", "gte", "lt", "lte",
]);

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

function isEmptyVal(v) {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null) return NaN;
  return Number(String(v).trim());
}

function looseEquals(actual, value) {
  if (actual === value) return true;
  if (actual == null || value == null) return actual == value;
  const an = toNumber(actual);
  const vn = toNumber(value);
  if (!Number.isNaN(an) && !Number.isNaN(vn)) return an === vn;
  const norm = (x) => String(x).trim().toLowerCase();
  return norm(actual) === norm(value);
}

function test(item, field, operator, value) {
  const actual = getPath(item, field);
  const aStr = actual == null ? "" : String(actual);
  const vStr = value == null ? "" : String(value);

  switch (operator) {
    case "equals":       return looseEquals(actual, value);
    case "notEquals":    return !looseEquals(actual, value);
    case "contains":     return aStr.toLowerCase().includes(vStr.toLowerCase());
    case "notContains":  return !aStr.toLowerCase().includes(vStr.toLowerCase());
    case "startsWith":   return aStr.toLowerCase().startsWith(vStr.toLowerCase());
    case "endsWith":     return aStr.toLowerCase().endsWith(vStr.toLowerCase());
    case "gt":           return toNumber(actual) > toNumber(value);
    case "gte":          return toNumber(actual) >= toNumber(value);
    case "lt":           return toNumber(actual) < toNumber(value);
    case "lte":          return toNumber(actual) <= toNumber(value);
    case "isEmpty":      return isEmptyVal(actual);
    case "isNotEmpty":   return !isEmptyVal(actual);
    case "exists":       return actual !== undefined && actual !== null;
    case "notExists":    return actual === undefined || actual === null;
    default:             return true;
  }
}

export default {
  async run(config = {}, input) {
    const {
      arrayPath = "",
      field = "",
      operator = "equals",
      value,
      outputKey = "items",
    } = config;

    if (NEEDS_VALUE.has(operator) && (value === undefined || value === "")) {
      throw new Error(`[filterArray] operator "${operator}" requires a value to compare against.`);
    }

    // A `{{ }}` expression in this field resolves to the array itself, not a path.
    const src = Array.isArray(arrayPath)
      ? arrayPath
      : arrayPath
        ? getPath(input, arrayPath)
        : input;

    // Upstream nodes (e.g. ai_agent with outputFormat:"json") have no fixed
    // output schema — a missing path means "nothing to filter", not a hard error.
    const arr = src == null ? [] : Array.isArray(src) ? src : [src];
    const key = String(outputKey || "items").trim() || "items";

    const filtered = arr.filter((item) => {
      try {
        return test(item, field, operator, value);
      } catch {
        return false;
      }
    });

    return {
      [key]: filtered,
      filteredCount: filtered.length,
      totalCount: arr.length,
    };
  },
};
