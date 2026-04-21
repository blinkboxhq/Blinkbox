import { evaluateCondition } from "../modules/automation/engine/condition/condition.evaluator.v2.js";

/**
 * LOOP NODE — iterates over an array, spawning one independent cursor per item.
 *
 * Config:
 *   arrayPath      — dot-path into input to grab the array (blank = use input itself)
 *   indexKey       — key injected as current index (default: "__loopIndex")
 *   maxIterations  — safety cap; throws if exceeded (default: 200)
 *   breakCondition — optional v2 condition object; when true, stops at that item
 *   fanOut         — when true (default), each item becomes its own parallel cursor branch.
 *                    Set false to get the old batch-all behaviour (rarely useful).
 *
 * Fan-out signal: returns { __loopFanOut: true, items: [...] } so cursor.executor
 * can spawn one downstream cursor per item instead of passing the whole array.
 */
export default {
  async run(config, input) {
    const {
      arrayPath = "",
      indexKey = "__loopIndex",
      maxIterations = 200,
      breakCondition,
      fanOut = true,
    } = config;

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
      return fanOut ? { __loopFanOut: true, items: [] } : [];
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

    // Fan-out: signal the executor to spawn one cursor per item
    if (fanOut) {
      return { __loopFanOut: true, items };
    }

    return items;
  },
};
