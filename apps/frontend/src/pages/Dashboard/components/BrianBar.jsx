import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, Zap, Globe, Mail, Code2, GitBranch } from 'lucide-react';
import brianLogo from '../../../assets/brian.webp';

const SUGGESTIONS = [
  { icon: Zap,       label: 'Webhook to email' },
  { icon: Globe,     label: 'Scrape & notify' },
  { icon: Mail,      label: 'Email automation' },
  { icon: Code2,     label: 'Transform data' },
  { icon: GitBranch, label: 'Conditional flow' },
];

export default function BrianBar({ onSubmit }) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '24px';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => { resize(); }, [value, resize]);

  const submit = async () => {
    const txt = value.trim();
    if (!txt || loading) return;
    setLoading(true);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = '24px';
    try { await onSubmit?.(txt); } finally { setLoading(false); }
  };

  const active = focused || value.length > 0 || loading;

  return (
    <div className="w-full mb-7" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
      {/* Heading */}
      <div className="flex items-center gap-2 mb-3">
        <img src={brianLogo} alt="Brian" className="w-5 h-5 object-contain" />
        <span className="text-[13px] font-semibold text-white">Brian</span>
        <span className="text-[11px] text-neutral-600">· AI workflow assistant</span>
      </div>

      {/* Input card with animated border */}
      <div className="relative">
        {/* Animated gradient border */}
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-500"
          style={{
            padding: 1,
            background: active
              ? 'linear-gradient(90deg, #7c3aed, #a855f7, #6366f1, #7c3aed)'
              : 'transparent',
            backgroundSize: '300% 100%',
            animation: loading
              ? 'brianBorderSpin 1.6s linear infinite'
              : active
              ? 'brianBorderPulse 3s ease infinite'
              : 'none',
            borderRadius: 'inherit',
            zIndex: 0,
          }}
        >
          <div className="w-full h-full rounded-2xl bg-[#0a0a0a]" />
        </div>

        {/* Static border when idle */}
        {!active && (
          <div className="absolute inset-0 rounded-2xl border border-zinc-800 pointer-events-none" />
        )}

        {/* Inner card */}
        <div className="relative z-10 rounded-2xl bg-[#0a0a0a] overflow-hidden">
          {/* Textarea */}
          <div className="px-4 pt-4 pb-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); resize(); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Describe an automation and Brian will build it for you…"
              rows={1}
              disabled={loading}
              className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-700 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
              style={{ minHeight: 24, maxHeight: 120 }}
            />
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1">
              {SUGGESTIONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => { setValue(label); textareaRef.current?.focus(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-transparent text-neutral-600 hover:text-neutral-300 hover:border-zinc-600 transition-all text-[11px]"
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={submit}
              disabled={!value.trim() || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                background: value.trim() && !loading ? '#7c3aed' : '#1a1a1a',
                border: '1px solid',
                borderColor: value.trim() && !loading ? '#7c3aed' : '#2a2a2a',
              }}
            >
              {loading
                ? <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                : <ArrowUp className="w-3.5 h-3.5 text-white" />
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes brianBorderSpin {
          0%   { background-position: 0%   50%; }
          100% { background-position: 300% 50%; }
        }
        @keyframes brianBorderPulse {
          0%, 100% { background-position: 0%   50%; }
          50%       { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
