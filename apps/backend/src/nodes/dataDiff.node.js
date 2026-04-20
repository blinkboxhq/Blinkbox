/**
 * DATA DIFF NODE
 * Deep structural comparison of two objects or arrays.
 * Pure in-process computation — no external calls, no credentials.
 *
 * Operations:
 *   diffObjects    — deep recursive diff of two objects
 *   diffArrays     — array diff, keyed by arrayKey or positional
 *   findNewItems   — items in 'after' not in 'before'
 *   findRemovedItems — items in 'before' not in 'after'
 *   findChanged    — items in both but with field changes
 */

function parseInput(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

function buildIgnoreSet(ignorePaths) {
  if (!ignorePaths) return new Set();
  const raw = Array.isArray(ignorePaths) ? ignorePaths : ignorePaths.split(",");
  return new Set(raw.map((p) => p.trim()).filter(Boolean));
}

function deepDiff(before, after, path, depth, maxDepth, ignoreSet) {
  if (depth > maxDepth) return [];
  if (ignoreSet.has(path)) return [];

  const typeB = Array.isArray(before) ? "array" : typeof before;
  const typeA = Array.isArray(after) ? "array" : typeof after;

  if (typeB !== typeA || before === null !== (after === null)) {
    return [{ type: "changed", path: path || "(root)", before, after }];
  }

  if (before === null || typeof before !== "object") {
    if (before !== after) return [{ type: "changed", path: path || "(root)", before, after }];
    return [];
  }

  const changes = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in before)) {
      changes.push({ type: "added", path: childPath, value: after[key] });
    } else if (!(key in after)) {
      changes.push({ type: "removed", path: childPath, value: before[key] });
    } else {
      changes.push(...deepDiff(before[key], after[key], childPath, depth + 1, maxDepth, ignoreSet));
    }
  }
  return changes;
}

function keyedArrayDiff(before, after, arrayKey) {
  const beforeMap = new Map(before.map((item) => [item[arrayKey], item]));
  const afterMap = new Map(after.map((item) => [item[arrayKey], item]));

  const newItems = after.filter((item) => !beforeMap.has(item[arrayKey]));
  const removedItems = before.filter((item) => !afterMap.has(item[arrayKey]));
  const changedItems = [];

  for (const [key, afterItem] of afterMap) {
    if (!beforeMap.has(key)) continue;
    const beforeItem = beforeMap.get(key);
    const changes = deepDiff(beforeItem, afterItem, "", 0, 10, new Set());
    if (changes.length > 0) {
      changedItems.push({ key, before: beforeItem, after: afterItem, changes });
    }
  }

  return { newItems, removedItems, changedItems };
}

export default {
  async run(config, input) {
    const {
      operation = "diffObjects",
      arrayKey,
      maxDepth = 10,
      ignorePaths = "",
      outputFormat = "detailed",
    } = config;

    let before = parseInput(config.before ?? input?.before);
    let after = parseInput(config.after ?? input?.after);

    if (before === undefined || before === null) before = {};
    if (after === undefined || after === null) after = {};

    const ignoreSet = buildIgnoreSet(ignorePaths);
    const depth = Math.min(parseInt(maxDepth) || 10, 50);

    if (operation === "diffObjects") {
      const changes = deepDiff(before, after, "", 0, depth, ignoreSet);
      const summary = { changed: 0, added: 0, removed: 0 };
      for (const c of changes) summary[c.type === "changed" ? "changed" : c.type === "added" ? "added" : "removed"]++;
      const result = { hasChanges: changes.length > 0, changeCount: changes.length, summary, operation };
      if (outputFormat === "summary") return { ...result, changes: [] };
      if (outputFormat === "paths") return { ...result, changes: changes.map((c) => ({ type: c.type, path: c.path })) };
      return { ...result, changes };
    }

    if (operation === "diffArrays") {
      const beforeArr = Array.isArray(before) ? before : [];
      const afterArr = Array.isArray(after) ? after : [];

      if (arrayKey) {
        const { newItems, removedItems, changedItems } = keyedArrayDiff(beforeArr, afterArr, arrayKey);
        return {
          hasChanges: newItems.length > 0 || removedItems.length > 0 || changedItems.length > 0,
          changeCount: newItems.length + removedItems.length + changedItems.length,
          newItems, removedItems, changedItems,
          summary: { added: newItems.length, removed: removedItems.length, changed: changedItems.length },
          operation,
        };
      }

      // Positional diff
      const len = Math.max(beforeArr.length, afterArr.length);
      const changes = [];
      for (let i = 0; i < len; i++) {
        if (i >= beforeArr.length) changes.push({ type: "added", path: `[${i}]`, value: afterArr[i] });
        else if (i >= afterArr.length) changes.push({ type: "removed", path: `[${i}]`, value: beforeArr[i] });
        else changes.push(...deepDiff(beforeArr[i], afterArr[i], `[${i}]`, 0, depth, ignoreSet));
      }
      return { hasChanges: changes.length > 0, changeCount: changes.length, changes, operation };
    }

    if (operation === "findNewItems" || operation === "findRemovedItems" || operation === "findChanged") {
      const beforeArr = Array.isArray(before) ? before : [];
      const afterArr = Array.isArray(after) ? after : [];
      const key = arrayKey || "id";
      const { newItems, removedItems, changedItems } = keyedArrayDiff(beforeArr, afterArr, key);

      if (operation === "findNewItems") return { items: newItems, count: newItems.length, operation };
      if (operation === "findRemovedItems") return { items: removedItems, count: removedItems.length, operation };
      return { items: changedItems, count: changedItems.length, operation };
    }

    throw new Error(`Data Diff: unknown operation "${operation}"`);
  },
};
