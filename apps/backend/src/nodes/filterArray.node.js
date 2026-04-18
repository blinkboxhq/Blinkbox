/**
 * FILTER ARRAY NODE
 * Filters an array by a condition on each item's field.
 *
 * Config:
 *   arrayPath   — dot-path to the array in input (blank = use input directly)
 *   field       — dot-path to the field within each item to test
 *   operator    — equals | notEquals | contains | notContains | gt | gte | lt | lte |
 *                 startsWith | endsWith | isEmpty | isNotEmpty | exists
 *   value       — comparison value (string / number / boolean)
 *   outputKey   — key under which to return the filtered array (default: "items")
 */

function getPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

function test(item, field, operator, value) {
  const actual = getPath(item, field);
  switch (operator) {
    case "equals":        return String(actual) === String(value);
    case "notEquals":     return String(actual) !== String(value);
    case "contains":      return String(actual ?? "").includes(String(value));
    case "notContains":   return !String(actual ?? "").includes(String(value));
    case "startsWith":    return String(actual ?? "").startsWith(String(value));
    case "endsWith":      return String(actual ?? "").endsWith(String(value));
    case "gt":            return Number(actual) > Number(value);
    case "gte":           return Number(actual) >= Number(value);
    case "lt":            return Number(actual) < Number(value);
    case "lte":           return Number(actual) <= Number(value);
    case "isEmpty":       return actual == null || actual === "" || (Array.isArray(actual) && actual.length === 0);
    case "isNotEmpty":    return actual != null && actual !== "" && !(Array.isArray(actual) && actual.length === 0);
    case "exists":        return actual !== undefined && actual !== null;
    case "notExists":     return actual === undefined || actual === null;
    default:              return true;
  }
}

export default {
  async run(config, input) {
    const { arrayPath, field = "", operator = "exists", value, outputKey = "items" } = config;

    const src = arrayPath ? getPath(input, arrayPath) : input;
    const arr = Array.isArray(src) ? src : [src];

    const filtered = arr.filter((item) => test(item, field, operator, value));

    return { [outputKey]: filtered, count: filtered.length, total: arr.length };
  },
};
