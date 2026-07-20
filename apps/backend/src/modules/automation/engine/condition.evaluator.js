const MAX_PATTERN_LENGTH = 200;
const MAX_SUBJECT_LENGTH = 10000;

// User-authored patterns run on user data, so a catastrophic-backtracking pattern
// would block the worker's event loop. Capping both pattern and subject length
// bounds the worst case to a few ms without needing a regex sandbox.
function safeRegexTest(pattern, subject) {
  const p = String(pattern ?? "");
  if (!p || p.length > MAX_PATTERN_LENGTH) return false;
  try {
    return new RegExp(p).test(String(subject ?? "").slice(0, MAX_SUBJECT_LENGTH));
  } catch {
    return false;
  }
}

function toList(value) {
  if (Array.isArray(value)) return value;
  return String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

function isNumeric(v) {
  return v !== null && v !== "" && typeof v !== "boolean" && !Number.isNaN(Number(v));
}

function orderedCompare(l, r, compare) {
  if (isNumeric(l) && isNumeric(r)) return compare(Number(l), Number(r));
  const ld = Date.parse(l);
  const rd = Date.parse(r);
  if (!Number.isNaN(ld) && !Number.isNaN(rd)) return compare(ld, rd);
  return compare(Number(l), Number(r));
}

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
    // Pattern matching
    case "regex":
      return safeRegexTest(r, l);
    case "notRegex":
      return !safeRegexTest(r, l);

    // Membership — right side is a comma-separated list
    case "in":
      return toList(r).some((v) => v == l);
    case "notIn":
      return !toList(r).some((v) => v == l);

    // Booleans
    case "isTrue":
      return l === true || l === "true" || l === 1 || l === "1";
    case "isFalse":
      return l === false || l === "false" || l === 0 || l === "0";

    // Equality — use loose equality for type coercion ("5" == 5)
    case "equals":
      return l == r;
    case "strictEquals":
      return l === r;
    case "not_equals":
    case "notEquals":
      return l != r;

    // Ordered comparisons — numeric when both sides are numbers, else dates
    case "greater_than":
    case "gt":
      return orderedCompare(l, r, (a, b) => a > b);
    case "less_than":
    case "lt":
      return orderedCompare(l, r, (a, b) => a < b);
    case "gte":
      return orderedCompare(l, r, (a, b) => a >= b);
    case "lte":
      return orderedCompare(l, r, (a, b) => a <= b);

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
    case "notExists":
      return l === undefined || l === null;
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
