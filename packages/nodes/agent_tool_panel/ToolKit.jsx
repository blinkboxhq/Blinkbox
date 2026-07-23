import { Loader2, Plug, CheckCircle2, AlertTriangle } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import { ConfigLabel, ConfigInput, ConfigPills, ConfigBanner, ConfigHeader, ConfigBadge } from '@/components/ui/ConfigKit';

export { ConfigSection, ConfigLabel, ConfigInput, ConfigDivider, ConfigSelect, ConfigPills, ConfigTextarea, ConfigToggleRow, ConfigBanner, ConfigHeader } from '@/components/ui/ConfigKit';

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

// A live handshake button. Status lives next to the button rather than in a
// toast because the thing it reports on — "is this server reachable with these
// credentials" — is only meaningful while you are looking at those fields.
export function ConnectButton({ label = 'Connect', status = 'idle', message, accentColor, disabled, onClick }) {
  const busy = status === 'loading';
  const Icon = busy ? Loader2 : status === 'ok' ? CheckCircle2 : status === 'error' ? AlertTriangle : Plug;
  const tone = status === 'ok' ? accentColor : status === 'error' ? '#f87171' : '#a3a3a3';

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className="bb-glow-border w-full flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#0f0f0f] border border-[#3b3b3b] text-neutral-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={status === 'ok' ? { borderColor: `${accentColor}55` } : undefined}
      >
        <Icon className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} style={{ color: tone }} />
        {busy ? 'Connecting…' : label}
      </button>
      {message ? (
        <p className="text-[10px] font-mono leading-relaxed" style={{ color: tone }}>{message}</p>
      ) : null}
    </div>
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
