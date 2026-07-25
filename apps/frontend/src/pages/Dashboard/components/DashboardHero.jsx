import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp, Sparkles, Loader2, RotateCcw, ArrowRight, Square,
  Zap, Mail, Clock, Globe, GitBranch, Database,
} from 'lucide-react';
import api from '../../../lib/api';
import brianLogo from '../../../assets/brian.svg';

const API_URL = import.meta.env.VITE_API_URL || '';

/* The dashboard Brian hero: a real conversational composer. It streams the same
   /api/brian/chat/stream backend the workspace panel uses, shows Brian thinking /
   replying / asking inline, then hands the whole conversation off to a fresh
   workspace where the full BrianPanel resumes building on the live canvas. No
   functionality is faked — this is the front door to the real builder. */

// ── Streaming SSE client (mirrors BrianPanel) ──────────────────────────────────
async function* streamBrian(messages, signal) {
  const token = localStorage.getItem('blinkbox_token');
  const response = await fetch(`${API_URL}/api/brian/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, canvasContext: { nodes: [], edges: [], workflowName: 'Untitled' } }),
    signal,
  });
  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try { const j = await response.json(); errMsg = j.message || errMsg; } catch {}
    throw new Error(errMsg);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const part of parts) {
      const line = part.trim();
      if (line.startsWith('data: ')) {
        try { yield JSON.parse(line.slice(6)); } catch {}
      }
    }
  }
}

const STARTERS = [
  { icon: Zap,       color: '#8b5cf6', text: 'When a webhook fires, post a formatted message to Slack' },
  { icon: Mail,      color: '#0ea5e9', text: 'Auto-reply to new Gmail leads and log them to a sheet' },
  { icon: Clock,     color: '#f59e0b', text: 'Every morning at 8am, email me a digest of top HN posts' },
  { icon: Globe,     color: '#10b981', text: 'Scrape a page hourly and save new content to a database' },
  { icon: GitBranch, color: '#a3a3a3', text: 'Summarize each merged GitHub PR into a Notion page' },
  { icon: Database,  color: '#06b6d4', text: 'On a new Stripe charge, store the customer in Postgres' },
];

const PILL = 'rounded-full border border-[var(--bb-border-subtle)] bg-[var(--bb-surface-1)]';

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1 w-1 rounded-full bg-violet-400/80"
          style={{ animation: `bbDot 1.2s ${i * 0.16}s ease-in-out infinite` }}
        />
      ))}
    </span>
  );
}

const DashboardHero = forwardRef(function DashboardHero({ userName, compact = false }, ref) {
  const navigate = useNavigate();
  const [value, setValue]     = useState('');
  const [phase, setPhase]     = useState('idle'); // idle | streaming | done | error
  const [thinking, setThinking] = useState('');
  const [reply, setReply]     = useState('');
  const [questions, setQuestions] = useState(null);
  const [hasFlow, setHasFlow] = useState(false);
  const [error, setError]     = useState('');
  const [messages, setMessages] = useState([]);

  const taRef    = useRef(null);
  const abortRef = useRef(null);
  const first = userName?.split(' ')[0] || 'there';

  const resize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);
  useEffect(() => { resize(); }, [value, resize]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = () => {
    abortRef.current?.abort();
    setPhase('idle'); setThinking(''); setReply(''); setQuestions(null);
    setHasFlow(false); setError(''); setMessages([]); setValue('');
  };

  // Hand the conversation to a fresh workspace; the full BrianPanel resumes there.
  const handoff = async (history) => {
    const seed = history.find((m) => m.role === 'user')?.content || 'New automation';
    const name = seed.length > 48 ? `${seed.slice(0, 45)}…` : seed;
    try {
      const r = await api.post('/api/automation', { name, description: '', trigger: 'manual' });
      const wf = r.data?.automation;
      if (wf?._id) {
        navigate(`/workspace/${wf._id}`, { state: { brianPrompt: seed } });
        return true;
      }
    } catch (e) { setError(e.message || 'Could not open the builder.'); }
    return false;
  };

  const run = async (text) => {
    const txt = text.trim();
    if (!txt || phase === 'streaming') return;
    const history = [...messages, { role: 'user', content: txt }];
    setMessages(history);
    setValue('');
    setPhase('streaming'); setThinking(''); setReply(''); setQuestions(null);
    setHasFlow(false); setError('');

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';
    let flowSeen = false;

    try {
      for await (const ev of streamBrian(history, controller.signal)) {
        if (ev.type === 'thinking_delta') setThinking((t) => t + (ev.delta || ''));
        else if (ev.type === 'text_delta') { acc += ev.delta || ''; setReply(acc); }
        else if (ev.type === 'questions') {
          setQuestions(ev.questions || ev.data || null);
          if (ev.intro && !acc) { acc = ev.intro; setReply(acc); }
        }
        else if (ev.type === 'flow') { flowSeen = true; setHasFlow(true); }
        else if (ev.type === 'error') throw new Error(ev.message || 'Brian hit an error.');
        else if (ev.type === 'done') break;
      }
      setMessages((m) => [...m, { role: 'assistant', content: acc }]);
      setPhase('done');
      // Brian produced a buildable flow with no open questions → go build it for real.
      if (flowSeen) handoff(history);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message || 'Something went wrong.');
      setPhase('error');
    } finally {
      abortRef.current = null;
    }
  };

  const stop = () => { abortRef.current?.abort(); setPhase('done'); };

  useImperativeHandle(ref, () => ({
    run: (text) => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      run(text);
    },
  }));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(value); }
  };

  const active = phase === 'streaming' || phase === 'done' || phase === 'error';
  const showThinking = phase === 'streaming' && thinking && !reply;

  // ── Compact bar (shown when the user already has workflows) ──
  if (compact) {
    return (
      <div className="mb-6">
        <div
          className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface-1)] px-4 py-2.5 transition-colors focus-within:border-violet-500/40"
        >
          <div
            className="bb-aura pointer-events-none absolute -left-8 top-1/2 h-32 w-64 -translate-y-1/2"
            style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.14) 0%, transparent 70%)' }}
          />
          <img src={brianLogo} alt="Brian" className="relative h-5 w-5 shrink-0 object-contain" />
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe an automation and Brian builds it…"
            className="relative max-h-[120px] flex-1 resize-none bg-transparent text-[13px] text-[var(--bb-text-hi)] placeholder:text-[var(--bb-text-dim)] focus:outline-none"
          />
          <button
            onClick={() => run(value)}
            disabled={!value.trim() || phase === 'streaming'}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-all enabled:hover:bg-violet-500 enabled:active:scale-95 disabled:opacity-30"
          >
            {phase === 'streaming' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  // ── Full hero (empty / first-run state) ──
  return (
    <div className="relative mb-10 flex flex-col items-center overflow-hidden pb-6 pt-12">
      <style>{`@keyframes bbDot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}`}</style>

      <div
        className="bb-aura pointer-events-none absolute left-1/2 top-[-40px] h-[380px] w-[760px] -translate-x-1/2"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(139,92,246,0.16) 0%, transparent 62%)' }}
      />

      <div className="relative flex w-full max-w-[680px] flex-col items-center gap-7 text-center">
        {/* Eyebrow */}
        <span className={`inline-flex items-center gap-2 px-3 py-1 ${PILL}`}>
          <img src={brianLogo} alt="" className="h-4 w-4 object-contain" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            Brian · AI builder
          </span>
        </span>

        <h1 className="text-[32px] font-bold leading-[1.12] tracking-tight text-[var(--bb-text-hi)]">
          Hi {first}, what should we
          <br />
          <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            automate today?
          </span>
        </h1>

        <p className="-mt-2 max-w-[440px] text-[13px] leading-relaxed text-[var(--bb-text-lo)]">
          Describe it in plain language. Brian wires the triggers, logic, and apps —
          then opens it on the canvas for you to run.
        </p>

        {/* Composer */}
        <div className="w-full">
          <div className="bb-sheen relative flex flex-col overflow-hidden rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface-1)] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] transition-colors focus-within:border-violet-500/50">
            <div className="flex items-end gap-3 px-4 py-3.5">
              <Sparkles className="mb-1 h-4 w-4 shrink-0 text-violet-400" />
              <textarea
                ref={taRef}
                rows={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="e.g. When a customer pays in Stripe, add them to my Mailchimp list and DM me on Slack"
                className="max-h-[200px] flex-1 resize-none bg-transparent py-1 text-left text-[14px] leading-relaxed text-[var(--bb-text-hi)] placeholder:text-[var(--bb-text-dim)] focus:outline-none"
              />
              {phase === 'streaming' ? (
                <button
                  onClick={stop}
                  title="Stop"
                  className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] text-[var(--bb-text-mid)] transition-all hover:text-[var(--bb-text-hi)] active:scale-95"
                >
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => run(value)}
                  disabled={!value.trim()}
                  title="Build it"
                  className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition-all enabled:hover:bg-violet-500 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Live stream surface */}
            {active && (
              <div className="border-t border-[var(--bb-border-subtle)] bg-[var(--bb-surface-0)]/40 px-4 py-3.5 text-left">
                <div className="mb-2 flex items-center gap-2">
                  <img src={brianLogo} alt="" className="h-4 w-4 object-contain" />
                  <span className="text-[11px] font-semibold text-[var(--bb-text-mid)]">Brian</span>
                  {phase === 'streaming' && <ThinkingDots />}
                </div>

                {showThinking && (
                  <p className="mb-2 line-clamp-3 text-[12px] italic leading-relaxed text-[var(--bb-text-dim)]">
                    {thinking}
                  </p>
                )}

                {reply && (
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--bb-text-mid)]">
                    {reply}
                  </p>
                )}

                {Array.isArray(questions) && questions.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {questions.map((q, i) => {
                      const label = typeof q === 'string' ? q : q.question || q.text;
                      return (
                        <button
                          key={i}
                          onClick={() => run(label)}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--bb-border-subtle)] bg-[var(--bb-surface-1)] px-3 py-2 text-left text-[12px] text-[var(--bb-text-mid)] transition-colors hover:border-violet-500/40 hover:text-[var(--bb-text-hi)]"
                        >
                          {label}
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--bb-text-dim)]" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {error && (
                  <p className="mt-2 text-[12px] text-rose-400">{error}</p>
                )}

                {/* Actions once a turn settles */}
                {(phase === 'done' || phase === 'error') && (
                  <div className="mt-3 flex items-center gap-2">
                    {hasFlow ? (
                      <span className="flex items-center gap-1.5 text-[12px] text-violet-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening the builder…
                      </span>
                    ) : (
                      <button
                        onClick={() => handoff(messages)}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-violet-500 active:scale-95"
                      >
                        Open in builder <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={reset}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--bb-border-subtle)] px-3 py-1.5 text-[12px] font-medium text-[var(--bb-text-lo)] transition-colors hover:text-[var(--bb-text-hi)]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> New
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!active && (
            <p className="mt-2 text-[11px] text-[var(--bb-text-dim)]">
              <kbd className="rounded border border-[var(--bb-border-subtle)] px-1 py-0.5 font-sans text-[10px]">Enter</kbd> to build ·
              <kbd className="ml-1 rounded border border-[var(--bb-border-subtle)] px-1 py-0.5 font-sans text-[10px]">Shift+Enter</kbd> for a new line
            </p>
          )}
        </div>

        {/* Starters */}
        {!active && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {STARTERS.map(({ icon: Icon, color, text }) => (
              <button
                key={text}
                onClick={() => run(text)}
                className="group flex items-center gap-3 rounded-xl border border-[var(--bb-border-subtle)] bg-[var(--bb-surface-1)] px-3.5 py-2.5 text-left transition-all hover:border-[var(--bb-border)] hover:bg-[var(--bb-surface-2)]"
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                <span className="flex-1 truncate text-[12px] text-[var(--bb-text-mid)] group-hover:text-[var(--bb-text-hi)]">
                  {text}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--bb-text-dim)] opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default DashboardHero;
