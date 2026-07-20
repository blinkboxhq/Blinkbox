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

const isUsable = (c) => c && typeof c === "object" && c.operator;

// Older workflows stored a single `condition` object under mode "simple";
// newer ones store a `conditions` array joined by mode "and" | "or".
function readConditions(config) {
  const list = Array.isArray(config.conditions) ? config.conditions.filter(isUsable) : [];
  if (list.length > 0) return list;
  return isUsable(config.condition) ? [config.condition] : [];
}

export default {
  async run(config, input) {
    const conditions = readConditions(config);
    if (conditions.length === 0) return { ...input, __conditionResult: true };

    const results = conditions.map((c) =>
      evaluateCondition({ operator: c.operator, left: c.left, right: c.right }, input)
    );

    const passed = config.mode === "or" ? results.some(Boolean) : results.every(Boolean);

    return { ...input, __conditionResult: passed };
  },
};
