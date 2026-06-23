export function evaluateCondition(condition, context) {
  if (!condition || condition === "always" || condition === "true") return true;
  if (condition === "false") return false;
  if (typeof condition === "object" && Object.keys(condition).length === 0) return true;

  // Support v2 structured conditions with type field
  if (condition.type === "always") return true;

  const { operator, left, right } = condition;

  const resolve = (value) => {
    if (typeof value === "string" && value.startsWith("{{")) {
      const path = value.replace(/[{}\s\u200B-\u200D\uFEFF]/g, "").split(".");
      return path.reduce((obj, key) => obj?.[key], context);
    }
    return value;
  };

  const l = resolve(left);
  const r = resolve(right);

  switch (operator) {
    // Equality — use loose equality for type coercion ("5" == 5)
    case "equals":
      return l == r;
    case "strictEquals":
      return l === r;
    case "not_equals":
    case "notEquals":
      return l != r;

    // Numeric comparisons
    case "greater_than":
    case "gt":
      return Number(l) > Number(r);
    case "less_than":
    case "lt":
      return Number(l) < Number(r);
    case "gte":
      return Number(l) >= Number(r);
    case "lte":
      return Number(l) <= Number(r);

    // String operators
    case "contains":
      return String(l).includes(String(r));
    case "notContains":
      return !String(l).includes(String(r));
    case "startsWith":
      return String(l).startsWith(String(r));
    case "endsWith":
      return String(l).endsWith(String(r));

    // Existence checks
    case "exists":
      return l !== undefined && l !== null;
    case "isEmpty":
      return l === undefined || l === null || l === "" ||
             (Array.isArray(l) && l.length === 0);
    case "isNotEmpty":
      return l !== undefined && l !== null && l !== "" &&
             !(Array.isArray(l) && l.length === 0);

    default:
      return false;
  }
}
