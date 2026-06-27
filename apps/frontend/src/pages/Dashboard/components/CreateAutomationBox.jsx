import { useState, useEffect, useRef } from 'react';
import { X, Box, Loader2, Zap, Globe, Clock, ArrowRight, Sparkles } from 'lucide-react';
import WorkflowPreview from './WorkflowPreview';

const NAME_MAX = 60;

const TRIGGERS = [
  { key: 'manual',       Icon: Zap,   label: 'Manual',   hint: 'Run on demand from the canvas' },
  { key: 'webhook',      Icon: Globe, label: 'Webhook',  hint: 'Start when a URL is called' },
  { key: 'cron_trigger', Icon: Clock, label: 'Schedule', hint: 'Run on a recurring timer' },
];

export default function CreateAutomationBox({ isOpen, onClose, onCreate, isLoading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('manual');
  const nameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setTrigger('manual');
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const canSubmit = name.trim().length > 0;
  const activeTrigger = TRIGGERS.find((t) => t.key === trigger) || TRIGGERS[0];

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;
    await onCreate({ name: name.trim(), description: description.trim(), trigger });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', animation: 'cabFadeIn 0.18s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bb-glass bb-reflect relative w-full max-w-[460px] rounded-2xl overflow-hidden flex flex-col"
        style={{ animation: 'cabSlideUp 0.2s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--bb-border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bb-accent-soft)', border: '1px solid var(--bb-accent-ring)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--bb-accent-hot)' }} />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-[var(--bb-text-hi)] tracking-tight leading-none">New workflow</span>
              <span className="text-[11px] text-[var(--bb-text-dim)] mt-1">Spin up a fresh automation box</span>
            </div>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-[var(--bb-text-dim)] hover:text-[var(--bb-text-hi)] transition-colors p-1 rounded-md hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live preview glance */}
        <div className="px-5 pt-5">
          <WorkflowPreview nodeCount={3} trigger={trigger} />
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-semibold text-[var(--bb-text-dim)] uppercase tracking-widest">Name</label>
              <span className="text-[10px] font-mono text-[var(--bb-text-dim)] tabular-nums">{name.length}/{NAME_MAX}</span>
            </div>
            <input
              ref={nameRef}
              type="text"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
              placeholder="e.g. Lead Enrichment Pipeline"
              className="bb-input bb-glass w-full px-4 py-3 text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[var(--bb-text-dim)] uppercase tracking-widest mb-2">
              Description <span className="text-[var(--bb-text-dim)] normal-case opacity-70">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
              placeholder="What does this box do?"
              className="bb-input bb-glass w-full px-4 py-3 text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[var(--bb-text-dim)] uppercase tracking-widest mb-2">Starts with</label>
            <div className="grid grid-cols-3 gap-2">
              {TRIGGERS.map((t) => {
                const active = trigger === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTrigger(t.key)}
                    className="bb-glass relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl overflow-hidden transition-all"
                    style={{
                      borderColor: active ? 'var(--bb-accent-ring)' : 'var(--bb-border-subtle)',
                      boxShadow: active ? '0 0 0 1px var(--bb-accent-ring), 0 8px 24px -12px var(--bb-accent-ring)' : undefined,
                    }}
                  >
                    <t.Icon className="w-4 h-4" style={{ color: active ? 'var(--bb-accent-hot)' : 'var(--bb-text-lo)' }} />
                    <span className="text-[11px] font-medium" style={{ color: active ? 'var(--bb-text-hi)' : 'var(--bb-text-lo)' }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--bb-text-dim)] mt-2 flex items-center gap-1.5">
              <activeTrigger.Icon className="w-3 h-3 shrink-0" /> {activeTrigger.hint}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-2.5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-3 rounded-xl text-[13px] font-medium text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)] transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className="bb-btn bb-btn-accent flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-bold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              : <>Create &amp; open <ArrowRight className="w-4 h-4" /></>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cabFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cabSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
