import SmartVariableInput from '@/components/ui/SmartVariableInput';
import { ConfigLabel, ConfigInput, ConfigPills, ConfigBanner, ConfigHeader, ConfigBadge } from '@/components/ui/ConfigKit';

export { ConfigSection, ConfigLabel, ConfigInput, ConfigDivider, ConfigSelect, ConfigTextarea, ConfigToggleRow, ConfigBanner, ConfigHeader } from '@/components/ui/ConfigKit';

export function ToolHeader({ icon, logoUrl, imgFilter, iconColor, title, subtitle }) {
  return (
    <ConfigHeader
      icon={icon}
      logoUrl={logoUrl}
      imgFilter={imgFilter}
      iconColor={iconColor}
      title={title}
      subtitle={subtitle}
      badge={<ConfigBadge label="agent tool" accentColor={iconColor} />}
    />
  );
}

// Every field here is a guardrail, not a value the agent fills in. Saying so
// once beats users guessing why their setting "does nothing" at runtime.
export function GuardrailNote({ children }) {
  return <ConfigBanner tone="info">{children}</ConfigBanner>;
}

export function Text({ label, icon, value, onChange, placeholder, multiline, nodeId, hint }) {
  return (
    <div className="flex flex-col">
      <ConfigLabel icon={icon}>{label}</ConfigLabel>
      <SmartVariableInput
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        multiline={multiline}
        nodeId={nodeId}
      />
      {hint ? <p className="text-[10px] text-neutral-600 mt-1.5">{hint}</p> : null}
    </div>
  );
}

export function NumberField({ label, icon, value, onChange, placeholder, hint }) {
  return (
    <ConfigInput
      label={label}
      icon={icon}
      type="number"
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      hint={hint}
    />
  );
}

// The backend reads allowlists as comma-separated strings; the user sees pills.
export function CsvPills({ label, icon, value, onChange, options, accentColor }) {
  const selected = String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const toggle = (v) => {
    const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
    onChange(next.join(','));
  };

  return (
    <ConfigPills
      label={label}
      icon={icon}
      options={options}
      multi={selected}
      onChange={toggle}
      accentColor={accentColor}
    />
  );
}
