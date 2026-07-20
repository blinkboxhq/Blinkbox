import { Filter } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#f472b6';

const OPERATORS = [
  { value: 'equals',      label: 'Equals' },
  { value: 'notEquals',   label: 'Not equals' },
  { value: 'contains',    label: 'Contains' },
  { value: 'notContains', label: 'Does not contain' },
  { value: 'startsWith',  label: 'Starts with' },
  { value: 'endsWith',    label: 'Ends with' },
  { value: 'gt',          label: 'Greater than' },
  { value: 'gte',         label: 'Greater or equal' },
  { value: 'lt',          label: 'Less than' },
  { value: 'lte',         label: 'Less or equal' },
  { value: 'isEmpty',     label: 'Is empty' },
  { value: 'isNotEmpty',  label: 'Is not empty' },
  { value: 'exists',      label: 'Exists' },
  { value: 'notExists',   label: 'Does not exist' },
];

const NEEDS_VALUE = new Set([
  'equals', 'notEquals', 'contains', 'notContains',
  'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte',
]);

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

export default function FilterArrayNode({ config = {}, updateConfig, nodeId }) {
  const operator = config.operator || 'equals';
  const showValue = NEEDS_VALUE.has(operator);

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
        icon={Filter}
        iconColor={ACCENT}
        title="Filter Array"
        subtitle="Keep only items matching a condition"
      />

      {text('Array Path', 'arrayPath', {
        optional: true,
        placeholder: 'results.data',
        hint: 'Dot-path to the array in the input. Leave blank to filter the entire input.',
      })}

      {text('Field to Test', 'field', {
        placeholder: 'status',
        hint: 'Dot-path within each item, e.g. user.role',
      })}

      <ConfigSelect
        label="Condition"
        value={operator}
        onChange={(val) => updateConfig('operator', val)}
        options={OPERATORS}
        accentColor={ACCENT}
      />

      {showValue && text('Value', 'value', {
        placeholder: 'active',
        hint: 'Compared against each item’s field. Supports {{ variables }}.',
      })}

      {text('Output Key', 'outputKey', {
        placeholder: 'items',
        hint: 'Name of the array returned to the next node.',
      })}

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">items, filteredCount, totalCount</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
