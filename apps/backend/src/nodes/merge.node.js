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
 *   branches     — per-input rows [{ label, value }]. A branch's `value` (already
 *                  {{ }}-resolved by the executor) overrides the live wired input
 *                  for that slot; empty value falls back to the live input. Lets a
 *                  merge contribute typed/dropped values even for unwired handles.
 *
 * Every mode returns a consistent envelope so downstream nodes always have a
 * concrete, predictable output:
 *   { ...merged, __mergedFrom: <branchCount> }   (combine / deep / first)
 *   { [key]: [...], __mergedFrom: <branchCount> } (array)
 */

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function coerceBranchValue(raw) {
  if (raw == null) return undefined;
  if (typeof raw !== "string") return raw;
  const s = raw.trim();
  if (s === "") return undefined;
  if (s[0] === "{" || s[0] === "[") {
    try {
      return JSON.parse(s);
    } catch {
      // not JSON — fall through to the raw string
    }
  }
  return raw;
}

// Overlay configured per-branch values onto the live wired inputs, by slot, and
// carry each slot's label. A non-empty branch value wins for its slot; empty
// falls back to the live input. Extra configured branches (unwired handles) are
// appended so their typed value still contributes. Returns [{ label, value }].
function applyBranchValues(inputs, configBranches) {
  const cfg = Array.isArray(configBranches) ? configBranches : [];
  const count = Math.max(inputs.length, cfg.length);
  const out = [];
  for (let i = 0; i < count; i++) {
    const label = cfg[i]?.label || `Input ${i + 1}`;
    const override = coerceBranchValue(cfg[i]?.value);
    if (override !== undefined) out.push({ label, value: override });
    else if (i < inputs.length) out.push({ label, value: inputs[i] });
  }
  return out;
}

// For object-merge modes (combine/deep) a scalar branch has no keys of its own,
// so key it under the branch's label. Objects merge by their own keys as before.
function asMergeObject(branch) {
  return isPlainObject(branch.value) ? branch.value : { [branch.label]: branch.value };
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

    const liveInputs = Array.isArray(input) ? input : [input];
    const labeled = applyBranchValues(liveInputs, config.branches);
    const values = labeled.map((b) => b.value);
    const nonEmpty = values.filter((b) => b != null && (!isPlainObject(b) || Object.keys(b).length > 0));
    const branchCount = nonEmpty.length;

    switch (mode) {
      case "array": {
        const outKey = String(key || "merged").trim() || "merged";
        return { [outKey]: values, __mergedFrom: branchCount };
      }

      case "first": {
        const first = nonEmpty[0] || {};
        return isPlainObject(first)
          ? { ...first, __mergedFrom: branchCount }
          : { value: first, __mergedFrom: branchCount };
      }

      case "deep": {
        const merged = labeled.reduce(
          (acc, b) => deepMerge(acc, asMergeObject(b), conflict),
          {},
        );
        return { ...merged, __mergedFrom: branchCount };
      }

      case "combine":
      default: {
        const ordered = conflict === "first" ? [...labeled].reverse() : labeled;
        const merged = ordered.reduce(
          (acc, b) => ({ ...acc, ...asMergeObject(b) }),
          {},
        );
        return { ...merged, __mergedFrom: branchCount };
      }
    }
  },
};
