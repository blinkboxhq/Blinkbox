import imgDelay from '@/assets/logos/delay.svg';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigPills, ConfigSelect, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#fb923c';

const MODE_OPS = [
  { value: 'duration', label: 'Wait a duration' },
  { value: 'until',    label: 'Wait until a time' },
];

const UNIT_OPS = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours',   label: 'Hours' },
  { value: 'days',    label: 'Days' },
];

const PRESETS = [
  { value: '15s', label: '15s', amount: 15, unit: 'seconds' },
  { value: '1m',  label: '1m',  amount: 1,  unit: 'minutes' },
  { value: '15m', label: '15m', amount: 15, unit: 'minutes' },
  { value: '1h',  label: '1h',  amount: 1,  unit: 'hours' },
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

export default function DelayNode({ config = {}, updateConfig, nodeId }) {
  const mode = config.mode || 'duration';
  const unit = config.unit || 'seconds';

  const activePreset = PRESETS.find(
    (p) => String(config.amount) === String(p.amount) && (config.unit || 'seconds') === p.unit,
  )?.value;

  const applyPreset = (val) => {
    const p = PRESETS.find((x) => x.value === val);
    if (!p) return;
    updateConfig('mode', 'duration');
    updateConfig('amount', p.amount);
    updateConfig('unit', p.unit);
  };

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader
        logoUrl={imgDelay}
        title="Delay"
        subtitle="Pause the workflow, then resume automatically"
      />

      <ConfigPills
        label="Mode"
        value={mode}
        onChange={(val) => updateConfig('mode', val)}
        options={MODE_OPS}
        accentColor={ACCENT}
      />

      {mode === 'duration' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <SmartVariableInput
                value={config.amount ?? ''}
                onChange={(val) => updateConfig('amount', val)}
                placeholder="10"
                nodeId={nodeId}
              />
            </Field>
            <ConfigSelect
              label="Unit"
              value={unit}
              onChange={(val) => updateConfig('unit', val)}
              options={UNIT_OPS}
              accentColor={ACCENT}
            />
          </div>

          <ConfigPills
            label="Quick presets"
            value={activePreset}
            onChange={applyPreset}
            options={PRESETS}
            accentColor={ACCENT}
          />
        </>
      ) : (
        <Field
          label="Resume At"
          hint="ISO datetime (e.g. 2026-07-12T09:00:00Z). A past time resumes immediately."
        >
          <SmartVariableInput
            value={config.until || ''}
            onChange={(val) => updateConfig('until', val)}
            placeholder="2026-07-12T09:00:00Z"
            nodeId={nodeId}
          />
        </Field>
      )}

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">delayed, resumeAfter</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
