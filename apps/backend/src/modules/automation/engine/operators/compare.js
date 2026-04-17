export function compare(operator, left, right) {
  switch (operator) {
    // Equality
    case "equals":
      return left === right;
    case "notEquals":
    case "not_equals":
      return left !== right;
    case "looseEquals":
      // eslint-disable-next-line eqeqeq
      return left == right;

    // Numeric comparison
    case "gt":
    case "greater_than":
      return Number(left) > Number(right);
    case "lt":
    case "less_than":
      return Number(left) < Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lte":
      return Number(left) <= Number(right);

    // String
    case "contains":
      return String(left).includes(String(right));
    case "notContains":
    case "not_contains":
      return !String(left).includes(String(right));
    case "startsWith":
    case "starts_with":
      return String(left).startsWith(String(right));
    case "endsWith":
    case "ends_with":
      return String(left).endsWith(String(right));

    // Regex
    case "matches": {
      try {
        return new RegExp(String(right)).test(String(left));
      } catch {
        return false;
      }
    }
    case "notMatches": {
      try {
        return !new RegExp(String(right)).test(String(left));
      } catch {
        return true;
      }
    }

    // Existence / emptiness
    case "exists":
      return left !== undefined && left !== null;
    case "notExists":
      return left === undefined || left === null;
    case "isEmpty":
      if (left === undefined || left === null) return true;
      if (typeof left === "string") return left.trim() === "";
      if (Array.isArray(left)) return left.length === 0;
      if (typeof left === "object") return Object.keys(left).length === 0;
      return false;
    case "isNotEmpty":
      if (left === undefined || left === null) return false;
      if (typeof left === "string") return left.trim() !== "";
      if (Array.isArray(left)) return left.length > 0;
      if (typeof left === "object") return Object.keys(left).length > 0;
      return true;

    // Array
    case "arrayContains":
      return Array.isArray(left) && left.includes(right);
    case "arrayNotContains":
      return !Array.isArray(left) || !left.includes(right);
    case "arrayLength":
      return Array.isArray(left) && left.length === Number(right);
    case "arrayLengthGt":
      return Array.isArray(left) && left.length > Number(right);
    case "arrayLengthLt":
      return Array.isArray(left) && left.length < Number(right);

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}
