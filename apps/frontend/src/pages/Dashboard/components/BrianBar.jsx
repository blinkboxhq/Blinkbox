import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, RotateCcw } from 'lucide-react';
import brianLogo from '../../../assets/brian.webp';

const SUGGESTIONS = [
  'Webhook to Slack alert',
  'Auto-reply Gmail leads',
  'Scrape & email digest',
  'Transform & store data',
  'Monitor prices daily',
  'GitHub PR summaries',
];

export default function BrianBar({ onSubmit }) {
  const [value, setValue]       = useState('');
  const [focused, setFocused]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [messages, setMessages] = useState([]);
  const textareaRef = useRef(null);
  const bottomRef   = useRef(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => { resize(); }, [value, resize]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const submit = async () => {
    const txt = value.trim();
    if (!txt || loading) return;
    const newMessages = [...messages, { role: 'user', content: txt }];
    setMessages(newMessages);
    setValue('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
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
  const canSend = value.trim().length > 0 && !loading;

  return (
    <div className="w-full mb-8 flex flex-col items-center">
    <div className="w-full max-w-[680px]">
      <style>{`
        @keyframes gradientMove { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        @keyframes gradientSpin { 0% { background-position:0% 50%; } 100% { background-position:300% 50%; } }
        .brian-messages::-webkit-scrollbar { width:3px; }
        .brian-messages::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:99px; }
      `}</style>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#0c0c0c',
          border: '1px solid',
          borderColor: focused || hasHistory ? 'rgba(124,58,237,0.3)' : '#1e1e1e',
          boxShadow: focused || hasHistory ? '0 0 0 1px rgba(124,58,237,0.08), 0 24px 48px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.4)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        {/* Chat history */}
        {hasHistory && (
          <div className="brian-messages px-6 pt-6 pb-4 flex flex-col gap-4 max-h-[360px] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant'
                  ? <img src={brianLogo} alt="" className="w-6 h-6 rounded-lg object-contain shrink-0 mt-0.5" />
                  : <div className="w-6 h-6 rounded-full bg-neutral-800 shrink-0 mt-0.5 flex items-center justify-center text-[9px] font-bold text-neutral-400">U</div>
                }
                <div className={`max-w-[78%] text-[13px] leading-relaxed px-4 py-2.5 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tr-sm'
                    : 'text-neutral-400 rounded-tl-sm bg-transparent'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <img src={brianLogo} alt="" className="w-6 h-6 rounded-lg object-contain shrink-0 mt-0.5 opacity-60" />
                <div className="flex items-center gap-1 py-2">
                  {[0, 120, 240].map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {hasHistory && <div className="mx-6 border-t border-[#161616]" />}

        {/* Input row */}
        <div className="flex items-end gap-3 px-5 py-4">
          <img src={brianLogo} alt="Brian" className="w-6 h-6 rounded-lg object-contain shrink-0 mb-0.5 opacity-70" />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => { setValue(e.target.value); resize(); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={hasHistory ? 'Follow up…' : 'Describe an automation and Brian will build it…'}
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-700 resize-none focus:outline-none leading-relaxed disabled:opacity-40"
            style={{ minHeight: 24 }}
          />
          <div className="flex items-center gap-2 shrink-0 mb-0.5">
            {hasHistory && (
              <button onClick={reset} title="New chat" className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-700 hover:text-neutral-400 hover:bg-white/[0.04] transition-all">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={submit}
              disabled={!canSend}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-20"
              style={{
                background: canSend ? '#7c3aed' : '#1a1a1a',
                boxShadow: canSend ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
              }}
            >
              {loading
                ? <div className="w-3 h-3 border-2 border-violet-300 border-t-transparent rounded-full animate-spin" />
                : <ArrowUp className="w-3.5 h-3.5 text-white" />
              }
            </button>
          </div>
        </div>

        {/* Suggestions */}
        {!hasHistory && (
          <div className="px-5 pb-4 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setValue(s); textareaRef.current?.focus(); resize(); }}
                className="px-3 py-1.5 rounded-full text-[11px] text-neutral-600 border border-[#1e1e1e] hover:border-neutral-700 hover:text-neutral-400 bg-transparent transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
