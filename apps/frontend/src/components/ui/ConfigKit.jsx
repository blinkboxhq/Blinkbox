import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Check, X } from 'lucide-react';

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

export function ConfigSelect({ label, icon, value, onChange, options = [], placeholder = 'Select…', accentColor = BB_ACCENT }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropRef = useRef(null);
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

  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const selected = opts.find((o) => o.value === value);

  return (
    <div className="flex flex-col">
      {label && <ConfigLabel icon={icon}>{label}</ConfigLabel>}
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
          {selected?.icon && <selected.icon className="w-3.5 h-3.5" style={{ color: accentColor }} />}
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
          <div className="overflow-y-auto">
            {opts.length === 0 && <p className="px-3 py-3 text-[12px] text-neutral-600 text-center font-mono">No options</p>}
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
                  {o.icon && <o.icon className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
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
