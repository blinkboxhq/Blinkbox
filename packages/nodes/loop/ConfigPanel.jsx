import { Repeat } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigInput, ConfigSelect,
  ConfigToggleRow, ConfigBanner, RemovableRow,
} from '@/components/ui/ConfigKit';

const ACCENT = '#fbbf24';

const OPERATORS = [
  { value: 'equals',     label: 'equals' },
  { value: 'notEquals',  label: 'not equals' },
  { value: 'gt',         label: 'greater than' },
  { value: 'gte',        label: 'greater or equal' },
  { value: 'lt',         label: 'less than' },
  { value: 'lte',        label: 'less or equal' },
  { value: 'contains',   label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith',   label: 'ends with' },
  { value: 'matches',    label: 'matches regex' },
  { value: 'isEmpty',    label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
  { value: 'exists',     label: 'exists' },
];

const NO_RIGHT = new Set(['isEmpty', 'isNotEmpty', 'exists', 'notExists']);

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

export default function LoopNode({ config = {}, updateConfig, nodeId }) {
  const breakCondition = config.breakCondition || null;
  const bc = breakCondition || { type: 'compare', left: '', operator: 'equals', right: '' };
  const hasBreak = !!breakCondition;

  const updateBreak = (field, value) =>
    updateConfig('breakCondition', { type: 'compare', ...bc, [field]: value });

  const toggleBreak = (on) =>
    updateConfig('breakCondition', on ? { type: 'compare', left: '', operator: 'equals', right: '' } : null);

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader
        icon={Repeat}
        title="Loop"
        subtitle="Run every downstream node once per array item"
      />

      <Field
        label="Array Path"
        optional
        hint="Dot-path to the array in the input. Leave blank to loop over the entire input."
      >
        <SmartVariableInput
          value={config.arrayPath || ''}
          onChange={(val) => updateConfig('arrayPath', val)}
          placeholder="data.items"
          nodeId={nodeId}
        />
      </Field>

      <ConfigInput
        label="Max Iterations"
        type="number"
        value={config.maxIterations ?? 1000}
        onChange={(val) => updateConfig('maxIterations', Number(val))}
        placeholder="1000"
        hint="Safety cap — the node fails if the array is larger than this."
      />

      <ConfigToggleRow
        label="Break condition"
        desc="Stop iterating early when a condition is met"
        on={hasBreak}
        onChange={toggleBreak}
        accentColor={ACCENT}
      />

      {hasBreak && (
        <RemovableRow onRemove={() => toggleBreak(false)}>
          <div className="flex flex-col gap-2 py-0.5">
            <SmartVariableInput
              value={bc.left}
              onChange={(v) => updateBreak('left', v)}
              placeholder="{{ item.status }}"
              nodeId={nodeId}
            />
            <ConfigSelect
              value={bc.operator}
              onChange={(v) => updateBreak('operator', v)}
              options={OPERATORS}
              accentColor={ACCENT}
            />
            {!NO_RIGHT.has(bc.operator) && (
              <SmartVariableInput
                value={bc.right}
                onChange={(v) => updateBreak('right', v)}
                placeholder="value"
                nodeId={nodeId}
              />
            )}
          </div>
        </RemovableRow>
      )}

      <ConfigBanner>
        Each iteration outputs the item's fields plus{' '}
        <span className="text-neutral-300">__loopIndex</span> and{' '}
        <span className="text-neutral-300">__loopTotal</span>.
      </ConfigBanner>
    </ConfigSection>
  );
}
