import imgDeduplicate from '@/assets/logos/deduplicate.svg';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigPills, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#a78bfa';

const KEEP_OPS = [
  { value: 'first', label: 'First occurrence' },
  { value: 'last',  label: 'Last occurrence' },
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

export default function DeduplicateNode({ config = {}, updateConfig, nodeId }) {
  const keep = config.keep || 'first';
  const caseInsensitive = config.caseInsensitive === true;

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
        logoUrl={imgDeduplicate}
        title="Deduplicate"
        subtitle="Remove duplicate items from an array"
      />

      {text('Array Path', 'arrayPath', {
        optional: true,
        placeholder: 'results.data',
        hint: 'Dot-path to the array in the input. Leave blank to dedupe the entire input.',
      })}

      {text('Unique Key Field', 'field', {
        optional: true,
        placeholder: 'email',
        hint: 'Dot-path within each item that must be unique. Leave blank to match on the whole item.',
      })}

      <ConfigPills
        label="On Duplicate, Keep"
        value={keep}
        onChange={(val) => updateConfig('keep', val)}
        options={KEEP_OPS}
        accentColor={ACCENT}
      />

      <ConfigToggleRow
        label="Ignore case"
        desc="Treat “Alice” and “alice” as the same key"
        on={caseInsensitive}
        onChange={(val) => updateConfig('caseInsensitive', val)}
        accentColor={ACCENT}
      />

      {text('Output Key', 'outputKey', {
        placeholder: 'items',
        hint: 'Name of the array returned to the next node.',
      })}

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">items, count, removedCount</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
