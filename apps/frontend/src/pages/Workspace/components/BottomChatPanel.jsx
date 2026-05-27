import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Trash2, Paperclip, X, Image, Plus } from 'lucide-react';
import api from '../../../lib/api';
import { useParams } from 'react-router-dom';
import NodeTreePanel from './NodeTreePanel';
import useWorkspaceStore from '../../../store/workspaceStore';

function Msg({ m }) {
  const isUser = m.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-neutral-800' : 'bg-violet-500/20 border border-violet-500/30'}`}>
        {isUser ? <User className="w-3 h-3 text-neutral-300" /> : <Bot className="w-3 h-3 text-violet-400" />}
      </div>
      <div className={`max-w-[80%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {m.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {m.attachments.map((a, i) =>
              a.mimeType?.startsWith('image/') ? (
                <img key={i} src={a.dataUrl} alt={a.name || 'attachment'}
                  className="max-w-[150px] max-h-[150px] rounded-lg border border-neutral-700 object-cover cursor-pointer"
                  onClick={() => window.open(a.dataUrl, '_blank')} />
              ) : (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg">
                  <Paperclip className="w-3 h-3 text-neutral-400" />
                  <span className="text-[10px] text-neutral-300">{a.name}</span>
                </div>
              )
            )}
          </div>
        )}
        {m.text && (
          <div className={`px-3 py-2 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-neutral-800 text-neutral-200 rounded-tr-sm' : 'bg-neutral-900 border border-[#222] text-neutral-300 rounded-tl-sm'}`}>
            {m.text}
          </div>
        )}
      </div>
    </div>
  );
}

function useSplitResize({ containerRef }) {
  const [leftPct, setLeftPct] = useState(50);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const onMove = (ev) => {
      const rect = container.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [containerRef]);

  return [leftPct, onMouseDown];
}

const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf,text/plain,text/csv';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`${file.name} is too large (max 10 MB)`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: reader.result, mimeType: file.type, name: file.name });
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function BottomChatPanel({ height, onResizeStart }) {
  const { id: automationId } = useParams();
  const nodeCount = useWorkspaceStore(s => s.nodes.length);
  const hasChatTrigger = useWorkspaceStore(s =>
    s.nodes.some(n => n.data?.backendType === 'chat_trigger' || n.data?.label === 'On Chat Message')
  );
  const addNode = useWorkspaceStore(s => s.addNode);
  const nodes = useWorkspaceStore(s => s.nodes);
  const setSelectedNodeId = useWorkspaceStore(s => s.setSelectedNodeId);
  const sessionIdRef = useRef(null);

  const addChatTrigger = useCallback(() => {
    const existingTriggers = nodes.filter(n => n.data?.type === 'trigger');
    const position = existingTriggers.length > 0
      ? { x: existingTriggers[existingTriggers.length - 1].position.x, y: existingTriggers[existingTriggers.length - 1].position.y + 220 }
      : { x: 400, y: 300 };
    const newId = `chat-${crypto.randomUUID()}`;
    addNode({
      id: newId,
      type: 'custom',
      position,
      data: { backendType: 'chat_trigger', label: 'On Chat Message', type: 'trigger', config: { triggerVariant: 'chat' } },
    });
    setSelectedNodeId(newId);
  }, [addNode, nodes, setSelectedNodeId]);

  const [messages, setMessages] = useState([
    { id: 'sys', role: 'system', text: 'Send a message to test your workflow.' }
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  const [leftPct, onSplitResize] = useSplitResize({ containerRef: bodyRef });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addFiles = useCallback(async (files) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf' || f.type.startsWith('text/'));
    if (!fileArr.length) return;
    try {
      const converted = await Promise.all(fileArr.map(fileToAttachment));
      setAttachments(prev => [...prev, ...converted].slice(0, 5));
    } catch (err) {
      console.warn('File read error:', err.message);
    }
  }, []);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); setIsDragOver(false); }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const send = async () => {
    const txt = input.trim();
    if ((!txt && !attachments.length) || sending) return;

    if (!hasChatTrigger) {
      setMessages(p => [...p, { id: Date.now(), role: 'bot', text: 'Add a Chat Trigger node to your workflow first.' }]);
      return;
    }
    if (!automationId) {
      setMessages(p => [...p, { id: Date.now(), role: 'bot', text: 'Save your workflow first (⌘S), then send a message.' }]);
      return;
    }

    setInput('');
    const sentAttachments = [...attachments];
    setAttachments([]);
    setSending(true);
    setMessages(p => [...p, { id: Date.now(), role: 'user', text: txt, attachments: sentAttachments }]);

    try {
      const apiAttachments = sentAttachments.map(a => ({
        data: a.dataUrl.split(',')[1] ?? '',
        mimeType: a.mimeType,
        name: a.name,
      }));

      const r = await api.post(`/api/chat/run/${automationId}`, {
        message: txt,
        attachments: apiAttachments,
        sessionId: sessionIdRef.current,
      }, { timeout: 120000 });

      const replyText = r.data?.reply || JSON.stringify(r.data?.output ?? {});
      setMessages(p => [...p, { id: Date.now() + 1, role: 'bot', text: replyText }]);
    } catch (e) {
      setMessages(p => [...p, { id: Date.now() + 1, role: 'bot', text: e.response?.data?.error || 'Workflow execution failed.' }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div
      className="flex flex-col bg-[#0d0d10] border-t border-[#222]"
      style={{ height }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-violet-500/10 border-2 border-violet-500/50 border-dashed rounded pointer-events-none">
          <Image className="w-8 h-8 text-violet-400 mb-2" />
          <p className="text-[13px] font-semibold text-violet-300">Drop files here</p>
          <p className="text-[10px] text-violet-500 mt-0.5">Images, PDFs, text files up to 10 MB</p>
        </div>
      )}

      <div
        className="h-1 w-full cursor-row-resize hover:bg-violet-500/30 transition-colors shrink-0 group"
        onMouseDown={onResizeStart}
      >
        <div className="w-8 h-0.5 bg-neutral-800 group-hover:bg-violet-400 rounded-full mx-auto mt-0.5 transition-colors" />
      </div>

      {/* Panel header */}
      <div className="flex items-center border-b border-[#222] shrink-0" style={{ height: 33 }}>
        <div className="flex items-center justify-between px-4 shrink-0" style={{ width: `${leftPct}%`, height: '100%' }}>
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[11px] font-semibold text-neutral-300">Chat</span>
            {hasChatTrigger
              ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">live</span>
              : <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-500">no trigger</span>
            }
          </div>
          <button
            onClick={() => {
              sessionIdRef.current = null;
              setMessages([{ id: 'sys', role: 'system', text: 'Chat cleared.' }]);
            }}
            className="p-1 text-neutral-700 hover:text-neutral-400 rounded transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        <div className="w-px bg-[#222] self-stretch" />

        <div className="flex items-center justify-between px-3 flex-1 min-w-0" style={{ height: '100%' }}>
          <span className="text-[10px] font-medium text-neutral-600 uppercase tracking-widest">Flow</span>
          <span className="text-[10px] text-neutral-700 font-mono">{nodeCount}</span>
        </div>
      </div>

      {/* Split body */}
      <div ref={bodyRef} className="flex flex-1 overflow-hidden min-h-0 relative">

        {/* Left: Chat */}
        <div className="flex flex-col overflow-hidden" style={{ width: `${leftPct}%` }}>
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
                <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-neutral-900 border border-[#222] text-[12px] text-neutral-600">Running…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="px-3 pb-3 pt-1.5 border-t border-[#222] shrink-0">
            <div className="flex flex-col gap-1.5">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {attachments.map((a, i) => (
                    <div key={i} className="relative group">
                      {a.mimeType.startsWith('image/') ? (
                        <img src={a.dataUrl} alt={a.name} className="w-14 h-14 rounded-lg object-cover border border-neutral-700" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg border border-neutral-700 bg-neutral-900 flex flex-col items-center justify-center gap-0.5 px-1">
                          <Paperclip className="w-4 h-4 text-neutral-500" />
                          <span className="text-[8px] text-neutral-600 text-center truncate w-full">{a.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-neutral-950 border border-neutral-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5 text-neutral-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 bg-neutral-900 border border-[#2a2a2a] rounded-xl px-3 py-2 focus-within:border-neutral-700 transition-colors">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-neutral-600 hover:text-neutral-400 shrink-0 transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  multiple
                  className="hidden"
                  onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={hasChatTrigger ? 'Send a message…' : 'Add a Chat Trigger first…'}
                  className="flex-1 bg-transparent text-[12px] text-neutral-200 placeholder:text-neutral-700 focus:outline-none"
                  disabled={sending}
                />
                <button
                  onClick={send}
                  disabled={(!input.trim() && !attachments.length) || sending}
                  className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-3 h-3 text-white" />
                </button>
              </div>

              {!hasChatTrigger && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-neutral-700 flex-1">No Chat Trigger on canvas</span>
                  <button onClick={addChatTrigger} className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-violet-400 transition-colors">
                    <Plus className="w-3 h-3" />Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vertical drag divider */}
        <div
          onMouseDown={onSplitResize}
          className="w-1 shrink-0 cursor-col-resize hover:bg-violet-500/30 active:bg-violet-500/40 transition-colors group border-x border-[#222] relative z-10"
        >
          <div className="w-0.5 h-8 bg-neutral-800 group-hover:bg-violet-400 rounded-full mx-auto mt-[calc(50%-16px)] transition-colors" />
        </div>

        {/* Right: Node Tree */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <NodeTreePanel embedded hideHeader />
        </div>
      </div>
    </div>
  );
}
