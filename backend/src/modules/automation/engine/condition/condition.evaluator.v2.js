import { resolveValue } from "./condition.resolver.js";
import { compare } from "../operators/compare.js";

export function evaluateCondition(condition, context) {
  if (!condition || condition.type === "always") {
    return true;
  }

  switch (condition.type) {
    case "compare": {
      const left = resolveValue(condition.left, context);
      const right = resolveValue(condition.right, context);
      return compare(condition.operator, left, right);
    }

    case "exists": {
      const value = resolveValue(condition.value, context);
      return value !== undefined && value !== null;
    }

    case "and":
      return condition.conditions.every((c) => evaluateCondition(c, context));

    case "or":
      return condition.conditions.some((c) => evaluateCondition(c, context));

    case "not":
      return !evaluateCondition(condition.condition, context);

    default:
      throw new Error(`Unknown condition type: ${condition.type}`);
  }
}
