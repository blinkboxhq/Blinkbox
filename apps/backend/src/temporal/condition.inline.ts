/**
 * Inlined condition evaluator for use inside Temporal workflows.
 *
 * Temporal workflows run in a deterministic V8 sandbox where dynamic imports
 * and require() are forbidden. All logic must be self-contained in this file.
 * This is a verbatim copy of condition.evaluator.v2.js + condition.resolver.js
 * + operators/compare.js, merged into one pure TypeScript module.
 */

// ── Value Resolver ─────────────────────────────────────────────────────────────

function resolveValue(template: unknown, context: Record<string, unknown>): unknown {
  if (typeof template !== "string") return template;

  const match = template.match(/^\{\{(.+?)\}\}$/);
  if (!match) return template;

  const path = match[1].trim().split(".");
  let current: unknown = context;

  for (const key of path) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// ── Operator Compare ────────────────────────────────────────────────────────────

function compare(operator: string, left: unknown, right: unknown): boolean {
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

    // Numeric
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
    case "isEmpty": {
      if (left === undefined || left === null) return true;
      if (typeof left === "string") return left.trim() === "";
      if (Array.isArray(left)) return left.length === 0;
      if (typeof left === "object") return Object.keys(left as object).length === 0;
      return false;
    }
    case "isNotEmpty": {
      if (left === undefined || left === null) return false;
      if (typeof left === "string") return left.trim() !== "";
      if (Array.isArray(left)) return left.length > 0;
      if (typeof left === "object") return Object.keys(left as object).length > 0;
      return true;
    }

    // Array
    case "arrayContains":
      return Array.isArray(left) && (left as unknown[]).includes(right);
    case "arrayNotContains":
      return !Array.isArray(left) || !(left as unknown[]).includes(right);
    case "arrayLength":
      return Array.isArray(left) && (left as unknown[]).length === Number(right);
    case "arrayLengthGt":
      return Array.isArray(left) && (left as unknown[]).length > Number(right);
    case "arrayLengthLt":
      return Array.isArray(left) && (left as unknown[]).length < Number(right);

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

// ── Condition Types ─────────────────────────────────────────────────────────────

export type ConditionNode =
  | { type: "always" }
  | { type: "compare"; operator: string; left: unknown; right: unknown }
  | { type: "exists"; value: unknown }
  | { type: "and"; conditions: ConditionNode[] }
  | { type: "or"; conditions: ConditionNode[] }
  | { type: "not"; condition: ConditionNode }
  | string  // legacy "always" / "true" / "false"
  | Record<string, unknown>; // legacy flat {operator, left, right}

// ── Main Evaluator ──────────────────────────────────────────────────────────────

export function evaluateConditionV2(
  condition: ConditionNode | undefined,
  context: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  if (condition === "always" || condition === "true") return true;
  if (condition === "false") return false;

  if (typeof condition === "object") {
    // Empty object → pass through
    if (Object.keys(condition).length === 0) return true;

    const cond = condition as Record<string, unknown>;

    switch (cond["type"]) {
      case "always":
        return true;

      case "compare": {
        const left = resolveValue(cond["left"], context);
        const right = resolveValue(cond["right"], context);
        return compare(String(cond["operator"] ?? "equals"), left, right);
      }

      case "exists": {
        const value = resolveValue(cond["value"], context);
        return value !== undefined && value !== null;
      }

      case "and": {
        const conditions = cond["conditions"] as ConditionNode[];
        return conditions.every((c) => evaluateConditionV2(c, context));
      }

      case "or": {
        const conditions = cond["conditions"] as ConditionNode[];
        return conditions.some((c) => evaluateConditionV2(c, context));
      }

      case "not":
        return !evaluateConditionV2(cond["condition"] as ConditionNode, context);

      default:
        // Legacy flat condition: { operator, left, right } (no "type" field)
        if (cond["operator"]) {
          const left = resolveValue(cond["left"], context);
          const right = resolveValue(cond["right"], context);
          return compare(String(cond["operator"]), left, right);
        }
        // Unknown shape — pass through
        return true;
    }
  }

  return true;
}
