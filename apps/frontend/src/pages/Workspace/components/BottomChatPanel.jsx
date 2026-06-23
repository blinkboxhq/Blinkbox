import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, Plus, MessageSquare } from 'lucide-react';
import api from '../../../lib/api';
import { useParams } from 'react-router-dom';
import useWorkspaceStore from '../../../store/workspaceStore';

function BotAvatar() {
  return (
    <div style={{ width: 22, height: 22, borderRadius: 6, background: '#1a1a2e', border: '1px solid #2d2d4a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="#7c5cfc" strokeWidth="1.2" />
        <circle cx="6" cy="6" r="2" fill="#7c5cfc" />
      </svg>
    </div>
  );
}

function Msg({ m }) {
  const isUser = m.role === 'user';
  const isSystem = m.role === 'system';

  if (isSystem) {
    return (
      <p style={{ textAlign: 'center', fontSize: 10, color: '#3a3a3a', padding: '2px 0' }}>{m.text}</p>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      {!isUser && <BotAvatar />}
      <div
        style={{
          maxWidth: '78%',
          padding: '8px 12px',
          fontSize: 12,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          borderRadius: isUser ? '8px 2px 8px 8px' : '2px 8px 8px 8px',
          background: isUser ? '#1c1c22' : '#111115',
          border: `1px solid ${isUser ? '#2a2a35' : '#1e1e24'}`,
          color: isUser ? '#d4d4d8' : '#b4b4bb',
        }}
      >
        {m.text}
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
  }, [messages]);

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

  return (
    <div
      style={{ height, display: 'flex', flexDirection: 'column', background: '#0a0a0c', borderTop: '1px solid #1a1a1e' }}
    >
      {/* Resize grip */}
      <div
        onMouseDown={onResizeStart}
        style={{ height: 4, flexShrink: 0, cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        className="group hover:bg-white/[0.03] transition-colors"
      >
        <div style={{ width: 28, height: 2, borderRadius: 2, background: '#222' }} className="group-hover:bg-[#333] transition-colors" />
      </div>

      {/* Header */}
      <div style={{ height: 34, flexShrink: 0, borderBottom: '1px solid #141418', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare style={{ width: 12, height: 12, color: '#555' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#666', letterSpacing: '0.04em' }}>CHAT TEST</span>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 3,
            background: hasChatTrigger ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${hasChatTrigger ? 'rgba(34,197,94,0.2)' : '#222'}`,
            color: hasChatTrigger ? '#22c55e' : '#3a3a3a',
          }}>
            {hasChatTrigger ? 'live' : 'no trigger'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {!hasChatTrigger && (
            <button
              onClick={addChatTrigger}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, border: '1px solid #222', background: 'transparent', color: '#555', fontSize: 10, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#222'; }}
            >
              <Plus style={{ width: 10, height: 10 }} />
              Add trigger
            </button>
          )}
          <button
            onClick={clearChat}
            style={{ padding: 4, borderRadius: 4, background: 'transparent', border: 'none', color: '#333', cursor: 'pointer' }}
            title="Clear chat"
            onMouseEnter={e => e.currentTarget.style.color = '#666'}
            onMouseLeave={e => e.currentTarget.style.color = '#333'}
          >
            <Trash2 style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        {messages.map(m => <Msg key={m.id} m={m} />)}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BotAvatar />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: '2px 8px 8px 8px', background: '#111115', border: '1px solid #1e1e24' }}>
              <Loader2 style={{ width: 10, height: 10, color: '#444', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 11, color: '#444' }}>Running…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #141418', padding: '10px 14px' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0f0f13', border: '1px solid #1e1e24', borderRadius: 8, padding: '7px 10px 7px 14px' }}
          className="focus-within:border-[#2d2d3a] transition-colors"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={hasChatTrigger ? 'Send a test message…' : 'Add a Chat Trigger first…'}
            disabled={sending}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: '#ccc', caretColor: '#7c5cfc' }}
            className="placeholder:text-[#2a2a35]"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{
              width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
              background: input.trim() && !sending ? '#7c5cfc' : '#161618',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (input.trim() && !sending) e.currentTarget.style.background = '#6d4ef0'; }}
            onMouseLeave={e => { if (input.trim() && !sending) e.currentTarget.style.background = '#7c5cfc'; }}
          >
            <Send style={{ width: 11, height: 11, color: input.trim() && !sending ? '#fff' : '#333' }} />
          </button>
        </div>
        <p style={{ fontSize: 9, color: '#252528', marginTop: 5, textAlign: 'right' }}>Enter to send</p>
      </div>
    </div>
  );
}
