import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, Zap, Globe, Mail, Code2, GitBranch, RotateCcw } from 'lucide-react';
import brianLogo from '../../../assets/brian.webp';

const SUGGESTIONS = [
  { icon: Zap,       label: 'Webhook to Slack alert' },
  { icon: Globe,     label: 'Scrape & email digest' },
  { icon: Mail,      label: 'Auto-reply Gmail leads' },
  { icon: Code2,     label: 'Transform & store data' },
  { icon: GitBranch, label: 'Conditional Stripe flow' },
];

export default function BrianBar({ onSubmit }) {
  const [value, setValue]       = useState('');
  const [focused, setFocused]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [messages, setMessages] = useState([]);
  const textareaRef = useRef(null);
  const historyRef  = useRef(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '24px';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => { resize(); }, [value, resize]);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const submit = async () => {
    const txt = value.trim();
    if (!txt || loading) return;

    const newMessages = [...messages, { role: 'user', content: txt }];
    setMessages(newMessages);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = '24px';
    setLoading(true);

    try {
      const result = await onSubmit?.(txt, newMessages);
      if (result?.text && !result?.navigated) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMessages([]); setValue(''); };

  const hasHistory = messages.length > 0;
  const active = focused || value.length > 0 || loading || hasHistory;

  return (
    <div className="w-full mb-7" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
      <div className="flex items-center gap-2 mb-3">
        <img src={brianLogo} alt="Brian" className="w-5 h-5 object-contain" />
        <span className="text-[13px] font-semibold text-white">Brian</span>
        <span className="text-[11px] text-neutral-600">· AI workflow builder</span>
        {hasHistory && (
          <button
            onClick={reset}
            className="ml-auto flex items-center gap-1 text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> New chat
          </button>
        )}
      </div>

      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-500"
          style={{
            padding: 1,
            background: active ? 'linear-gradient(90deg, #7c3aed, #a855f7, #6366f1, #7c3aed)' : 'transparent',
            backgroundSize: '300% 100%',
            animation: loading ? 'brianBorderSpin 1.6s linear infinite' : active ? 'brianBorderPulse 3s ease infinite' : 'none',
            borderRadius: 'inherit',
            zIndex: 0,
          }}
        >
          <div className="w-full h-full rounded-2xl bg-[#0a0a0a]" />
        </div>

        {!active && <div className="absolute inset-0 rounded-2xl border border-zinc-800 pointer-events-none" />}

        <div className="relative z-10 rounded-2xl bg-[#0a0a0a] overflow-hidden">
          {/* Chat history */}
          {hasHistory && (
            <div ref={historyRef} className="px-4 pt-4 pb-2 flex flex-col gap-2 max-h-[240px] overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-violet-600/20 border border-violet-500/30 text-neutral-200'
                      : 'bg-zinc-900 border border-zinc-800 text-neutral-400'
                  }`}>
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <img src={brianLogo} alt="" className="w-3 h-3 object-contain opacity-70" />
                        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">Brian</span>
                      </div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 border border-zinc-800 px-3 py-2.5 rounded-xl flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {hasHistory && <div className="mx-4 border-t border-zinc-800/60" />}

          <div className="px-4 pt-4 pb-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); resize(); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder={hasHistory ? 'Follow up or refine…' : 'Describe an automation and Brian will build it…'}
              rows={1}
              disabled={loading}
              className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-700 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
              style={{ minHeight: 24, maxHeight: 120 }}
            />
          </div>

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {!hasHistory && SUGGESTIONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => { setValue(label); textareaRef.current?.focus(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-transparent text-neutral-600 hover:text-neutral-300 hover:border-zinc-600 transition-all text-[11px] shrink-0"
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={submit}
              disabled={!value.trim() || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed shrink-0 ml-2"
              style={{
                background: value.trim() && !loading ? '#7c3aed' : '#1a1a1a',
                border: '1px solid',
                borderColor: value.trim() && !loading ? '#7c3aed' : '#2a2a2a',
              }}
            >
              {loading
                ? <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                : <ArrowUp className="w-3.5 h-3.5 text-white" />}
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
