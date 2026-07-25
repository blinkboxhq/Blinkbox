import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, Plus, MessageSquare, Sparkles } from 'lucide-react';
import api from '../../../lib/api';
import { useParams } from 'react-router-dom';
import useWorkspaceStore from '../../../store/workspaceStore';
import { MarkdownRenderer } from './ChatMarkdown';

function BotAvatar() {
  return (
    <div className="w-5 h-5 rounded-md bg-[#161616] border border-[#242424] flex items-center justify-center shrink-0">
      <Sparkles className="w-3 h-3 text-neutral-500" />
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1 h-1 rounded-full bg-neutral-600 animate-pulse" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  );
}

function Msg({ m }) {
  if (m.role === 'system') {
    return <p className="text-center text-[10px] text-neutral-700 py-0.5">{m.text}</p>;
  }

  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] px-3 py-2 rounded-2xl rounded-tr-sm bg-[#1e1e1e] border border-[#2a2a2a] text-[12.5px] text-neutral-200 leading-relaxed whitespace-pre-wrap">
          {m.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <BotAvatar />
        <span className="text-[10px] font-medium text-neutral-500">Assistant</span>
      </div>
      <div className="ml-6">
        <MarkdownRenderer text={m.text} />
      </div>
    </div>
  );
}

export default function BottomChatPanel({ height, onResizeStart }) {
  const { id: automationId } = useParams();

  const hasChatTrigger = useWorkspaceStore(s =>
    s.nodes.some(n => n.data?.backendType === 'chat_trigger' || n.data?.label === 'On Chat Message')
  );
  const addNode = useWorkspaceStore(s => s.addNode);
  const nodes   = useWorkspaceStore(s => s.nodes);
  const setSelectedNodeId = useWorkspaceStore(s => s.setSelectedNodeId);
  const sessionIdRef = useRef(null);

  const addChatTrigger = useCallback(() => {
    const triggers = nodes.filter(n => n.data?.type === 'trigger');
    const position = triggers.length
      ? { x: triggers[triggers.length - 1].position.x, y: triggers[triggers.length - 1].position.y + 220 }
      : { x: 400, y: 300 };
    const newId = `chat-${crypto.randomUUID()}`;
    addNode({ id: newId, type: 'custom', position, data: { backendType: 'chat_trigger', label: 'On Chat Message', type: 'trigger', config: { triggerVariant: 'chat' } } });
    setSelectedNodeId(newId);
  }, [addNode, nodes, setSelectedNodeId]);

  const [messages, setMessages] = useState([
    { id: 'sys', role: 'system', text: 'Messages sent here run through your workflow.' }
  ]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const send = async () => {
    const txt = input.trim();
    if (!txt || sending) return;

    if (!hasChatTrigger) {
      setMessages(p => [...p, { id: Date.now(), role: 'bot', text: 'Add a Chat Trigger node to your workflow first.' }]);
      return;
    }
    if (!automationId) {
      setMessages(p => [...p, { id: Date.now(), role: 'bot', text: 'Save your workflow first (⌘S), then send a message.' }]);
      return;
    }

    setInput('');
    setSending(true);
    setMessages(p => [...p, { id: Date.now(), role: 'user', text: txt }]);

    try {
      const r = await api.post(`/api/chat/run/${automationId}`, {
        message: txt,
        sessionId: sessionIdRef.current,
      }, { timeout: 120000 });
      const reply = r.data?.reply || JSON.stringify(r.data?.output ?? {});
      setMessages(p => [...p, { id: Date.now() + 1, role: 'bot', text: reply }]);
    } catch (e) {
      setMessages(p => [...p, { id: Date.now() + 1, role: 'bot', text: e.response?.data?.error || 'Workflow execution failed.' }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const clearChat = () => {
    sessionIdRef.current = null;
    setMessages([{ id: 'sys', role: 'system', text: 'Chat cleared.' }]);
  };

  const canSend = input.trim() && !sending;

  return (
    <div style={{ height }} className="flex flex-col bg-[#0c0c0f] border-t border-[#1e1e1e]">
      {/* Resize grip */}
      <div
        onMouseDown={onResizeStart}
        className="group h-1 shrink-0 cursor-row-resize flex items-center justify-center hover:bg-white/[0.03] transition-colors"
      >
        <div className="w-7 h-0.5 rounded-full bg-neutral-800 group-hover:bg-neutral-700 transition-colors" />
      </div>

      {/* Header */}
      <div className="h-[38px] shrink-0 border-b border-[#1a1a1a] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3 text-neutral-600" />
          <span className="text-[11px] font-semibold text-neutral-500 tracking-wide">Chat Test</span>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
            hasChatTrigger
              ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
              : 'bg-white/[0.03] border-[#242424] text-neutral-600'
          }`}>
            {hasChatTrigger ? 'live' : 'no trigger'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!hasChatTrigger && (
            <button
              onClick={addChatTrigger}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#242424] text-neutral-500 text-[10px] hover:text-neutral-300 hover:border-neutral-600 transition-colors"
            >
              <Plus className="w-2.5 h-2.5" />
              Add trigger
            </button>
          )}
          <button
            onClick={clearChat}
            title="Clear chat"
            className="p-1.5 rounded-lg text-neutral-700 hover:text-neutral-400 hover:bg-white/[0.04] transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.map(m => <Msg key={m.id} m={m} />)}
        {sending && (
          <div className="flex items-center gap-1.5">
            <BotAvatar />
            <ThinkingDots />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[#1a1a1a] px-3 py-2.5">
        <div className="flex items-end gap-2 bg-neutral-900 border border-[#252525] rounded-xl px-3 py-2 focus-within:border-neutral-700 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={hasChatTrigger ? 'Send a test message…' : 'Add a Chat Trigger first…'}
            disabled={sending}
            rows={1}
            className="flex-1 bg-transparent text-[12px] text-neutral-200 placeholder:text-neutral-700 resize-none focus:outline-none leading-relaxed max-h-[120px]"
          />
          <button
            onClick={send}
            disabled={!canSend}
            className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 hover:bg-neutral-200 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5 text-neutral-950" />
          </button>
        </div>
        <p className="text-[9px] text-neutral-700 mt-1.5 text-right">⏎ send · ⇧⏎ newline</p>
      </div>
    </div>
  );
}
