/**
 * 🔁 LOOP NODE
 * Iterates over every item in an array and emits each one as a separate
 * downstream item — effectively a forEach / map in the flow graph.
 *
 * Config:
 *   arrayPath  — dot-path into $json to grab the array  (e.g. "users" or "data.items")
 *                If blank, the whole $json is treated as the array.
 *   indexKey   — name to inject the current index into each item (default: "__loopIndex")
 *
 * Output: array of { json: item, __loopIndex: N } objects, one per element.
 */
export default {
  async run(config, input) {
    const { arrayPath = "", indexKey = "__loopIndex" } = config;

    // Resolve the array from the input
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
      return []; // Empty loop — emit nothing so downstream nodes are simply not triggered
    }

    // Emit one item per element so the cursor engine fans them out
    return sourceArray.map((item, index) => ({
      json: {
        ...(typeof item === "object" && item !== null ? item : { value: item }),
        [indexKey]: index,
        __loopTotal: sourceArray.length,
      },
    }));
  },
};
