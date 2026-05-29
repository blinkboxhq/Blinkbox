import { Settings } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

// ── visibility ───────────────────────────────────────────────────────────────
function isVisible(field, config) {
  if (!field.show) return true;
  for (const [dep, expected] of Object.entries(field.show)) {
    const val = config[dep];
    const ok = Array.isArray(expected) ? expected.includes(val) : val === expected;
    if (!ok) return false;
  }
  return true;
}

// ── shared styles ────────────────────────────────────────────────────────────
const LBL = 'text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block';
const INP = 'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500';

// ── field components ─────────────────────────────────────────────────────────

function StringField({ field, value, onChange, nodeId }) {
  return (
    <div>
      <label className={LBL}>
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {field.smart !== false ? (
        <SmartVariableInput
          value={value ?? ''}
          onChange={onChange}
          placeholder={field.placeholder ?? ''}
          nodeId={nodeId}
          multiline={!!field.multiline}
        />
      ) : (
        <input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          className={INP + (field.mono ? ' font-mono' : '')}
        />
      )}
      {field.hint && <p className="text-[10px] text-zinc-600 mt-1">{field.hint}</p>}
      {field.examples && (
        <div className="flex flex-col gap-1 mt-1.5">
          {field.examples.map((ex) => (
            <button key={ex} onClick={() => onChange(ex)}
              className="text-left px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-500 hover:text-zinc-300 font-mono transition-all">
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
    <div>
      <label className={LBL}>{field.label}</label>
      <input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={value ?? field.default ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={INP}
      />
      {field.hint && <p className="text-[10px] text-zinc-600 mt-1">{field.hint}</p>}
    </div>
  );
}

function BooleanField({ field, value, onChange }) {
  const on = value ?? field.default ?? false;
  return (
    <div className="flex items-center justify-between py-0.5">
      <div>
        <span className="text-[13px] font-semibold text-zinc-100">{field.label}</span>
        {field.hint && <p className="text-[10px] text-zinc-500 mt-0.5">{field.hint}</p>}
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-blue-500' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-150 ${on ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function OptionsField({ field, value, onChange }) {
  const opts = field.options ?? [];
  const selected = value ?? field.default ?? (typeof opts[0] === 'string' ? opts[0] : opts[0]?.value);
  const cols = field.cols ?? Math.min(opts.length, 4);

  return (
    <div>
      <label className={LBL}>{field.label}</label>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {opts.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          const active = selected === val;
          return (
            <button
              key={val}
              onClick={() => onChange(val)}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                active
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
      {field.hint && <p className="text-[10px] text-zinc-600 mt-1.5">{field.hint}</p>}
    </div>
  );
}

function MultiOptionsField({ field, value, onChange }) {
  const selected = value ?? field.default ?? [];
  const toggle = (v) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    onChange(next);
  };
  return (
    <div>
      <label className={LBL}>{field.label}</label>
      <div className="flex flex-wrap gap-1.5">
        {(field.options ?? []).map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          const active = selected.includes(val);
          return (
            <button
              key={val}
              onClick={() => toggle(val)}
              className={`py-1 px-2.5 rounded-full text-[11px] font-semibold border transition-all ${
                active
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
      {field.hint && <p className="text-[10px] text-zinc-600 mt-1.5">{field.hint}</p>}
    </div>
  );
}

function ColorField({ field, value, onChange }) {
  return (
    <div>
      <label className={LBL}>{field.label}</label>
      <input
        type="color"
        value={value ?? field.default ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-900 cursor-pointer"
      />
    </div>
  );
}

function NoticeField({ field }) {
  const styles = {
    info:    'bg-zinc-900 border-zinc-800 text-zinc-500',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    error:   'bg-red-500/10 border-red-500/20 text-red-400',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  };
  return (
    <div className={`px-3 py-2 rounded-lg border text-[11px] ${styles[field.variant ?? 'info']}`}>
      {field.text}
    </div>
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
//   config      — current config object from store
//   updateConfig— (key, value) => void
//   nodeId      — passed through to SmartVariableInput
export default function SchemaForm({ meta, icon: Icon, colorClass, config = {}, updateConfig, nodeId }) {
  const Ic = Icon ?? Settings;
  const clr = colorClass ?? 'text-blue-400';

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <Ic className={`w-4 h-4 ${clr}`} />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">{meta.label}</div>
          {meta.description && <div className="text-[11px] text-zinc-500">{meta.description}</div>}
        </div>
      </div>

      {/* Fields */}
      {(meta.fields ?? []).map((field, i) => (
        <Field key={field.name ?? i} field={field} config={config} updateConfig={updateConfig} nodeId={nodeId} />
      ))}

      {/* Outputs footer */}
      {meta.outputs && (
        <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
          Returns: <span className="text-zinc-300">{meta.outputs.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
