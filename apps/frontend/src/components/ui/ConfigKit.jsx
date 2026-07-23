import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Check, X, Search } from 'lucide-react';

/**
 * ConfigKit — shared field primitives for node config panels.
 *
 * "Bordered Mono" house style: sharp rounded-md corners, #0f0f0f→#262626
 * surfaces, #3b3b3b borders, monospace uppercase labels with an accent-dot
 * prefix, and the muted-blue #6f97e8 accent. Every surface carries
 * `bb-glow-border` so the global useGlowBorder hook lights its edge as the
 * cursor approaches. Tailwind only.
 */

export const BB_ACCENT = '#737373';
export const BB_ACCENT_HOT = '#a3a3a3';

const FIELD = 'bb-glow-border w-full bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5 text-[12.5px] text-neutral-100 font-mono outline-none transition-colors focus:border-[#545454]';

// iOS-style option wheel: rows tilt/fade by distance from the list's vertical
// center as you scroll. Container must be `relative` (offsetTop math) and carry
// `[perspective:700px]`. No-op when the list doesn't overflow.
export function wheelScroll(el) {
  if (!el) return;
  const overflow = el.scrollHeight > el.clientHeight + 2;
  const mid = el.scrollTop + el.clientHeight / 2;
  for (const child of el.children) {
    if (!overflow) {
      child.style.transform = '';
      child.style.opacity = '';
      continue;
    }
    const d = Math.max(-1, Math.min(1, (child.offsetTop + child.offsetHeight / 2 - mid) / (el.clientHeight / 2)));
    child.style.transform = `rotateX(${-d * 24}deg) scale(${1 - Math.abs(d) * 0.08})`;
    child.style.opacity = `${1 - Math.abs(d) * 0.45}`;
  }
}

export function ConfigSection({ children, className = '' }) {
  return <div className={`flex flex-col gap-4 p-4 ${className}`}>{children}</div>;
}

export function ConfigLabel({ children, icon: Icon, action }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="flex items-center gap-2 text-[9px] font-bold text-neutral-500 uppercase tracking-[0.18em] font-mono">
        <span className="w-[3px] h-[3px] rounded-full" style={{ background: BB_ACCENT }} />
        {Icon && <Icon className="w-3 h-3" />}
        {children}
      </label>
      {action}
    </div>
  );
}

export function ConfigInput({ label, icon, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div className="flex flex-col">
      {label && <ConfigLabel icon={icon}>{label}</ConfigLabel>}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`${FIELD} placeholder-neutral-600`}
      />
      {hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{hint}</p>}
    </div>
  );
}

export function ConfigSelect({ label, icon, value, onChange, options = [], placeholder = 'Select…', accentColor = BB_ACCENT, searchable, searchPlaceholder = 'Search…', action, emptyLabel = 'No options' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef(null);
  const dropRef = useRef(null);
  const searchRef = useRef(null);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    const reposition = () => triggerRef.current && setRect(triggerRef.current.getBoundingClientRect());
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
    else if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, searchable]);

  const all = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const selected = all.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const opts = q
    ? all.filter((o) => `${o.value} ${o.label} ${o.desc || ''}`.toLowerCase().includes(q))
    : all;

  return (
    <div className="flex flex-col">
      {label && <ConfigLabel icon={icon} action={action}>{label}</ConfigLabel>}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
        }}
        className={`bb-glow-border w-full flex items-center justify-between gap-2 bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5 text-[12.5px] font-mono transition-colors ${selected ? 'text-neutral-100' : 'text-neutral-600'}`}
      >
        <span className="truncate flex items-center gap-2">
          {selected?.logoUrl
            ? <img src={selected.logoUrl} alt="" className="w-3.5 h-3.5 object-contain shrink-0" style={selected.imgFilter ? { filter: selected.imgFilter } : undefined} />
            : selected?.icon && <selected.icon className="w-3.5 h-3.5" style={{ color: accentColor }} />}
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-600 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && rect && createPortal(
        <div
          ref={dropRef}
          className="fixed z-[9999] bg-[#262626] border border-[#3b3b3b] rounded-md shadow-2xl overflow-hidden flex flex-col p-1"
          style={(() => {
            const maxH = 280;
            const below = window.innerHeight - rect.bottom - 8;
            const above = rect.top - 8;
            const flip = below < maxH && above > below;
            return {
              left: rect.left, width: rect.width,
              maxHeight: Math.min(maxH, flip ? above : below),
              ...(flip ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
            };
          })()}
        >
          {searchable && (
            <div className="flex items-center gap-2 px-2.5 py-2 mb-1 border-b border-[#3b3b3b] shrink-0">
              <Search className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-[12.5px] font-mono text-neutral-100 placeholder-neutral-600 outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="shrink-0 text-neutral-600 hover:text-neutral-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="overflow-y-auto">
            {opts.length === 0 && <p className="px-3 py-3 text-[12px] text-neutral-600 text-center font-mono">{q ? `No match for "${query}"` : emptyLabel}</p>}
            {opts.map((o, i) => {
              const sel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange?.(o.value); setOpen(false); }}
                  className={`w-full px-2.5 py-2 text-left text-[12.5px] font-mono flex items-center gap-2.5 rounded transition-colors hover:bg-white/[0.04] ${sel ? 'bg-[#6f97e8]/[0.08] text-neutral-100' : 'text-neutral-300'}`}
                >
                  <span className="text-[9px] w-3.5 shrink-0" style={{ color: sel ? accentColor : '#6d6d6d' }}>{String(i + 1).padStart(2, '0')}</span>
                  {o.logoUrl
                    ? <img src={o.logoUrl} alt="" className="w-3.5 h-3.5 object-contain shrink-0" style={o.imgFilter ? { filter: o.imgFilter } : undefined} />
                    : o.icon && <o.icon className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.desc && <span className="text-[9px] text-neutral-600 truncate">{o.desc}</span>}
                  {sel && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function ConfigPills({ label, icon, value, onChange, options = [], accentColor = BB_ACCENT, multi }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div className="flex flex-col">
      {label && <ConfigLabel icon={icon}>{label}</ConfigLabel>}
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => {
          const sel = Array.isArray(multi) ? multi.includes(o.value) : o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange?.(o.value)}
              className={`bb-glow-border px-3 py-1.5 rounded-md text-[11.5px] font-mono font-medium border transition-colors ${sel ? 'text-neutral-100' : 'text-neutral-500 border-[#2b2b2b] hover:text-neutral-300'}`}
              style={sel
                ? { color: accentColor, backgroundColor: `${accentColor}1f`, borderColor: 'rgba(111,151,232,0.40)' }
                : { backgroundColor: '#0f0f0f' }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AddRow({ label, onClick, accentColor = BB_ACCENT }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bb-glow-border w-full flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-200 bg-[#0f0f0f] border border-dashed border-[#3b3b3b] transition-colors"
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(111,151,232,0.40)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
    >
      <Plus className="w-3.5 h-3.5" style={{ color: accentColor }} /> {label}
    </button>
  );
}

export function ConfigDivider({ label }) {
  if (!label) return <div className="h-px bg-[#2b2b2b] my-1" />;
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="flex-1 h-px bg-[#2b2b2b]" />
      <span className="text-[9px] font-bold text-neutral-700 uppercase tracking-[0.2em] font-mono">{label}</span>
      <div className="flex-1 h-px bg-[#2b2b2b]" />
    </div>
  );
}

export function RemovableRow({ children, onRemove }) {
  return (
    <div className="bb-glow-border flex items-center gap-2 rounded-md px-2.5 py-2 bg-[#0f0f0f] border border-[#2b2b2b]">
      <div className="flex-1 min-w-0">{children}</div>
      <button type="button" onClick={onRemove} className="text-neutral-600 hover:text-red-400 transition-colors shrink-0 p-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Header block (icon/logo + title/subtitle + optional badge) ──────────────
export function ConfigHeader({ icon: Icon, logoUrl, imgFilter, iconColor, iconClass, title, subtitle, badge }) {
  return (
    <div className="bb-glow-border flex items-center gap-3 p-4 rounded-md bg-[#0f0f0f] border border-[#3b3b3b]">
      {logoUrl ? (
        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0">
          <img src={logoUrl} alt="" className="w-[26px] h-[26px] object-contain" style={imgFilter ? { filter: imgFilter } : undefined} />
        </div>
      ) : Icon && (
        <div className="w-9 h-9 flex items-center justify-center shrink-0"
          style={iconClass ? undefined : { color: iconColor || '#fff' }}>
          <Icon className={`w-[26px] h-[26px] ${iconClass || ''}`} strokeWidth={1.75} />
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-bold text-neutral-100 font-mono tracking-wide truncate">{title}</span>
        {subtitle && <span className="text-[10px] text-neutral-500 font-mono">{subtitle}</span>}
      </div>
      {badge}
    </div>
  );
}

// ── Header badge (live / code / accent tones) ───────────────────────────────
export function ConfigBadge({ label, tone = 'accent', accentColor = BB_ACCENT }) {
  if (!label) return null;
  if (tone === 'live') {
    return (
      <span className="ml-auto flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
        <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
        {label}
      </span>
    );
  }
  if (tone === 'code') {
    return <span className="ml-auto text-[10px] font-mono text-neutral-400 bg-[#0f0f0f] border border-[#2b2b2b] rounded px-2 py-1 shrink-0">{label}</span>;
  }
  return (
    <span className="ml-auto text-[8px] font-bold uppercase tracking-[0.18em] font-mono px-2 py-1 rounded border shrink-0"
      style={{ color: accentColor, backgroundColor: `${accentColor}1f`, borderColor: `${accentColor}66` }}>{label}</span>
  );
}

// ── Toggle switch (sliding knob) ────────────────────────────────────────────
export function ConfigToggle({ on, onClick, accentColor = BB_ACCENT }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-9 h-5 rounded-full p-0.5 transition-colors shrink-0"
      style={{ backgroundColor: on ? accentColor : '#3b3b3b' }}
    >
      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Switch row (label + description + toggle) ────────────────────────────────
export function ConfigToggleRow({ label, desc, icon: Icon, on, onChange, accentColor = BB_ACCENT }) {
  return (
    <div className="bb-glow-border flex items-start gap-3 p-3 rounded-md bg-[#0f0f0f] border border-[#2b2b2b]">
      {Icon && <Icon className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-semibold text-neutral-200 font-mono block">{label}</span>
        {desc && <span className="text-[9px] text-neutral-600 mt-1 block leading-relaxed font-mono">{desc}</span>}
      </div>
      <ConfigToggle on={!!on} onClick={() => onChange?.(!on)} accentColor={accentColor} />
    </div>
  );
}

// ── Mono textarea with label + hint ─────────────────────────────────────────
export function ConfigTextarea({ label, icon, value, onChange, placeholder, rows = 5, hint }) {
  return (
    <div className="flex flex-col">
      {label && <ConfigLabel icon={icon}>{label}</ConfigLabel>}
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="bb-glow-border w-full bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5 text-[12.5px] text-neutral-100 font-mono outline-none transition-colors focus:border-[#545454] resize-none leading-relaxed placeholder-neutral-600"
      />
      {hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{hint}</p>}
    </div>
  );
}

// ── Pill tab bar ────────────────────────────────────────────────────────────
export function ConfigTabs({ tabs = [], value, onChange, accentColor = BB_ACCENT }) {
  return (
    <div className="flex gap-1 -mt-1">
      {tabs.map((t) => {
        const on = value === t.id;
        return (
          <button key={t.id} type="button" onClick={() => onChange?.(t.id)}
            className="flex-1 py-2 text-[9px] font-bold uppercase tracking-[0.18em] font-mono rounded-md border transition-colors"
            style={on ? { color: accentColor, backgroundColor: `${accentColor}1f`, borderColor: `${accentColor}66` } : { color: '#6d6d6d', backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Info / returns banner (muted mono strip) ────────────────────────────────
export function ConfigBanner({ children, tone = 'info' }) {
  if (tone === 'warn') {
    return (
      <div className="bb-glow-border flex items-center gap-2 rounded-md px-3 py-2.5 text-[10px] font-mono tracking-wide"
        style={{ color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.20)', borderWidth: 1 }}>
        {children}
      </div>
    );
  }
  return (
    <div className="bb-glow-border flex items-center gap-2 rounded-md px-3 py-2.5 bg-[#0f0f0f] border border-[#2b2b2b] text-[10px] font-mono text-neutral-500 tracking-wide">
      {children}
    </div>
  );
}

export function ConnectAppGuide({ title, steps = [], accentColor = BB_ACCENT }) {
  return (
    <div
      className="flex flex-col gap-2 rounded-md border px-3 py-2.5"
      style={{ background: `${accentColor}0f`, borderColor: `${accentColor}33` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
        {title}
      </p>
      <ol className="flex flex-col gap-1">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-[10px] text-neutral-400 font-mono leading-relaxed">
            <span className="shrink-0 font-semibold tabular-nums" style={{ color: accentColor }}>{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
