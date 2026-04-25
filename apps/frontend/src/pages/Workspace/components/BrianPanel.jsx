import { useState, useRef, useEffect } from 'react';
import { X, Send, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import brianLogo from '../../../assets/brian.webp';
import useWorkspaceStore from '../../../store/workspaceStore';
import api from '../../../lib/api';
import BrianThinkingBlock from './BrianThinkingBlock';
import BrianWorkflowPlan from './BrianWorkflowPlan';

// ── API call ──────────────────────────────────────────────────────────────────
async function callBrian(messages) {
  const { data } = await api.post('/api/brian/chat', { messages });
  return data;
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Send a Telegram message when a webhook fires',
  'Scrape a URL every hour and email the result',
  'When a form is submitted, save to DB and notify Slack',
  'Monitor Gmail and summarise new emails with AI',
];

// ── User message bubble ───────────────────────────────────────────────────────
function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm bg-violet-600/20 border border-violet-500/20 text-[12.5px] text-neutral-200 leading-relaxed">
        {text}
      </div>
    </div>
  );
}

// ── Brian text-only bubble ────────────────────────────────────────────────────
function BrianTextBubble({ text }) {
  return (
    <div className="text-[12.5px] text-neutral-300 leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function BrianPanel({ width, onResizeStart }) {
  const isBrianOpen = useWorkspaceStore(s => s.isBrianOpen);
  const setBrianOpen = useWorkspaceStore(s => s.setBrianOpen);
  const addNode = useWorkspaceStore(s => s.addNode);

  const WELCOME = {
    id: 'welcome', role: 'brian',
    text: "Hey! Describe what you want to automate and I'll build the workflow.",
    flow: null,
  };

  const [messages,  setMessages]  = useState([WELCOME]);
  const [input,     setInput]     = useState('');
  const [thinking,  setThinking]  = useState(false);
  const [thinkStart, setThinkStart] = useState(null);
  const [thinkMs,   setThinkMs]   = useState(null); // duration once done
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (isBrianOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isBrianOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const applyFlow = (flow) => {
    if (!flow?.nodes) return;
    flow.nodes.forEach(n => addNode(n));
    useWorkspaceStore.setState(s => ({ edges: [...s.edges, ...(flow.edges || [])] }));
  };

  const send = async (text) => {
    const txt = (text || input).trim();
    if (!txt || thinking) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', text: txt, flow: null };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);
    setThinkStart(Date.now());
    setThinkMs(null);

    try {
      const allMsgs = [...messages, userMsg].filter(m => m.id !== 'welcome');
      const history = allMsgs.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.text,
      }));
      const result = await callBrian(history);
      setThinkMs(Date.now() - (thinkStart || Date.now()));
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'brian',
        text: result.text, flow: result.flow,
      }]);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      const isConfig = msg.includes('GOOGLE_AI_KEY') || msg.includes('not configured');
      setThinkMs(Date.now() - (thinkStart || Date.now()));
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'brian', flow: null,
        text: isConfig
          ? '⚠️ Brian needs a key. Add GOOGLE_AI_KEY in Railway → Variables (free at aistudio.google.com).'
          : `⚠️ ${msg}`,
      }]);
    } finally {
      setThinking(false);
    }
  };

  const reset = () => { setMessages([WELCOME]); setInput(''); };

  if (!isBrianOpen) return null;

  const isFresh = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <>
    <div
      className="shrink-0 h-full flex flex-row bg-[#0d0d10] border-l border-[#222]"
      style={{ width: width ?? 360, animation: 'brianSlide 0.18s cubic-bezier(0.16,1,0.3,1)' }}
    >
      {/* Drag handle */}
      <div onMouseDown={onResizeStart}
        className="w-1 shrink-0 cursor-col-resize hover:bg-violet-500/30 active:bg-violet-500/40 transition-colors group border-r border-[#1a1a1a]">
        <div className="w-0.5 h-8 bg-neutral-800 group-hover:bg-violet-400 rounded-full mx-auto mt-[calc(50%-16px)] transition-colors" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center overflow-hidden">
              <img src={brianLogo} alt="Brian" className="w-4 h-4 object-contain" />
            </div>
            <span className="text-[13px] font-semibold text-white">Brian</span>
            <span className="text-[9px] font-mono text-neutral-700 bg-neutral-900 px-1.5 py-0.5 rounded">
              gemini-2.0-flash
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={reset} title="New conversation"
              className="p-1.5 text-neutral-700 hover:text-neutral-400 rounded-lg hover:bg-white/[0.04] transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setBrianOpen(false)}
              className="p-1.5 text-neutral-700 hover:text-neutral-400 rounded-lg hover:bg-white/[0.04] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const isFirst = i === 0 && msg.id === 'welcome';

            if (isUser) return <UserBubble key={msg.id} text={msg.text} />;

            return (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-2"
              >
                {/* Brian avatar row */}
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={brianLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                  </div>
                  <span className="text-[10px] font-semibold text-violet-400">Brian</span>
                </div>

                {/* Content */}
                <div className="ml-6">
                  {msg.flow ? (
                    <BrianWorkflowPlan
                      text={msg.text}
                      flow={msg.flow}
                      onAccept={applyFlow}
                    />
                  ) : (
                    <BrianTextBubble text={msg.text} />
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* ── Thinking block ── */}
          <AnimatePresence>
            {thinking && (
              <motion.div key="thinking"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={brianLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                  </div>
                  <span className="text-[10px] font-semibold text-violet-400">Brian</span>
                </div>
                <div className="ml-6">
                  <BrianThinkingBlock thinking={thinking} durationMs={thinkMs} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thinking block stays visible after done (shows collapsed "Thought for Xs") */}
          {!thinking && thinkMs != null && messages.length > 1 && (
            <div className="ml-[26px]">
              <BrianThinkingBlock thinking={false} durationMs={thinkMs} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Suggestion chips (fresh chat only) ── */}
        {isFresh && !thinking && (
          <div className="px-4 pb-3 space-y-1.5 shrink-0">
            <p className="text-[9px] text-neutral-700 uppercase tracking-widest font-medium mb-2">Try asking</p>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="w-full text-left px-3 py-2 rounded-lg border border-[#1e1e1e] bg-neutral-900/50 text-[11px] text-neutral-600 hover:text-neutral-300 hover:border-neutral-700 hover:bg-white/[0.03] transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <div className="px-3 pb-3 pt-2 border-t border-[#1e1e1e] shrink-0">
          <div className="flex items-end gap-2 bg-neutral-900 border border-[#2a2a2a] rounded-xl px-3 py-2.5 focus-within:border-neutral-700 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Describe what you want to automate…"
              rows={1}
              className="flex-1 bg-transparent text-[12px] text-neutral-200 placeholder:text-neutral-700 resize-none focus:outline-none leading-relaxed font-mono"
              style={{ maxHeight: 100, overflowY: 'auto' }}
              disabled={thinking}
            />
            <button onClick={() => send()} disabled={!input.trim() || thinking}
              className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 hover:bg-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

      </div>
    </div>

    <style>{`
      @keyframes brianSlide {
        from { opacity: 0; transform: translateX(16px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `}</style>
    </>
  );
}
