import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';

function Bubble({ msg, myUserId }) {
  const isSelf = msg.isSelf || msg.fromUserId === myUserId;
  return (
    <div className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isSelf && (
        msg.fromAvatar
          ? <img src={msg.fromAvatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
          : <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[8px] font-bold text-white uppercase"
              style={{ background: msg.fromColor || '#7c3aed' }}>
              {msg.fromName?.charAt(0) || '?'}
            </div>
      )}
      <div className={`max-w-[75%] px-2.5 py-1.5 rounded-2xl text-[12px] leading-relaxed break-words
        ${isSelf
          ? 'bg-violet-600 text-white rounded-tr-sm'
          : 'bg-neutral-800 text-neutral-200 rounded-tl-sm'
        }`}>
        {msg.text}
      </div>
    </div>
  );
}

export default function CollabDMChat({ peer, myUserId, automationId, messages, onSend, onClose }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    onSend(txt);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div
      className="fixed bottom-4 right-4 w-72 bg-neutral-950 border border-[#333] rounded-2xl shadow-2xl z-[9998] flex flex-col overflow-hidden"
      style={{ height: 340 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#333] shrink-0"
           style={{ borderTop: `2px solid ${peer.color || '#7c3aed'}` }}>
        {peer.avatar
          ? <img src={peer.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
          : <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white uppercase"
              style={{ background: peer.color || '#7c3aed' }}>
              {peer.name?.charAt(0) || '?'}
            </div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white truncate">{peer.name}</p>
          <p className="text-[9px] text-neutral-600">editing this workflow</p>
        </div>
        <button onClick={onClose} className="p-1 text-neutral-600 hover:text-neutral-300 rounded-lg transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-[11px] text-neutral-700 text-center mt-6">
            Say hi to {peer.name}!
          </p>
        )}
        {messages.map(m => (
          <Bubble key={m.id} msg={m} myUserId={myUserId} />
        ))}
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
            placeholder="Message…"
            className="flex-1 bg-transparent text-[12px] text-neutral-200 placeholder:text-neutral-700 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-5 h-5 rounded-md bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors disabled:opacity-30"
          >
            <Send className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
