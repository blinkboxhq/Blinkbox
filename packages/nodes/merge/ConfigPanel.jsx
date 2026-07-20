import { Merge, GripVertical } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
  AddRow, ConfigDivider,
} from '@/components/ui/ConfigKit';

import { MIN_MERGE_INPUTS as MIN_INPUTS, MAX_MERGE_INPUTS as MAX_INPUTS } from '@/store/mergeHandles';

const ACCENT = '#34d399';

const MODE_OPS = [
  { value: 'combine', label: 'Combine',      desc: 'Shallow-merge all branch fields into one object' },
  { value: 'deep',    label: 'Deep merge',   desc: 'Recursively merge nested objects' },
  { value: 'array',   label: 'Array',        desc: 'Collect each branch as an array element' },
  { value: 'first',   label: 'First wins',   desc: 'Keep only the first non-empty branch' },
];

// Branch labels become output keys — must match slugifyLabel in
// apps/backend/src/nodes/merge.node.js.
function slugifyLabel(label, index) {
  const slug = String(label || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return slug || `input_${index + 1}`;
}

const CONFLICT_OPS = [
  { value: 'last',  label: 'Last branch wins' },
  { value: 'first', label: 'First branch wins' },
];

function Field({ label, optional, hint, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
      {hint && <div className="text-[10.5px] text-neutral-600 mt-1">{hint}</div>}
    </div>
  );
}

// Merge branches aren't "one var of a node" — each parallel input is its own
// value. So we render a labeled value field per branch, not a flat var list.
function normalizeBranches(config) {
  const raw = Array.isArray(config.branches) ? config.branches : null;
  let branches = raw
    ? raw.map((b, i) => ({ label: b?.label || `Input ${i + 1}`, value: b?.value || '' }))
    : Array.from({ length: Math.max(MIN_INPUTS, Math.min(MAX_INPUTS, Number(config.inputs) || 2)) },
        (_, i) => ({ label: `Input ${i + 1}`, value: '' }));
  if (branches.length < MIN_INPUTS) {
    branches = [
      ...branches,
      ...Array.from({ length: MIN_INPUTS - branches.length }, (_, i) => ({ label: `Input ${branches.length + i + 1}`, value: '' })),
    ];
  }
  return branches.slice(0, MAX_INPUTS);
}

export default function MergeNode({ config = {}, updateConfig, nodeId }) {
  const mode = config.mode || 'combine';
  const conflict = config.conflict || 'last';
  const showConflict = mode === 'combine' || mode === 'deep';
  const branches = normalizeBranches(config);

  const commit = (next) => updateConfig('branches', next);

  const setBranch = (idx, key, val) =>
    commit(branches.map((b, i) => (i === idx ? { ...b, [key]: val } : b)));

  const addBranch = () => {
    if (branches.length >= MAX_INPUTS) return;
    commit([...branches, { label: `Input ${branches.length + 1}`, value: '' }]);
  };

  const removeBranch = (idx) => {
    if (branches.length <= MIN_INPUTS) return;
    commit(branches.filter((_, i) => i !== idx));
  };

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader
        icon={Merge}
        iconColor={ACCENT}
        title="Merge"
        subtitle="Wait for parallel branches, then combine their outputs"
      />

      <Field
        label="Input Branches"
        hint="One row per branch feeding this merge. Name it to control the output key; drop a variable or type the value this branch should contribute."
      >
        <div className="flex flex-col gap-2.5">
          {branches.map((branch, idx) => (
            <div key={idx} className="bb-glow-border flex flex-col gap-2 rounded-md p-2.5 bg-[#0f0f0f] border border-[#2b2b2b]">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                <input
                  value={branch.label}
                  onChange={(e) => setBranch(idx, 'label', e.target.value)}
                  placeholder={`Input ${idx + 1}`}
                  className="flex-1 min-w-0 bg-transparent text-[11px] font-mono font-semibold uppercase tracking-wider focus:outline-none placeholder:text-neutral-700"
                  style={{ color: ACCENT }}
                />
                <span className="text-[9px] font-mono text-neutral-700 shrink-0">
                  {slugifyLabel(branch.label, idx)}
                </span>
                <button
                  type="button"
                  onClick={() => removeBranch(idx)}
                  disabled={branches.length <= MIN_INPUTS}
                  className="text-neutral-600 hover:text-red-400 disabled:opacity-25 disabled:hover:text-neutral-600 transition-colors shrink-0 text-[15px] leading-none px-1"
                  title={branches.length <= MIN_INPUTS ? 'Merge needs at least 2 inputs' : 'Remove input'}
                >
                  ×
                </button>
              </div>
              <SmartVariableInput
                value={branch.value}
                onChange={(val) => setBranch(idx, 'value', val)}
                placeholder="Drop a variable or type a value…"
                nodeId={nodeId}
              />
            </div>
          ))}

          {branches.length < MAX_INPUTS && (
            <AddRow label="Add input" onClick={addBranch} accentColor={ACCENT} />
          )}
        </div>
      </Field>

      <ConfigDivider label="How to merge" />

      <ConfigSelect
        label="Merge Mode"
        value={mode}
        onChange={(val) => updateConfig('mode', val)}
        options={MODE_OPS}
        accentColor={ACCENT}
      />

      {showConflict && (
        <ConfigPills
          label="On key conflict"
          value={conflict}
          onChange={(val) => updateConfig('conflict', val)}
          options={CONFLICT_OPS}
          accentColor={ACCENT}
        />
      )}

      <ConfigBanner>
        Outputs every input under its own key —{' '}
        <span className="text-neutral-300">{branches.map((b, i) => slugifyLabel(b.label, i)).join(', ')}</span>
        {' '}— plus <span className="text-neutral-300">merged</span> with the combined result.
      </ConfigBanner>
    </ConfigSection>
  );
}
