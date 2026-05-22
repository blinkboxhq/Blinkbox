import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, Zap, Globe, Mail, Code2, GitBranch, RotateCcw, Sparkles } from 'lucide-react';
import brianLogo from '../../../assets/brian.webp';

const SUGGESTIONS = [
  { icon: Zap,       label: 'Webhook to Slack alert',     sub: 'POST any event, get a Slack notification' },
  { icon: Mail,      label: 'Auto-reply Gmail leads',      sub: 'Classify incoming emails and draft AI replies' },
  { icon: Globe,     label: 'Scrape & email digest',       sub: 'Crawl URLs daily, send summary to inbox' },
  { icon: Code2,     label: 'Transform & store data',      sub: 'Reshape JSON and write to database' },
  { icon: GitBranch, label: 'Conditional Stripe flow',     sub: 'Branch logic on payment events' },
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
    el.style.height = '28px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  useEffect(() => { resize(); }, [value, resize]);

  useEffect(() => {
    if (historyRef.current)
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [messages, loading]);

  const submit = async () => {
    const txt = value.trim();
    if (!txt || loading) return;
    const newMessages = [...messages, { role: 'user', content: txt }];
    setMessages(newMessages);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = '28px';
    setLoading(true);
    try {
      const result = await onSubmit?.(txt, newMessages);
      if (result?.text && !result?.navigated)
        setMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMessages([]); setValue(''); };
  const hasHistory = messages.length > 0;
  const active = focused || value.length > 0 || loading || hasHistory;

  return (
    <div className="w-full mb-8" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
      <style>{`
        @keyframes brianSpin  { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }
        @keyframes brianPulse { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .brian-scroll::-webkit-scrollbar { width: 3px; }
        .brian-scroll::-webkit-scrollbar-track { background: transparent; }
        .brian-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 99px; }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <img src={brianLogo} alt="Brian" className="w-8 h-8 object-contain rounded-xl" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-[#060606]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white">Brian</span>
            <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">AI</span>
          </div>
          <span className="text-[11px] text-neutral-600">Describe any automation and Brian builds it instantly</span>
        </div>
        {hasHistory && (
          <button onClick={reset} className="ml-auto flex items-center gap-1.5 text-[11px] text-neutral-600 hover:text-neutral-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/10">
            <RotateCcw className="w-3 h-3" /> New chat
          </button>
        )}
      </div>

      {/* Panel */}
      <div className="relative">
        {/* Animated border */}
        <div className="absolute inset-0 rounded-2xl" style={{
          padding: 1.5,
          background: active
            ? 'linear-gradient(90deg, #7c3aed, #a855f7, #6366f1, #7c3aed)'
            : 'linear-gradient(90deg, #27272a, #3f3f46, #27272a)',
          backgroundSize: '300% 100%',
          animation: loading ? 'brianSpin 1.4s linear infinite' : active ? 'brianPulse 3s ease infinite' : 'none',
          borderRadius: 16,
          zIndex: 0,
        }}>
          <div className="w-full h-full bg-[#080808]" style={{ borderRadius: 14 }} />
        </div>

        <div className="relative z-10 rounded-2xl bg-[#080808] overflow-hidden" style={{ borderRadius: 14 }}>

          {/* Chat history */}
          {hasHistory && (
            <div ref={historyRef} className="px-5 pt-5 pb-3 flex flex-col gap-3 max-h-[320px] overflow-y-auto brian-scroll">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {m.role === 'assistant' && (
                    <img src={brianLogo} alt="" className="w-6 h-6 rounded-lg object-contain shrink-0 mt-0.5 opacity-80" />
                  )}
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-violet-600/20 border border-violet-500/25 text-neutral-200 rounded-br-sm'
                      : 'bg-zinc-900/80 border border-zinc-800/80 text-neutral-400 rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <img src={brianLogo} alt="" className="w-6 h-6 rounded-lg object-contain shrink-0 mt-0.5 opacity-60" />
                  <div className="bg-zinc-900/80 border border-zinc-800/80 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasHistory && <div className="mx-5 border-t border-zinc-800/60" />}

          {/* Input area */}
          <div className="px-5 pt-5 pb-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => { setValue(e.target.value); resize(); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder={hasHistory ? 'Follow up or refine…' : 'Describe an automation — e.g. "When I get a new Stripe payment, post to Slack and add row to Google Sheets"'}
              rows={1}
              disabled={loading}
              className="w-full bg-transparent text-[14px] text-neutral-200 placeholder:text-neutral-700 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
              style={{ minHeight: 28, maxHeight: 140 }}
            />
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-4 pb-4 pt-2 gap-3">
            {/* Suggestion chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: 'none' }}>
              {!hasHistory && SUGGESTIONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => { setValue(label); textareaRef.current?.focus(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-800/60 text-neutral-500 hover:text-neutral-300 transition-all text-[11px] font-medium shrink-0 whitespace-nowrap"
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {label}
                </button>
              ))}
              {hasHistory && (
                <span className="text-[11px] text-neutral-700 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-violet-600" />
                  Brian remembers this conversation
                </span>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!value.trim() || loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed shrink-0"
              style={{
                background: value.trim() && !loading ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#111',
                boxShadow: value.trim() && !loading ? '0 0 16px rgba(124,58,237,0.35)' : 'none',
              }}
            >
              {loading
                ? <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                : <ArrowUp className="w-4 h-4 text-white" />
              }
            </button>
          </div>

          {/* Suggestion cards — only when empty */}
          {!hasHistory && (
            <div className="border-t border-zinc-900/80 grid grid-cols-3 gap-px bg-zinc-900/40">
              {SUGGESTIONS.slice(0, 3).map(({ icon: Icon, label, sub }) => (
                <button
                  key={label}
                  onClick={() => { setValue(label); textareaRef.current?.focus(); submit(); }}
                  className="flex items-start gap-3 p-4 bg-[#080808] hover:bg-zinc-900/60 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-violet-500/30 group-hover:bg-violet-500/5 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors leading-snug">{label}</p>
                    <p className="text-[11px] text-neutral-700 mt-0.5 leading-snug">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
