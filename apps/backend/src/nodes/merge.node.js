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
 *   conflict     — for combine/deep on key collisions: "last" (default) | "first".
 *   branches     — per-input rows [{ label, value }]. A branch's `value` (already
 *                  {{ }}-resolved by the executor) overrides the live wired input
 *                  for that slot; empty value falls back to the live input. Lets a
 *                  merge contribute typed/dropped values even for unwired handles.
 *
 * Output is the same envelope in every mode: each input stays addressable under
 * its own (slugified) branch label, alongside the combined result.
 *   { <branchSlug>: <branchValue>, …, merged: <result>, __mergedFrom: <count> }
 */

// Branch labels are free text but become output keys, so they have to survive
// `{{ node.key }}` addressing. Falls back to the slot's position.
export function slugifyLabel(label, index) {
  const slug = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `input_${index + 1}`;
}

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

function combineBranches(labeled, mode, conflict) {
  switch (mode) {
    case "array":
      return labeled.map((b) => b.value);

    case "first": {
      const nonEmpty = labeled
        .map((b) => b.value)
        .filter((v) => v != null && (!isPlainObject(v) || Object.keys(v).length > 0));
      return nonEmpty[0] ?? null;
    }

    case "deep":
      return labeled.reduce((acc, b) => deepMerge(acc, asMergeObject(b), conflict), {});

    case "combine":
    default: {
      const ordered = conflict === "first" ? [...labeled].reverse() : labeled;
      return ordered.reduce((acc, b) => ({ ...acc, ...asMergeObject(b) }), {});
    }
  }
}

export default {
  slugifyLabel,

  async run(config = {}, input) {
    const { mode = "combine", conflict = "last" } = config;

    const liveInputs = Array.isArray(input) ? input : [input];
    const labeled = applyBranchValues(liveInputs, config.branches);
    const branchCount = labeled.filter(
      (b) => b.value != null && (!isPlainObject(b.value) || Object.keys(b.value).length > 0),
    ).length;

    const named = {};
    labeled.forEach((b, i) => {
      named[slugifyLabel(b.label, i)] = b.value ?? null;
    });

    // `merged` and `__mergedFrom` are written last so a branch labelled "merged"
    // can never shadow the combined result.
    return { ...named, merged: combineBranches(labeled, mode, conflict), __mergedFrom: branchCount };
  },
};
