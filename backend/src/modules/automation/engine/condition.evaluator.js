export function evaluateCondition(condition, context) {
  if (!condition || condition === "always") return true;
  if (condition === "true") return true;
  if (condition === "false") return false;

  const { operator, left, right } = condition;

  const resolve = (value) => {
    if (typeof value === "string" && value.startsWith("{{")) {
      const path = value.replace(/[{}]/g, "").split(".");
      return path.reduce((obj, key) => obj?.[key], context);
    }
    return value;
  };

  const l = resolve(left);
  const r = resolve(right);

  switch (operator) {
    case "equals":
      return l === r;
    case "not_equals":
      return l !== r;
    case "greater_than":
      return l > r;
    case "less_than":
      return l < r;
    case "exists":
      return l !== undefined && l !== null;
    default:
      return false;
  }
}
