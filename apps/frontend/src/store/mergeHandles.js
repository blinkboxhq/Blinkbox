// Merge input handles. Slot 0 keeps the plain "input" id so workflows saved
// before merge had branches keep their wiring.
export function mergeHandleId(index) {
  return index === 0 ? "input" : `input-${index}`;
}

export const MIN_MERGE_INPUTS = 2;
export const MAX_MERGE_INPUTS = 10;

// The branch labels driving both the canvas handles and the output keys.
// `config.inputs` is the legacy count-only shape from before labelled branches.
export function mergeBranchLabels(config) {
  const branches = Array.isArray(config?.branches) ? config.branches : null;
  const count = branches
    ? branches.length
    : Number(config?.inputs) || MIN_MERGE_INPUTS;
  const clamped = Math.max(MIN_MERGE_INPUTS, Math.min(MAX_MERGE_INPUTS, count));
  return Array.from({ length: clamped }, (_, i) => branches?.[i]?.label || `Input ${i + 1}`);
}
