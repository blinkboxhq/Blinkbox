/**
 * CONDITION NODE
 *
 * Evaluates a user-defined condition against the current input.
 * Returns { __conditionResult: true, ...input } on match.
 * Returns { __conditionResult: false, ...input } on no-match.
 *
 * The executor handles __conditionResult: false by routing to "false"-handle
 * edges without marking the execution as failed.
 */

import { evaluateCondition } from "../modules/automation/engine/condition.evaluator.js";

function evalConfig(config, input) {
  const mode = config.mode || "simple";

  if (mode === "simple") {
    const c = config.condition;
    if (!c) return true;
    return evaluateCondition({ operator: c.operator, left: c.left, right: c.right }, input);
  }

  const conditions = config.conditions || [];
  if (conditions.length === 0) return true;

  if (mode === "and") {
    return conditions.every((c) =>
      evaluateCondition({ operator: c.operator, left: c.left, right: c.right }, input)
    );
  }

  if (mode === "or") {
    return conditions.some((c) =>
      evaluateCondition({ operator: c.operator, left: c.left, right: c.right }, input)
    );
  }

  return true;
}

export default {
  async run(config, input) {
    const passed = evalConfig(config, input);
    return { ...input, __conditionResult: passed };
  },
};
