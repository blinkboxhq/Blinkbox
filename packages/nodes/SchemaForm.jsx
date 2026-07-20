import { Settings } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection,
  ConfigHeader,
  ConfigLabel,
  ConfigInput,
  ConfigPills,
  ConfigToggleRow,
  ConfigBanner,
  BB_ACCENT,
} from '@/components/ui/ConfigKit';

// ── visibility ───────────────────────────────────────────────────────────────
function isVisible(field, config) {
  if (!field.show) return true;
  for (const [dep, expected] of Object.entries(field.show)) {
    const val = config[dep];
    let ok;
    if (Array.isArray(val)) {
      ok = Array.isArray(expected) ? expected.some((e) => val.includes(e)) : val.includes(expected);
    } else {
      ok = Array.isArray(expected) ? expected.includes(val) : val === expected;
    }
    if (!ok) return false;
  }
  return true;
}

// ── field components ─────────────────────────────────────────────────────────

function StringField({ field, value, onChange, nodeId }) {
  if (field.smart === false) {
    return (
      <ConfigInput
        label={field.label}
        value={value ?? ''}
        onChange={onChange}
        placeholder={field.placeholder ?? ''}
        hint={field.hint}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <ConfigLabel>
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </ConfigLabel>
      <SmartVariableInput
        value={value ?? ''}
        onChange={onChange}
        placeholder={field.placeholder ?? ''}
        nodeId={nodeId}
        multiline={!!field.multiline}
      />
      {field.hint && (
        <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{field.hint}</p>
      )}
      {field.examples && (
        <div className="flex flex-col gap-1 mt-1.5">
          {field.examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange(ex)}
              className="bb-glow-border text-left px-2.5 py-1.5 rounded-md bg-[#0f0f0f] border border-[#2b2b2b] hover:border-[#3b3b3b] text-[11px] text-neutral-500 hover:text-neutral-300 font-mono transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NumberField({ field, value, onChange }) {
  return (
    <ConfigInput
      label={field.label}
      type="number"
      value={value ?? field.default ?? 0}
      onChange={(v) => onChange(Number(v))}
      hint={field.hint}
    />
  );
}

function BooleanField({ field, value, onChange }) {
  return (
    <ConfigToggleRow
      label={field.label}
      desc={field.hint}
      on={value ?? field.default ?? false}
      onChange={onChange}
      accentColor={BB_ACCENT}
    />
  );
}

function OptionsField({ field, value, onChange }) {
  const opts = field.options ?? [];
  const selected = value ?? field.default ?? (typeof opts[0] === 'string' ? opts[0] : opts[0]?.value);
  return (
    <div className="flex flex-col">
      <ConfigPills label={field.label} value={selected} onChange={onChange} options={opts} />
      {field.hint && (
        <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{field.hint}</p>
      )}
    </div>
  );
}

function MultiOptionsField({ field, value, onChange }) {
  const selected = value ?? field.default ?? [];
  const toggle = (v) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-col">
      <ConfigPills label={field.label} onChange={toggle} options={field.options ?? []} multi={selected} />
      {field.hint && (
        <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{field.hint}</p>
      )}
    </div>
  );
}

function CredentialField({ field, value, onChange }) {
  return (
    <CredentialPicker
      value={value ?? ''}
      onChange={onChange}
      accentColor={field.accentColor ?? 'blue'}
      label={field.label}
      placeholder={field.placeholder ?? 'Select credential…'}
    />
  );
}

function ColorField({ field, value, onChange }) {
  return (
    <div className="flex flex-col">
      <ConfigLabel>{field.label}</ConfigLabel>
      <input
        type="color"
        value={value ?? field.default ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-[#3b3b3b] bg-[#0f0f0f] cursor-pointer"
      />
    </div>
  );
}

function NoticeField({ field }) {
  return (
    <ConfigBanner tone={field.variant === 'info' || !field.variant ? 'info' : 'warn'}>
      {field.text}
    </ConfigBanner>
  );
}

function RowField({ field, config, updateConfig, nodeId }) {
  if (!isVisible(field, config)) return null;
  return (
    <div className="flex gap-2">
      {(field.fields ?? []).map((f) => (
        <div key={f.name} className="flex-1 min-w-0">
          <Field field={f} config={config} updateConfig={updateConfig} nodeId={nodeId} />
        </div>
      ))}
    </div>
  );
}

// ── field dispatcher ─────────────────────────────────────────────────────────
function Field({ field, config, updateConfig, nodeId }) {
  if (!isVisible(field, config)) return null;
  const value = config[field.name] ?? field.default;
  const onChange = (v) => updateConfig(field.name, v);

  switch (field.type) {
    case 'string':       return <StringField field={field} value={value} onChange={onChange} nodeId={nodeId} />;
    case 'number':       return <NumberField field={field} value={value} onChange={onChange} />;
    case 'boolean':      return <BooleanField field={field} value={value} onChange={onChange} />;
    case 'options':      return <OptionsField field={field} value={value} onChange={onChange} />;
    case 'multiOptions': return <MultiOptionsField field={field} value={value} onChange={onChange} />;
    case 'color':        return <ColorField field={field} value={value} onChange={onChange} />;
    case 'credential':   return <CredentialField field={field} value={value} onChange={onChange} />;
    case 'notice':       return <NoticeField field={field} />;
    case 'row':          return <RowField field={field} config={config} updateConfig={updateConfig} nodeId={nodeId} />;
    default:             return null;
  }
}

// ── main export ──────────────────────────────────────────────────────────────
// Props:
//   meta        — node meta.js default export (must have .label, .fields[])
//   icon        — Lucide component (optional, falls back to Settings)
//   colorClass  — Tailwind text color e.g. "text-blue-400"
//   logoUrl     — brand asset; when set it replaces the Lucide icon
//   config      — current config object from store
//   updateConfig— (key, value) => void
//   nodeId      — passed through to SmartVariableInput
export default function SchemaForm({ meta, icon: Icon, colorClass, logoUrl, imgFilter, config = {}, updateConfig, nodeId }) {
  return (
    <ConfigSection>
      <ConfigHeader
        icon={Icon ?? Settings}
        iconClass={colorClass ?? 'text-blue-400'}
        logoUrl={logoUrl}
        imgFilter={imgFilter}
        title={meta.label}
        subtitle={meta.description}
      />

      {(meta.fields ?? []).map((field, i) => (
        <Field key={field.name ?? i} field={field} config={config} updateConfig={updateConfig} nodeId={nodeId} />
      ))}

      {meta.outputs && (
        <ConfigBanner>
          Returns: <span className="text-neutral-300">{meta.outputs.join(', ')}</span>
        </ConfigBanner>
      )}
    </ConfigSection>
  );
}
