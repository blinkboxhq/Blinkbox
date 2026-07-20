import { ArrowUpDown } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigPills, ConfigSelect, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#22d3ee';

const DIRECTION_OPS = [
  { value: 'asc',  label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

const TYPE_OPS = [
  { value: 'auto',   label: 'Auto-detect' },
  { value: 'string', label: 'Text (A → Z)' },
  { value: 'number', label: 'Number' },
  { value: 'date',   label: 'Date / time' },
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

export default function SortArrayNode({ config = {}, updateConfig, nodeId }) {
  const direction = config.direction || 'asc';
  const type = config.type || 'auto';
  const missingLast = config.missingLast !== false;

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional} hint={opts.hint}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader
        icon={ArrowUpDown}
        iconColor={ACCENT}
        title="Sort Array"
        subtitle="Reorder items by a field value"
      />

      {text('Array Path', 'arrayPath', {
        optional: true,
        placeholder: 'results.data',
        hint: 'Dot-path to the array in the input. Leave blank to sort the entire input.',
      })}

      {text('Sort By Field', 'field', {
        optional: true,
        placeholder: 'createdAt',
        hint: 'Dot-path within each item, e.g. user.name. Leave blank to sort primitive values directly.',
      })}

      <ConfigPills
        label="Direction"
        value={direction}
        onChange={(val) => updateConfig('direction', val)}
        options={DIRECTION_OPS}
        accentColor={ACCENT}
      />

      <ConfigSelect
        label="Compare As"
        value={type}
        onChange={(val) => updateConfig('type', val)}
        options={TYPE_OPS}
        accentColor={ACCENT}
      />

      <ConfigToggleRow
        label="Missing values last"
        desc="Items whose field is empty/null sink to the bottom"
        on={missingLast}
        onChange={(val) => updateConfig('missingLast', val)}
        accentColor={ACCENT}
      />

      {text('Output Key', 'outputKey', {
        placeholder: 'items',
        hint: 'Name of the array returned to the next node.',
      })}

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">items, count</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
