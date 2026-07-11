/**
 * MERGE NODE
 * Waits for all incoming parallel branches (the executor's merge check handles
 * the "wait for all parents" logic) and combines their outputs into one item.
 *
 * Config:
 *   mode         — "combine" (default) shallow-merges every branch's fields into
 *                  one flat object. Later branches win on key collisions.
 *                  "deep"    recursively merges nested objects.
 *                  "array"   collects each branch as an element under `key`.
 *                  "first"   keeps only the first non-empty branch.
 *   key          — output key for the collected array in "array" mode (default "merged").
 *   conflict     — for combine/deep on key collisions: "last" (default) | "first".
 *
 * Every mode returns a consistent envelope so downstream nodes always have a
 * concrete, predictable output:
 *   { ...merged, __mergedFrom: <branchCount> }   (combine / deep / first)
 *   { [key]: [...], __mergedFrom: <branchCount> } (array)
 */

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(target, source, conflict) {
  const out = { ...target };
  for (const k of Object.keys(source)) {
    const a = out[k];
    const b = source[k];
    if (isPlainObject(a) && isPlainObject(b)) {
      out[k] = deepMerge(a, b, conflict);
    } else if (k in out && conflict === "first") {
      // keep existing
    } else {
      out[k] = b;
    }
  }
  return out;
}

export default {
  async run(config = {}, input) {
    const { mode = "combine", key = "merged", conflict = "last" } = config;

    const branches = Array.isArray(input) ? input : [input];
    const nonEmpty = branches.filter((b) => b != null && (!isPlainObject(b) || Object.keys(b).length > 0));
    const branchCount = nonEmpty.length;

    switch (mode) {
      case "array": {
        const outKey = String(key || "merged").trim() || "merged";
        return { [outKey]: branches, __mergedFrom: branchCount };
      }

      case "first": {
        const first = nonEmpty[0] || {};
        return isPlainObject(first)
          ? { ...first, __mergedFrom: branchCount }
          : { value: first, __mergedFrom: branchCount };
      }

      case "deep": {
        const merged = branches.reduce(
          (acc, item) => (isPlainObject(item) ? deepMerge(acc, item, conflict) : acc),
          {},
        );
        return { ...merged, __mergedFrom: branchCount };
      }

      case "combine":
      default: {
        const ordered = conflict === "first" ? [...branches].reverse() : branches;
        const merged = ordered.reduce(
          (acc, item) => (isPlainObject(item) ? { ...acc, ...item } : acc),
          {},
        );
        return { ...merged, __mergedFrom: branchCount };
      }
    }
  },
};
