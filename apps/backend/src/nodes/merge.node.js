/**
 * 🔗 MERGE NODE
 * Waits for all incoming parallel branches and merges their outputs
 * into a single unified object under named keys.
 *
 * The execution engine already handles the "wait for all parents"
 * logic via the merge check in cursor.executor.js — this node's job
 * is purely to flatten / combine the data that arrives.
 *
 * Config:
 *   mode — "combine" (default) merges all input fields into one flat object
 *          "array"   wraps each parent's output as an element in an array
 *          "first"   keeps only the first non-empty input (fast-path)
 *
 * Input: the execution engine feeds the item from the immediately preceding node.
 *        All sibling branch outputs are available via dynamicContext,
 *        but the node only operates on what arrives as `input`.
 */
export default {
  async run(config, input) {
    const { mode = "combine", key = "merged" } = config;

    switch (mode) {
      case "array":
        // Wrap everything under a key as a one-element array; the loop node can fan it out
        return { [key]: Array.isArray(input) ? input : [input] };

      case "first":
        // Pass the first truthy value straight through
        if (Array.isArray(input)) {
          return input.find((i) => Object.keys(i).length > 0) || {};
        }
        return input;

      case "combine":
      default:
        // Shallow-merge all fields from input
        if (Array.isArray(input)) {
          return input.reduce((acc, item) => ({ ...acc, ...item }), {});
        }
        return input;
    }
  },
};
