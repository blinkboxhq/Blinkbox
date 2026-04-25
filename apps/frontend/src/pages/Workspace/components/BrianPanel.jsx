import { useState, useRef, useEffect } from 'react';
import { X, Send, ChevronRight, RotateCcw, Check } from 'lucide-react';
import brianLogo from '../../../assets/brian.webp';
import useWorkspaceStore from '../../../store/workspaceStore';

// ── Stub: replace with real Gemma call later ─────────────────────────────────
async function callBrian(messages) {
  // TODO: POST /api/ai/chat with messages array, stream back response
  // For now returns a mock after a fake delay
  await new Promise((r) => setTimeout(r, 1400));

  return {
    text: "I've designed a flow for you. It starts with a Webhook trigger, passes data through a Code node to transform it, then sends an email notification. Click **Apply to canvas** to drop it in.",
    flow: {
      nodes: [
        {
          id: 'brian-1',
          type: 'custom',
          position: { x: 200, y: 200 },
          data: { label: 'Webhook Trigger', backendType: 'webhook', type: 'trigger', config: {} },
        },
        {
          id: 'brian-2',
          type: 'custom',
          position: { x: 200, y: 380 },
          data: { label: 'Transform Data', backendType: 'code', type: 'action', config: {} },
        },
        {
          id: 'brian-3',
          type: 'custom',
          position: { x: 200, y: 560 },
          data: { label: 'Send Email', backendType: 'email', type: 'action', config: {} },
        },
      ],
      edges: [
        { id: 'be-1-2', source: 'brian-1', target: 'brian-2', type: 'configurable', data: { conditionPath: '' } },
        { id: 'be-2-3', source: 'brian-2', target: 'brian-3', type: 'configurable', data: { conditionPath: '' } },
      ],
    },
  };
}

// ── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, onApply }) {
  const isUser = msg.role === 'user';
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    onApply(msg.flow);
    setApplied(true);
  };

  // Parse **bold** markdown
  const renderText = (text) => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith('**') ? (
        <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
      ) : part
    );
  };

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
          <img src={brianLogo} alt="Brian" className="w-4 h-4 object-contain" />
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed ${
            isUser
              ? 'bg-white/[0.08] text-neutral-200 rounded-tr-sm'
              : 'bg-[#111] border border-zinc-800 text-neutral-300 rounded-tl-sm'
          }`}
        >
          {renderText(msg.text)}
        </div>

        {/* Apply to canvas button */}
        {!isUser && msg.flow && (
          <button
            onClick={handleApply}
            disabled={applied}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              applied
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                : 'bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20'
            }`}
          >
            {applied
              ? <><Check className="w-3 h-3" /> Applied</>
              : <><ChevronRight className="w-3 h-3" /> Apply to canvas</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ── Thinking indicator ───────────────────────────────────────────────────────
function Thinking() {
  return (
    <div className="flex gap-2.5">
      <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
        <img src={brianLogo} alt="Brian" className="w-4 h-4 object-contain" />
      </div>
      <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-[#111] border border-zinc-800 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400/60"
            style={{ animation: `brianDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Suggested prompts ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Send a Telegram message when a webhook fires',
  'Scrape a URL every hour and email the result',
  'When form is submitted, save to database and notify Slack',
  'Fetch API data daily and transform it with code',
];

// ════════════════════════════════════════════════════════════════════════════
export default function BrianPanel() {
  const isBrianOpen = useWorkspaceStore((s) => s.isBrianOpen);
  const setBrianOpen = useWorkspaceStore((s) => s.setBrianOpen);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setNodes = useWorkspaceStore((s) => s.setNodes);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'brian',
      text: "Hey, I'm Brian — your AI workflow assistant. Describe what you want to automate and I'll build it for you.",
      flow: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isBrianOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isBrianOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text) => {
    const txt = text || input.trim();
    if (!txt || thinking) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', text: txt, flow: null };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const result = await callBrian(history);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'brian', text: result.text, flow: result.flow }]);
    } catch {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'brian', text: "Sorry, I hit an error. Try again.", flow: null }]);
    } finally {
      setThinking(false);
    }
  };

  const applyFlow = (flow) => {
    if (!flow) return;
    flow.nodes.forEach((n) => addNode(n));
    // edges are set via store directly
    useWorkspaceStore.setState((s) => ({
      edges: [...s.edges, ...flow.edges],
    }));
  };

  const reset = () => {
    setMessages([{
      id: 'welcome',
      role: 'brian',
      text: "Hey, I'm Brian — your AI workflow assistant. Describe what you want to automate and I'll build it for you.",
      flow: null,
    }]);
    setInput('');
  };

  if (!isBrianOpen) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 z-30"
        onClick={() => setBrianOpen(false)}
      />

      {/* Panel */}
      <div
        className="absolute top-0 right-0 h-full w-[360px] z-40 flex flex-col bg-[#0a0a0a] border-l border-zinc-800/80"
        style={{ animation: 'brianSlide 0.2s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center overflow-hidden">
              <img src={brianLogo} alt="Brian" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-none">Brian</p>
              <p className="text-[10px] text-neutral-600 mt-0.5">AI workflow assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={reset}
              title="New conversation"
              className="p-1.5 text-neutral-700 hover:text-neutral-400 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setBrianOpen(false)}
              className="p-1.5 text-neutral-700 hover:text-neutral-400 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} onApply={applyFlow} />
          ))}
          {thinking && <Thinking />}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions — only shown on fresh chat */}
        {messages.length === 1 && !thinking && (
          <div className="px-4 pb-3 space-y-1.5 shrink-0">
            <p className="text-[10px] text-neutral-700 uppercase tracking-widest mb-2">Try asking</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-800/80 bg-[#0f0f0f] text-[11.5px] text-neutral-500 hover:text-neutral-300 hover:border-zinc-700 hover:bg-white/[0.03] transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 pb-4 pt-2 border-t border-zinc-800/80 shrink-0">
          <div className="flex items-end gap-2 bg-[#0f0f0f] border border-zinc-800 rounded-xl px-3 py-2.5 focus-within:border-zinc-600 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Describe your automation..."
              rows={1}
              className="flex-1 bg-transparent text-[12.5px] text-neutral-200 placeholder:text-neutral-700 resize-none focus:outline-none leading-relaxed"
              style={{ maxHeight: 96, overflowY: 'auto' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center shrink-0 hover:bg-violet-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-neutral-800 mt-1.5 text-center">Brian · powered by Gemma</p>
        </div>
      </div>

      <style>{`
        @keyframes brianSlide {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes brianDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </>
  );
}
