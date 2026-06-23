/**
 * DEDUPLICATE NODE
 * Removes duplicate items from an array based on a key field.
 *
 * Config:
 *   arrayPath  — dot-path to the array in input (blank = use input directly)
 *   field      — dot-path to the field used as uniqueness key (blank = deep equality on whole item)
 *   keep       — "first" (default) | "last"
 *   outputKey  — key for the result array (default: "items")
 */

function getPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

export default {
  async run(config, input) {
    const { arrayPath, field = "", keep = "first", outputKey = "items" } = config;

    const src = arrayPath ? getPath(input, arrayPath) : input;
    const arr = Array.isArray(src) ? src : [src];

    const seen = new Map();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const key = field ? String(getPath(item, field) ?? "") : JSON.stringify(item);
      if (!seen.has(key) || keep === "last") {
        seen.set(key, item);
      }
    }

    const deduped = Array.from(seen.values());
    return { [outputKey]: deduped, count: deduped.length, removed: arr.length - deduped.length };
  },
};
