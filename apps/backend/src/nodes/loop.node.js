import { evaluateCondition } from "../modules/automation/engine/condition/condition.evaluator.v2.js";

/**
 * LOOP NODE — iterates over an array, emitting each item as a downstream cursor.
 *
 * Config:
 *   arrayPath      — dot-path into input to grab the array (blank = use input itself)
 *   indexKey       — key injected as current index (default: "__loopIndex")
 *   maxIterations  — safety cap; throws if exceeded (default: 1000)
 *   breakCondition — optional v2 condition object evaluated against each item;
 *                    when true, iteration stops at that item (exclusive)
 */
export default {
  async run(config, input) {
    const {
      arrayPath = "",
      indexKey = "__loopIndex",
      maxIterations = 1000,
      breakCondition,
    } = config;

    // Resolve the array
    let sourceArray;
    if (arrayPath) {
      sourceArray = arrayPath.split(".").reduce((obj, key) => obj?.[key], input);
    } else {
      sourceArray = input;
    }

    if (!Array.isArray(sourceArray)) {
      throw new Error(
        `Loop Node: Expected an array at "${arrayPath || "$json"}" but got ${typeof sourceArray}. ` +
        `Make sure the upstream node outputs an array.`,
      );
    }

    if (sourceArray.length === 0) {
      return [];
    }

    if (sourceArray.length > maxIterations) {
      throw new Error(
        `Loop Node: Array length (${sourceArray.length}) exceeds maxIterations limit (${maxIterations}). ` +
        `Increase the limit in Advanced Settings or add a break condition.`,
      );
    }

    const items = [];
    for (let index = 0; index < sourceArray.length; index++) {
      const item = sourceArray[index];
      const itemContext = {
        ...(typeof item === "object" && item !== null ? item : { value: item }),
        [indexKey]: index,
        __loopTotal: sourceArray.length,
      };

      // Evaluate break condition before emitting the item
      if (breakCondition) {
        try {
          const shouldBreak = evaluateCondition(breakCondition, itemContext);
          if (shouldBreak) break;
        } catch {
          // Invalid break condition — skip and continue
        }
      }

      items.push({ json: itemContext });
    }

    return items;
  },
};
