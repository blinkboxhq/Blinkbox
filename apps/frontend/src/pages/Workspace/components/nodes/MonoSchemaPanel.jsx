import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { ConfigSection, ConfigInput, ConfigSelect, ConfigPills } from '@/components/ui/ConfigKit';
import CredentialPicker from '@/components/ui/CredentialPicker';

// Renders a declarative trigger schema (triggerSchemas.js) as a bordered-mono
// config panel. JSON in → n8n-style panel out. One renderer, every trigger.

const pad = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: pad(i), label: `${pad(i)}:00` }));
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function matchesShowWhen(showWhen, config) {
  if (!showWhen) return true;
  return Object.entries(showWhen).every(([key, want]) => {
    const have = config[key];
    if (want && typeof want === 'object' && !Array.isArray(want)) {
      if ('$ne' in want) return have !== want.$ne;
    }
    return Array.isArray(want) ? want.includes(have) : have === want;
  });
}

function Label({ children, icon: Icon, accent }) {
  return (
    <label className="flex items-center gap-2 text-[9px] font-bold text-neutral-500 uppercase tracking-[0.18em] font-mono mb-2">
      <span className="w-[3px] h-[3px] rounded-full" style={{ background: accent }} />
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </label>
  );
}

function Toggle({ on, onClick, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-9 h-5 rounded-full p-0.5 transition-colors shrink-0"
      style={{ backgroundColor: on ? accent : '#3b3b3b' }}
    >
      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function HeaderBadge({ badge, config, accent }) {
  if (!badge) return null;
  if (badge.showWhen && !matchesShowWhen(badge.showWhen, config)) return null;
  const label = typeof badge.label === 'function' ? badge.label(config) : badge.label;
  if (badge.tone === 'live') {
    return (
      <span className="ml-auto flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
        <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
        {label}
      </span>
    );
  }
  if (badge.tone === 'code') {
    return <span className="ml-auto text-[10px] font-mono text-neutral-400 bg-[#0f0f0f] border border-[#2b2b2b] rounded px-2 py-1 shrink-0">{label}</span>;
  }
  return (
    <span className="ml-auto text-[8px] font-bold uppercase tracking-[0.18em] font-mono px-2 py-1 rounded border shrink-0"
      style={{ color: accent, backgroundColor: `${accent}1f`, borderColor: `${accent}66` }}>{label}</span>
  );
}

function UrlDisplay({ field, config, accent, automationId }) {
  const [copied, setCopied] = useState(false);
  let url = `${API_URL}/webhook/${automationId}`;
  if (field.suffixWhen && config[field.suffixWhen.key] === field.suffixWhen.value) url += field.suffixWhen.suffix;
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return (
    <div className="flex flex-col">
      <Label accent={accent}>{field.label}</Label>
      <div className="bb-glow-border flex items-center gap-2 bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5">
        <span className="flex-1 text-[11px] text-neutral-300 font-mono truncate select-all">{url}</span>
        <button type="button" onClick={copy} className="text-neutral-600 hover:text-neutral-200 transition-colors shrink-0" title="Copy URL">
          {copied ? <Check className="w-3.5 h-3.5" style={{ color: accent }} /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

function Field({ field, config, set, accent, automationId }) {
  const v = (key, dflt) => (config[key] !== undefined ? config[key] : dflt);

  switch (field.type) {
    case 'url-display':
      return <UrlDisplay field={field} config={config} accent={accent} automationId={automationId} />;

    case 'divider':
      return <div className="flex items-center gap-2 my-1"><div className="flex-1 h-px bg-[#2b2b2b]" />{field.label && <span className="text-[9px] font-bold text-neutral-700 uppercase tracking-[0.2em] font-mono">{field.label}</span>}<div className="flex-1 h-px bg-[#2b2b2b]" /></div>;

    case 'text':
      return <ConfigInput label={field.label} icon={field.icon} value={v(field.key, field.default ?? '')} placeholder={field.placeholder} hint={field.hint}
        onChange={(val) => { set(field.key, val); if (field.mirrorTo) set(field.mirrorTo, val); }} />;

    case 'password':
      return <ConfigInput label={field.label} icon={field.icon} type="password" value={v(field.key, '')} placeholder={field.placeholder} hint={field.hint}
        onChange={(val) => set(field.key, val)} />;

    case 'credential':
      return (
        <div className="flex flex-col">
          <Label icon={field.icon} accent={accent}>{field.label}</Label>
          <CredentialPicker
            value={v(field.key, '')}
            onChange={(id) => set(field.key, id)}
            label={field.label}
            placeholder={field.placeholder}
            credentialType={field.credType}
            oauthProvider={field.oauthProvider}
            hint={field.hint}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="flex flex-col">
          <Label icon={field.icon} accent={accent}>{field.label}</Label>
          <textarea
            value={v(field.key, '')}
            onChange={(e) => set(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 5}
            className="bb-glow-border w-full bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5 text-[12.5px] text-neutral-100 font-mono outline-none transition-colors focus:border-[#545454] resize-none leading-relaxed placeholder-neutral-600"
          />
          {field.hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{field.hint}</p>}
        </div>
      );

    case 'select':
      return <ConfigSelect label={field.label} icon={field.icon} value={v(field.key, field.default)} options={field.options} accentColor={accent}
        onChange={(val) => { set(field.key, val); if (field.sideEffects) Object.entries(field.sideEffects(val)).forEach(([k, x]) => set(k, x)); }} />;

    case 'hour':
      return <ConfigSelect label={field.label} value={v(field.key, field.default || '09')} options={HOURS} accentColor={accent} onChange={(val) => set(field.key, val)} />;

    case 'pills': {
      const cur = v(field.key, field.default ?? (field.multi ? [] : undefined));
      return <ConfigPills label={field.label} icon={field.icon} options={field.options} accentColor={accent}
        value={field.multi ? null : cur}
        multi={field.multi ? cur : undefined}
        onChange={(val) => {
          if (!field.multi) return set(field.key, val);
          const has = cur.includes(val);
          if (has && cur.length === 1) return;
          set(field.key, has ? cur.filter((x) => x !== val) : [...cur, val]);
        }} />;
    }

    case 'days': {
      const cur = v(field.key, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      return (
        <div className="flex flex-col">
          <Label accent={accent}>{field.label}</Label>
          <div className="flex gap-1.5">
            {DAYS.map((d) => {
              const on = cur.includes(d);
              return (
                <button key={d} type="button"
                  onClick={() => set(field.key, on ? cur.filter((x) => x !== d) : [...cur, d])}
                  className="bb-glow-border flex-1 py-2 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border transition-colors"
                  style={on ? { color: accent, backgroundColor: `${accent}1f`, borderColor: `${accent}66` } : { color: '#6d6d6d', backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}>
                  {d[0]}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'switch-row':
      return (
        <div className="bb-glow-border flex items-start gap-3 p-3 rounded-md bg-[#0f0f0f] border border-[#2b2b2b]">
          {field.icon && <field.icon className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-neutral-200 font-mono block">{field.label}</span>
            {field.desc && <span className="text-[9px] text-neutral-600 mt-1 block leading-relaxed font-mono">{field.desc}</span>}
          </div>
          <Toggle on={!!v(field.key, field.default ?? false)} onClick={() => set(field.key, !v(field.key, field.default ?? false))} accent={accent} />
        </div>
      );

    case 'code-preview':
      return (
        <div className="flex flex-col">
          <Label accent={accent}>{field.label}</Label>
          <pre className="text-[10px] font-mono text-neutral-400 bg-[#0f0f0f] border border-[#2b2b2b] rounded-md p-3 leading-relaxed whitespace-pre-wrap">{field.build(config)}</pre>
        </div>
      );

    case 'vars':
      return (
        <div className="flex flex-col">
          <Label accent={accent}>{field.label}</Label>
          <div className="flex flex-col gap-1.5">
            {field.rows.map(([token, desc]) => (
              <div key={token} className="bb-glow-border flex items-center gap-2.5 rounded-md px-3 py-2 bg-[#0f0f0f] border border-[#2b2b2b]">
                <code className="text-[10.5px] font-mono shrink-0" style={{ color: accent }}>{token}</code>
                <span className="text-[9px] text-neutral-600 font-mono truncate">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function MonoSchemaPanel({ schema, config = {}, updateConfig }) {
  const { id: automationId } = useParams();
  const tabs = schema.tabs || null;
  const [tab, setTab] = useState(tabs ? tabs[0].id : null);
  const accent = schema.accent || '#6f97e8';
  const Icon = schema.icon;
  const logoUrl = schema.logoUrl;

  const set = (key, val) => updateConfig?.(key, val);

  const visible = schema.fields.filter((f) => {
    if (!matchesShowWhen(f.showWhen, config)) return false;
    if (tabs && f.tab && f.tab !== tab) return false;
    return true;
  });

  return (
    <ConfigSection className="gap-5">
      <div className="bb-glow-border flex items-center gap-3 p-4 rounded-md bg-[#0f0f0f] border border-[#3b3b3b]">
        {logoUrl ? (
          <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0">
            <img src={logoUrl} alt={schema.title} className="w-[26px] h-[26px] object-contain"
              style={schema.imgFilter ? { filter: schema.imgFilter } : undefined} />
          </div>
        ) : Icon && (
          <div className="w-9 h-9 rounded-md bg-[#262626] border border-[#3b3b3b] flex items-center justify-center shrink-0 text-white">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-neutral-100 font-mono tracking-wide">{schema.title}</span>
          {schema.subtitle && <span className="text-[10px] text-neutral-500 font-mono">{schema.subtitle}</span>}
        </div>
        <HeaderBadge badge={schema.badge} config={config} accent={accent} />
      </div>

      {tabs && (
        <div className="flex gap-1 -mt-1">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className="flex-1 py-2 text-[9px] font-bold uppercase tracking-[0.18em] font-mono rounded-md border transition-colors"
                style={on ? { color: accent, backgroundColor: `${accent}1f`, borderColor: `${accent}66` } : { color: '#6d6d6d', backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}>
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {visible.map((f, i) => (
        <Field key={f.key || `${f.type}-${i}`} field={f} config={config} set={set} accent={accent} automationId={automationId} />
      ))}
    </ConfigSection>
  );
}
