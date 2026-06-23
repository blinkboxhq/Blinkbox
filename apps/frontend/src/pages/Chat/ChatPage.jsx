import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Paperclip, X, Download, FileText, Image, File,
  ChevronDown, ChevronRight, Copy, Check, ArrowLeft, RotateCcw,
  Bot, Code2, Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../lib/api";
const nanoid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

// ── Helpers ───────────────────────────────────────────────────────────────────
const SESSION_KEY = "bb_chat_session";

function getOrCreateSession() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) { id = nanoid(12); sessionStorage.setItem(SESSION_KEY, id); }
  return id;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeIcon(type) {
  if (!type) return File;
  if (type.startsWith("image/")) return Image;
  if (type === "application/pdf" || type.includes("text") || type.includes("json") || type.includes("xml")) return FileText;
  if (type.includes("python") || type.includes("javascript") || type.includes("typescript")) return Code2;
  return File;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text, className = "" }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={copy}
      className={`flex items-center gap-1 text-[10px] transition-colors ${copied ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-300"} ${className}`}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock({ lang, code }) {
  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-500">{lang || "code"}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="px-4 py-3 bg-[#0a0a0c] overflow-x-auto">
        <code className="text-[11.5px] font-mono text-zinc-300 leading-[1.7]">{code}</code>
      </pre>
    </div>
  );
}

// ── Inline parser ─────────────────────────────────────────────────────────────
function parseInline(text, key = 0) {
  const parts = [];
  let rem = text, i = key * 1000;
  while (rem.length > 0) {
    const cm = rem.match(/^`([^`]+)`/);
    if (cm) { parts.push(<code key={i++} className="px-1 py-0.5 bg-zinc-800 rounded text-[11px] font-mono text-violet-300">{cm[1]}</code>); rem = rem.slice(cm[0].length); continue; }
    const bm = rem.match(/^\*\*([^*]+)\*\*/);
    if (bm) { parts.push(<strong key={i++} className="font-semibold text-zinc-100">{bm[1]}</strong>); rem = rem.slice(bm[0].length); continue; }
    const im = rem.match(/^\*([^*]+)\*/);
    if (im) { parts.push(<em key={i++} className="italic text-zinc-400">{im[1]}</em>); rem = rem.slice(im[0].length); continue; }
    const next = rem.search(/[`*]/);
    if (next === -1) { parts.push(rem); break; }
    if (next > 0) parts.push(rem.slice(0, next));
    rem = rem.slice(Math.max(next, 1));
  }
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MarkdownRenderer({ text }) {
  const segments = useMemo(() => text.split(/(```[\s\S]*?```)/g), [text]);
  return (
    <div className="space-y-2 text-[13px] text-zinc-300 leading-relaxed">
      {segments.map((seg, si) => {
        if (seg.startsWith("```")) {
          const m = seg.match(/```(\w*)\n?([\s\S]*?)```/);
          return <CodeBlock key={si} lang={m?.[1] || ""} code={m?.[2]?.trim() || seg} />;
        }
        const lines = seg.split("\n");
        const out = [];
        let listBuf = [];
        const flush = (idx) => {
          if (!listBuf.length) return;
          out.push(<ul key={`l-${idx}`} className="pl-1 space-y-1">{listBuf.map((it, ii) => (
            <li key={ii} className="flex gap-2">
              <span className="text-violet-400 shrink-0">{it.ordered ? `${it.n}.` : "·"}</span>
              <span>{parseInline(it.content, ii)}</span>
            </li>
          ))}</ul>);
          listBuf = [];
        };
        lines.forEach((line, li) => {
          const b = line.match(/^[-*]\s+(.+)/), n = line.match(/^(\d+)\.\s+(.+)/);
          if (b) { listBuf.push({ ordered: false, content: b[1] }); return; }
          if (n) { listBuf.push({ ordered: true, n: n[1], content: n[2] }); return; }
          flush(li);
          if (line.startsWith("### ")) out.push(<p key={li} className="font-semibold text-zinc-100 text-[13px] mt-1">{parseInline(line.slice(4), li)}</p>);
          else if (line.startsWith("## ")) out.push(<p key={li} className="font-bold text-zinc-100 text-[14px] mt-2">{parseInline(line.slice(3), li)}</p>);
          else if (line.startsWith("# ")) out.push(<p key={li} className="font-bold text-white text-[16px] mt-2">{parseInline(line.slice(2), li)}</p>);
          else if (line.trim()) out.push(<p key={li}>{parseInline(line, li)}</p>);
          else if (li > 0 && out.length > 0) out.push(<div key={`sp-${li}`} className="h-1" />);
        });
        flush("end");
        return <div key={si} className="space-y-1">{out}</div>;
      })}
    </div>
  );
}

// ── File attachment chip (pre-send) ───────────────────────────────────────────
function AttachmentChip({ att, onRemove }) {
  const Icon = getMimeIcon(att.type);
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-[11px] text-zinc-300 shrink-0">
      <Icon className="w-3 h-3 text-violet-400 shrink-0" />
      <span className="max-w-[120px] truncate">{att.name}</span>
      <span className="text-zinc-600">{formatSize(att.size)}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 transition-colors ml-0.5">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── File download card (agent-created files) ──────────────────────────────────
function FileCard({ file }) {
  const Icon = getMimeIcon(file.mimeType);
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-zinc-900/80 border border-zinc-700/60 rounded-xl mt-2">
      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-zinc-200 truncate">{file.filename}</p>
        <p className="text-[10px] text-zinc-500">{formatSize(new TextEncoder().encode(file.content).length)}</p>
      </div>
      <button
        onClick={() => downloadFile(file.filename, file.content, file.mimeType)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-medium rounded-lg transition-colors shrink-0"
      >
        <Download className="w-3 h-3" />
        Download
      </button>
    </div>
  );
}

// ── Thinking dots ─────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i}
          className="w-1.5 h-1.5 rounded-full bg-violet-500/60"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

// ── User bubble ───────────────────────────────────────────────────────────────
function UserBubble({ msg }) {
  return (
    <div className="flex justify-end group">
      <div className="max-w-[80%] flex flex-col items-end gap-2">
        {msg.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {msg.attachments.map((att, i) => (
              att.type?.startsWith("image/") ? (
                <img key={i} src={`data:${att.type};base64,${att.data}`}
                  alt={att.name}
                  className="max-w-[200px] max-h-[200px] rounded-xl border border-zinc-700 object-cover" />
              ) : (
                <AttachmentChip key={i} att={att} />
              )
            ))}
          </div>
        )}
        {msg.text && (
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-md bg-violet-600/20 border border-violet-500/20 text-[13px] text-zinc-100 leading-relaxed">
            {msg.text}
          </div>
        )}
        <span className="text-[9px] text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
          {fmtTime(msg.ts)}
        </span>
      </div>
    </div>
  );
}

// ── AI bubble ─────────────────────────────────────────────────────────────────
function AIBubble({ msg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-2 group"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <span className="text-[10px] font-semibold text-violet-400">Assistant</span>
        <span className="text-[9px] text-zinc-700">{fmtTime(msg.ts)}</span>
      </div>

      <div className="ml-8">
        {msg.text && <MarkdownRenderer text={msg.text} />}
        {msg.files?.length > 0 && (
          <div className="space-y-2 mt-2">
            {msg.files.map((f, i) => <FileCard key={i} file={f} />)}
          </div>
        )}
        {!msg.files?.length && msg.text && (
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyBtn text={msg.text} className="text-[9px]" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Suggestion pills ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: Code2, text: "Write a Python script to parse CSV files", color: "text-sky-400" },
  { icon: FileText, text: "Summarise a document I'll upload", color: "text-emerald-400" },
  { icon: Sparkles, text: "Generate a JSON dataset of 20 products", color: "text-amber-400" },
  { icon: Bot, text: "Explain how neural networks work", color: "text-violet-400" },
];

function EmptyState({ onSend }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
        <Bot className="w-7 h-7 text-violet-400" />
      </div>
      <h2 className="text-[18px] font-bold text-white mb-2">AI Assistant</h2>
      <p className="text-[13px] text-zinc-500 max-w-xs leading-relaxed mb-8">
        Chat, upload files, get code, create documents. I can read and produce any file type.
      </p>
      <div className="grid grid-cols-1 gap-2 w-full max-w-md">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => onSend(s.text)}
            className="flex items-center gap-3 px-4 py-3 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 rounded-xl text-left transition-all text-[12.5px] text-zinc-400 hover:text-zinc-200"
          >
            <s.icon className={`w-4 h-4 shrink-0 ${s.color}`} />
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Scroll to bottom button ───────────────────────────────────────────────────
function ScrollToBottom({ onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
      onClick={onClick}
      className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 shadow-lg transition-colors"
    >
      <ChevronDown className="w-4 h-4" />
    </motion.button>
  );
}

// ── Accepted file types ───────────────────────────────────────────────────────
const ACCEPT_TYPES = [
  "image/*",
  "application/pdf",
  "text/*",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  ".py", ".js", ".ts", ".jsx", ".tsx", ".md", ".csv", ".json", ".xml",
  ".yaml", ".yml", ".txt", ".html", ".css", ".sh", ".sql", ".r", ".swift",
  ".kt", ".go", ".rs", ".cpp", ".c", ".h", ".java",
].join(",");

// ════════════════════════════════════════════════════════════════════════════
export default function ChatPage() {
  const navigate = useNavigate();
  const sessionId = useMemo(() => getOrCreateSession(), []);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const isFresh = messages.length === 0;

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, atBottom]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  const processFiles = useCallback(async (files) => {
    const MAX = 10 * 1024 * 1024;
    const newAtts = [];
    for (const file of files) {
      if (file.size > MAX) { alert(`${file.name} is too large (max 10 MB)`); continue; }
      const data = await fileToBase64(file);
      newAtts.push({ name: file.name, type: file.type || "text/plain", size: file.size, data });
    }
    setAttachments((prev) => [...prev, ...newAtts]);
  }, []);

  const onFileChange = useCallback((e) => {
    processFiles(Array.from(e.target.files || []));
    e.target.value = "";
  }, [processFiles]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(Array.from(e.dataTransfer.files || []));
  }, [processFiles]);

  const removeAttachment = useCallback((idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const send = useCallback(async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if ((!text && !attachments.length) || loading) return;
    setInput("");

    const userMsg = {
      id: nanoid(),
      role: "user",
      ts: Date.now(),
      text,
      attachments: [...attachments],
    };
    setAttachments([]);
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setAtBottom(true);

    try {
      const payload = {
        message: text,
        sessionId,
        attachments: userMsg.attachments.map(({ name, type, data }) => ({ name, type, data })),
      };
      const { data } = await api.post("/api/chat/message", payload, {
        timeout: 120000,
      });
      setMessages((prev) => [...prev, {
        id: nanoid(),
        role: "ai",
        ts: Date.now(),
        text: data.text,
        files: data.files || [],
      }]);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Request failed";
      setMessages((prev) => [...prev, {
        id: nanoid(),
        role: "ai",
        ts: Date.now(),
        text: `⚠️ ${msg}`,
        files: [],
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, attachments, loading, sessionId]);

  const reset = useCallback(() => {
    setMessages([]);
    setInput("");
    setAttachments([]);
    sessionStorage.removeItem(SESSION_KEY);
    api.post("/api/chat/clear", { sessionId }).catch(() => {});
  }, [sessionId]);

  const canSend = (input.trim() || attachments.length > 0) && !loading;

  return (
    <div
      className="flex flex-col h-screen bg-[#0a0a0c] text-zinc-200"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm border-2 border-dashed border-violet-500/60 rounded-none pointer-events-none"
          >
            <Paperclip className="w-10 h-10 text-violet-400 mb-3" />
            <p className="text-[16px] font-semibold text-violet-300">Drop files to attach</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-white leading-none">AI Assistant</h1>
              <p className="text-[9px] text-zinc-600 leading-tight mt-0.5 font-mono">claude-sonnet-4-6 · file-capable</p>
            </div>
          </div>
        </div>

        <button
          onClick={reset}
          title="New conversation"
          className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/60 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Messages area ─────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        {isFresh && !loading ? (
          <EmptyState onSend={(t) => send(t)} />
        ) : (
          <>
            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="absolute inset-0 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full"
              style={{ left: "50%", transform: "translateX(-50%)" }}
            >
              {messages.map((msg) =>
                msg.role === "user"
                  ? <UserBubble key={msg.id} msg={msg} />
                  : <AIBubble key={msg.id} msg={msg} />
              )}

              <AnimatePresence>
                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-violet-400">Assistant</span>
                    </div>
                    <div className="ml-8"><ThinkingDots /></div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            <AnimatePresence>
              {!atBottom && (
                <ScrollToBottom onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }} />
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ── Input area ────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 shrink-0 max-w-3xl mx-auto w-full">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-zinc-800">
            {attachments.map((att, i) => (
              att.type?.startsWith("image/") ? (
                <div key={i} className="relative group">
                  <img src={`data:${att.type};base64,${att.data}`} alt={att.name}
                    className="h-16 w-16 object-cover rounded-lg border border-zinc-700" />
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ) : (
                <AttachmentChip key={i} att={att} onRemove={() => removeAttachment(i)} />
              )
            ))}
          </div>
        )}

        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden focus-within:border-zinc-600 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask anything, or drop files to analyse…"
            rows={1}
            className="w-full bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed px-4 pt-3 pb-1"
            style={{ maxHeight: 140, overflowY: "auto" }}
            disabled={loading}
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors text-[11px]"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach</span>
              </button>
              <span className="text-[9px] text-zinc-700 ml-1">images · PDFs · code · any text file</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_TYPES}
                onChange={onFileChange}
                className="hidden"
              />
            </div>

            <button
              onClick={() => send()}
              disabled={!canSend}
              className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        <p className="text-[9px] text-zinc-800 text-center mt-1.5">⏎ send · ⇧⏎ newline · drag & drop files</p>
      </div>
    </div>
  );
}
