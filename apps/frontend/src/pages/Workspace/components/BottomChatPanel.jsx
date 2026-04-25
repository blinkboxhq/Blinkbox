import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { useParams } from 'react-router-dom';
import NodeTreePanel from './NodeTreePanel';

function Msg({ m }) {
  const isUser = m.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-neutral-800' : 'bg-violet-500/20 border border-violet-500/30'}`}>
        {isUser ? <User className="w-3 h-3 text-neutral-300" /> : <Bot className="w-3 h-3 text-violet-400" />}
      </div>
      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${isUser ? 'bg-neutral-800 text-neutral-200 rounded-tr-sm' : 'bg-neutral-900 border border-[#333] text-neutral-300 rounded-tl-sm'}`}>
        {m.text}
        {m.outputs && (
          <div className="mt-2 pt-2 border-t border-neutral-700/50 space-y-1">
            {Object.entries(m.outputs).map(([k, v]) => (
              <div key={k} className="text-[10px] font-mono">
                <span className="text-violet-400">{k}: </span>
                <span className="text-neutral-400">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BottomChatPanel({ height, onResizeStart }) {
  const { id: automationId } = useParams();
  const [messages, setMessages] = useState([
    { id: 'sys', role: 'system', text: 'Chat trigger is ready. Messages you send here will fire your workflow\'s chat trigger node and show the output.' }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setInput('');
    setSending(true);
    const userMsg = { id: Date.now(), role: 'user', text: txt };
    setMessages(p => [...p, userMsg]);

    try {
      const r = await api.post(`/api/execution/start/${automationId}`, { message: txt, trigger: 'chat' });
      const exec = r.data?.execution;
      setMessages(p => [...p, {
        id: Date.now() + 1,
        role: 'bot',
        text: exec?.status === 'executed' ? 'Workflow executed successfully.' : `Status: ${exec?.status || 'pending'}`,
        outputs: exec?.output || null,
      }]);
    } catch (e) {
      setMessages(p => [...p, { id: Date.now() + 1, role: 'bot', text: e.response?.data?.error || 'Execution failed.' }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex flex-col bg-neutral-950 border-t border-[#333]" style={{ height }}>
      {/* Resize handle */}
      <div
        className="h-1 w-full cursor-row-resize hover:bg-violet-500/30 transition-colors shrink-0 group"
        onMouseDown={onResizeStart}
      >
        <div className="w-8 h-0.5 bg-neutral-800 group-hover:bg-violet-400 rounded-full mx-auto mt-0.5 transition-colors" />
      </div>

      {/* Split body */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left: Chat Trigger ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[11px] font-semibold text-neutral-300">Chat Trigger</span>
              <span className="text-[10px] text-neutral-600">· test your workflow</span>
            </div>
            <button
              onClick={() => setMessages([{ id: 'sys', role: 'system', text: 'Chat cleared.' }])}
              className="p-1 text-neutral-700 hover:text-neutral-400 rounded transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map(m => (
              m.role === 'system'
                ? <p key={m.id} className="text-[10px] text-neutral-700 text-center py-1">{m.text}</p>
                : <Msg key={m.id} m={m} />
            ))}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
                </div>
                <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-neutral-900 border border-[#333] text-[12px] text-neutral-600">Running…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-1 shrink-0">
            <div className="flex items-center gap-2 bg-neutral-900 border border-[#333] rounded-xl px-3 py-2 focus-within:border-neutral-600 transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Send a message to trigger your workflow…"
                className="flex-1 bg-transparent text-[12px] text-neutral-200 placeholder:text-neutral-700 focus:outline-none"
                disabled={sending}
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Node Tree ── */}
        <NodeTreePanel embedded />
      </div>
    </div>
  );
}
