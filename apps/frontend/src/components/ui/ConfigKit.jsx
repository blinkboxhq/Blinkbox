import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Check, X } from 'lucide-react';

/**
 * ConfigKit — the shared field primitives for node config panels.
 *
 * Every surface carries `bb-glow-border` so the global useGlowBorder hook
 * lights its border as the cursor approaches (the same liquid-glass cursor
 * effect used across the canvas). Analytics-grade dark UI, Tailwind only.
 */

export function ConfigSection({ children, className = '' }) {
  return <div className={`flex flex-col gap-4 p-4 ${className}`}>{children}</div>;
}

export function ConfigLabel({ children, icon: Icon, action }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
        {Icon && <Icon className="w-3 h-3" />}
        {children}
      </label>
      {action}
    </div>
  );
}

export function ConfigInput({ label, icon, value, onChange, placeholder, type = 'text', mono = false, hint }) {
  return (
    <div className="flex flex-col">
      {label && <ConfigLabel icon={icon}>{label}</ConfigLabel>}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`bb-glow-border w-full rounded-lg px-3 py-2.5 text-[13px] text-neutral-100 placeholder-neutral-600 bg-[#0d0d0f]/80 backdrop-blur-sm outline-none transition-colors focus:bg-[#0d0d0f] ${mono ? 'font-mono' : ''}`}
      />
      {hint && <p className="text-[10px] text-neutral-600 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function ConfigSelect({ label, icon, value, onChange, options = [], placeholder = 'Select…', accentColor = '#a78bfa' }) {
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
        className={`bb-glow-border w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[13px] bg-[#0d0d0f]/80 backdrop-blur-sm transition-colors ${selected ? 'text-neutral-100' : 'text-neutral-600'}`}
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
          className="fixed z-[9999] bb-glass border border-[#2a2a2d] rounded-lg shadow-2xl overflow-hidden flex flex-col py-1"
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
            {opts.length === 0 && <p className="px-3 py-3 text-[12px] text-neutral-600 text-center">No options</p>}
            {opts.map((o) => {
              const sel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange?.(o.value); setOpen(false); }}
                  className={`w-full px-3 py-2 text-left text-[13px] flex items-center gap-2.5 transition-colors hover:bg-white/[0.06] ${sel ? 'bg-white/[0.04] text-neutral-100' : 'text-neutral-300'}`}
                >
                  {o.icon && <o.icon className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.desc && <span className="text-[10px] text-neutral-600 truncate">{o.desc}</span>}
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

export function ConfigPills({ label, icon, value, onChange, options = [], accentColor = '#a78bfa' }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div className="flex flex-col">
      {label && <ConfigLabel icon={icon}>{label}</ConfigLabel>}
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => {
          const sel = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange?.(o.value)}
              className={`bb-glow-border px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${sel ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'}`}
              style={sel ? { color: accentColor, backgroundColor: `${accentColor}1a` } : { backgroundColor: '#0d0d0f99' }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AddRow({ label, onClick, accentColor = '#a78bfa' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bb-glow-border w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium text-neutral-400 hover:text-neutral-200 bg-[#0d0d0f]/60 backdrop-blur-sm transition-colors"
    >
      <Plus className="w-3.5 h-3.5" style={{ color: accentColor }} /> {label}
    </button>
  );
}

export function ConfigDivider({ label }) {
  if (!label) return <div className="h-px bg-[#1e1e20] my-1" />;
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="flex-1 h-px bg-[#1e1e20]" />
      <span className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-[#1e1e20]" />
    </div>
  );
}

export function RemovableRow({ children, onRemove }) {
  return (
    <div className="bb-glow-border flex items-center gap-2 rounded-lg px-2.5 py-2 bg-[#0d0d0f]/60 backdrop-blur-sm">
      <div className="flex-1 min-w-0">{children}</div>
      <button type="button" onClick={onRemove} className="text-neutral-600 hover:text-red-400 transition-colors shrink-0 p-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
