import { Merge, Plus, Minus } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#34d399';
const MIN_INPUTS = 2;
const MAX_INPUTS = 10;

const MODE_OPS = [
  { value: 'combine', label: 'Combine',      desc: 'Shallow-merge all branch fields into one object' },
  { value: 'deep',    label: 'Deep merge',   desc: 'Recursively merge nested objects' },
  { value: 'array',   label: 'Array',        desc: 'Collect each branch as an array element' },
  { value: 'first',   label: 'First wins',   desc: 'Keep only the first non-empty branch' },
];

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

export default function MergeNode({ config = {}, updateConfig, nodeId }) {
  const mode = config.mode || 'combine';
  const conflict = config.conflict || 'last';
  const showConflict = mode === 'combine' || mode === 'deep';
  const inputs = Math.max(MIN_INPUTS, Math.min(MAX_INPUTS, Number(config.inputs) || 2));

  const setInputs = (n) =>
    updateConfig('inputs', Math.max(MIN_INPUTS, Math.min(MAX_INPUTS, n)));

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
        hint="Number of parallel branches this node waits for. Adds a handle on the canvas per branch."
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setInputs(inputs - 1)}
            disabled={inputs <= MIN_INPUTS}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[#111] border border-[#333] text-neutral-300 hover:border-neutral-500 disabled:opacity-30 disabled:hover:border-[#333] transition-all duration-150"
          >
            <Minus className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="min-w-[2ch] text-center text-[15px] font-mono font-bold" style={{ color: ACCENT }}>
            {inputs}
          </span>
          <button
            type="button"
            onClick={() => setInputs(inputs + 1)}
            disabled={inputs >= MAX_INPUTS}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[#111] border border-[#333] text-neutral-300 hover:border-neutral-500 disabled:opacity-30 disabled:hover:border-[#333] transition-all duration-150"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </Field>

      <ConfigSelect
        label="Merge Mode"
        value={mode}
        onChange={(val) => updateConfig('mode', val)}
        options={MODE_OPS}
        accentColor={ACCENT}
      />

      {mode === 'array' && (
        <Field
          label="Array Key"
          hint="Name of the array field the collected branches are placed under."
        >
          <SmartVariableInput
            value={config.key || ''}
            onChange={(val) => updateConfig('key', val)}
            placeholder="merged"
            nodeId={nodeId}
          />
        </Field>
      )}

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
        Returns the merged data plus{' '}
        <span className="text-neutral-300">__mergedFrom</span> — the number of branches combined.
      </ConfigBanner>
    </ConfigSection>
  );
}
