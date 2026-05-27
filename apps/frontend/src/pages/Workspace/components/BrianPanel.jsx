import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Send, RotateCcw, Copy, ThumbsUp, ThumbsDown, Check, ChevronDown, ChevronRight,
  Download, Zap, Mail, Clock, Database, Layers, ArrowDown,
  Sparkles, HelpCircle, CheckCircle2, KeyRound,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import brianLogo from '../../../assets/brian.webp';
import useWorkspaceStore from '../../../store/workspaceStore';
import BrianWorkflowPlan from './BrianWorkflowPlan';
import { mergeBrianFlow } from '../brianFlowMerge';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Streaming SSE client ──────────────────────────────────────────────────────
async function* streamBrian(messages, canvasContext, signal) {
  const token = localStorage.getItem('blinkbox_token');
  const response = await fetch(`${API_URL}/api/brian/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, canvasContext }),
    signal,
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try { const j = await response.json(); errMsg = j.message || errMsg; } catch {}
    throw new Error(errMsg);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

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

// ── Suggestion library ────────────────────────────────────────────────────────
const SUGGESTION_GROUPS = [
  {
    label: 'Automations',
    icon: Zap,
    color: 'text-violet-400',
    items: [
      'When a webhook fires, parse the payload and post a formatted message to Slack',
      'Send a Telegram message when any HTTP request node returns an error',
    ],
  },
  {
    label: 'Scheduling',
    icon: Clock,
    color: 'text-amber-400',
    items: [
      'Every day at 8 am, fetch top HackerNews posts and email me a digest',
      'Scrape a URL every hour and save new content to a Google Sheet',
    ],
  },
  {
    label: 'Email & Comms',
    icon: Mail,
    color: 'text-sky-400',
    items: [
      'When I get a Gmail with "invoice" in the subject, extract amounts and save to Notion',
      'Monitor Gmail for support emails, classify them with AI, then route to Slack channels',
    ],
  },
  {
    label: 'Data & AI',
    icon: Database,
    color: 'text-emerald-400',
    items: [
      'When a form is submitted, enrich the lead with AI and create a HubSpot contact',
      'Build an AI chat agent that answers questions using my knowledge base',
    ],
  },
];

// ── ThinkingBlock ─────────────────────────────────────────────────────────────
function ThinkingBlock({ text, durationMs, streaming }) {
  const [open, setOpen] = useState(false);
  const secs = durationMs ? (durationMs / 1000).toFixed(1) : null;
  return (
    <div className="mb-2 font-mono text-[11px]">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="italic">
          {streaming ? 'Thinking…' : secs ? `Thought for ${secs}s` : 'Thinking'}
        </span>
        {streaming && (
          <span className="inline-block w-1 h-2.5 bg-neutral-600 animate-pulse ml-0.5" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden mt-1.5"
          >
            <div className="border-l-2 border-neutral-800 pl-3 ml-1.5 max-h-[260px] overflow-y-auto">
              <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap text-[10.5px]">{text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── ThinkingDots ──────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map(i => (
        <motion.span key={i}
          className="w-1.5 h-1.5 rounded-full bg-neutral-600"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

// ── QuestionBlock — n8n-style HITL clarification ──────────────────────────────
function QuestionBlock({ intro, questions, onAnswer }) {
  const [selections, setSelections] = useState({});
  const [submitted, setSubmitted]   = useState(false);

  const allAnswered = questions.every(q => selections[q.id]);

  const submit = useCallback(() => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    const parts = questions.map(q => {
      const opt = q.options.find(o => o.value === selections[q.id]);
      return `${q.question}: ${opt?.label || selections[q.id]}`;
    });
    onAnswer(parts.join('\n'));
  }, [allAnswered, submitted, questions, selections, onAnswer]);

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 italic mt-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
        Got it — building your workflow…
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 mt-1"
    >
      {intro && (
        <p className="text-[12.5px] text-neutral-300 leading-relaxed">{intro}</p>
      )}

      {questions.map((q, qi) => (
        <div key={q.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3 h-3 text-neutral-700 shrink-0" />
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{q.question}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-4">
            {q.options.map(opt => {
              const selected = selections[q.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelections(s => ({ ...s, [q.id]: opt.value }))}
                  className={`group relative px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 border ${
                    selected
                      ? 'border-neutral-500 bg-neutral-800 text-white'
                      : 'border-[#2a2a2a] bg-neutral-900 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                >
                  {selected && <span className="mr-1 text-neutral-400">✓</span>}
                  {opt.label}
                  {opt.hint && (
                    <span className="block text-[9px] text-neutral-600 group-hover:text-neutral-500 mt-0.5 font-normal">{opt.hint}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <AnimatePresence>
        {allAnswered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={submit}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[11px] font-bold transition-colors mt-1"
          >
            <Sparkles className="w-3 h-3" />
            Build my workflow
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Markdown ──────────────────────────────────────────────────────────────────
function CopyBtn({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={copy}
      className={`flex items-center gap-1 text-[10px] transition-colors ${copied ? 'text-emerald-400' : 'text-neutral-600 hover:text-neutral-300'} ${className}`}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ lang, code }) {
  return (
    <div className="rounded-lg overflow-hidden border border-[#252525] my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-[#252525]">
        <span className="text-[10px] font-mono text-neutral-600">{lang || 'code'}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="px-3 py-3 bg-[#0a0a0c] overflow-x-auto">
        <code className="text-[11px] font-mono text-neutral-300 leading-[1.7]">{code}</code>
      </pre>
    </div>
  );
}

function parseInline(text, key = 0) {
  const parts = [];
  let rem = text;
  let i = key * 1000;
  while (rem.length > 0) {
    const codeM = rem.match(/^`([^`]+)`/);
    if (codeM) {
      parts.push(
        <code key={i++} className="px-1.5 py-0.5 bg-neutral-800 rounded text-[11px] font-mono text-neutral-300">
          {codeM[1]}
        </code>
      );
      rem = rem.slice(codeM[0].length);
      continue;
    }
    const boldM = rem.match(/^\*\*([^*]+)\*\*/);
    if (boldM) {
      parts.push(<strong key={i++} className="font-semibold text-neutral-100">{boldM[1]}</strong>);
      rem = rem.slice(boldM[0].length);
      continue;
    }
    const italM = rem.match(/^\*([^*]+)\*/);
    if (italM) {
      parts.push(<em key={i++} className="italic text-neutral-400">{italM[1]}</em>);
      rem = rem.slice(italM[0].length);
      continue;
    }
    const next = rem.search(/[`*]/);
    if (next === -1) { parts.push(rem); break; }
    if (next > 0) parts.push(rem.slice(0, next));
    rem = rem.slice(Math.max(next, 1));
  }
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

function MarkdownRenderer({ text, streaming }) {
  const segments = useMemo(() => text.split(/(```[\s\S]*?```)/g), [text]);
  return (
    <div className="space-y-2 text-[12.5px] text-neutral-300 leading-relaxed">
      {segments.map((seg, si) => {
        if (seg.startsWith('```')) {
          const m = seg.match(/```(\w*)\n?([\s\S]*?)```/);
          return <CodeBlock key={si} lang={m?.[1] || ''} code={m?.[2]?.trim() || seg} />;
        }
        const lines = seg.split('\n');
        const out = [];
        let listBuf = [];
        const flushList = (idx) => {
          if (!listBuf.length) return;
          out.push(
            <ul key={`list-${idx}`} className="pl-1 space-y-1">
              {listBuf.map((item, ii) => (
                <li key={ii} className="flex gap-2">
                  <span className="text-neutral-600 shrink-0 mt-px">{item.ordered ? `${item.n}.` : '·'}</span>
                  <span>{parseInline(item.content, ii)}</span>
                </li>
              ))}
            </ul>
          );
          listBuf = [];
        };
        lines.forEach((line, li) => {
          const bulletM = line.match(/^[-*]\s+(.+)/);
          const numM    = line.match(/^(\d+)\.\s+(.+)/);
          if (bulletM) { listBuf.push({ ordered: false, content: bulletM[1] }); return; }
          if (numM)    { listBuf.push({ ordered: true, n: numM[1], content: numM[2] }); return; }
          flushList(li);
          if (line.startsWith('### ')) {
            out.push(<p key={li} className="font-semibold text-neutral-100 text-[13px] mt-1">{parseInline(line.slice(4), li)}</p>);
          } else if (line.startsWith('## ')) {
            out.push(<p key={li} className="font-bold text-neutral-100 text-[14px] mt-2">{parseInline(line.slice(3), li)}</p>);
          } else if (line.startsWith('# ')) {
            out.push(<p key={li} className="font-bold text-white text-[15px] mt-2">{parseInline(line.slice(2), li)}</p>);
          } else if (line.trim()) {
            out.push(<p key={li}>{parseInline(line, li)}</p>);
          } else if (li > 0 && out.length > 0) {
            out.push(<div key={`sp-${li}`} className="h-1" />);
          }
        });
        flushList('end');
        return <div key={si} className="space-y-1">{out}</div>;
      })}
      {streaming && (
        <span className="inline-block w-[2px] h-3.5 bg-white/40 align-middle animate-pulse ml-0.5" style={{ borderRadius: 1 }} />
      )}
    </div>
  );
}

// ── Message components ────────────────────────────────────────────────────────
function UserBubble({ text, time }) {
  return (
    <div className="flex justify-end group">
      <div className="max-w-[88%] flex flex-col items-end gap-1">
        <div className="px-3 py-2 rounded-2xl rounded-tr-sm bg-[#1e1e1e] border border-[#2a2a2a] text-[12.5px] text-neutral-200 leading-relaxed">
          {text}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] text-neutral-700">{time}</span>
          <CopyBtn text={text} className="text-[9px]" />
        </div>
      </div>
    </div>
  );
}

function BrianBubble({ msg, time, onFeedback, onAnswer, onModify }) {
  const [feedback, setFeedback] = useState(null);
  const handleFeedback = (val) => { setFeedback(val); onFeedback?.(val); };
  const isStreaming = !!msg.streaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-2 group"
    >
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
          <img src={brianLogo} alt="" className="w-3.5 h-3.5 object-contain" />
        </div>
        <span className="text-[10px] font-medium text-neutral-500">Brian</span>
        <span className="text-[9px] text-neutral-700">{time}</span>
        {isStreaming && (
          <span className="text-[9px] text-neutral-700 font-mono animate-pulse">writing…</span>
        )}
      </div>

      <div className="ml-6">
        {msg.thinking && (
          <ThinkingBlock text={msg.thinking} durationMs={msg.thinkMs} streaming={isStreaming && !msg.text && !msg.questions} />
        )}

        {msg.questions?.length > 0 ? (
          <QuestionBlock
            intro={msg.text || ''}
            questions={msg.questions}
            onAnswer={onAnswer}
          />
        ) : msg.flow ? (
          <BrianWorkflowPlan text={msg.text} flow={msg.flow} onAccept={msg.onAccept} onModify={msg.onModify || onModify} />
        ) : msg.text ? (
          <MarkdownRenderer text={msg.text} streaming={isStreaming} />
        ) : isStreaming ? (
          <ThinkingDots />
        ) : null}

        {!msg.flow && !msg.questions && !isStreaming && msg.text && (
          <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyBtn text={msg.text} className="text-[9px]" />
            <div className="w-px h-3 bg-neutral-800" />
            <button onClick={() => handleFeedback('up')}
              className={`p-0.5 rounded transition-colors ${feedback === 'up' ? 'text-emerald-400' : 'text-neutral-700 hover:text-neutral-400'}`}>
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button onClick={() => handleFeedback('down')}
              className={`p-0.5 rounded transition-colors ${feedback === 'down' ? 'text-red-400' : 'text-neutral-700 hover:text-neutral-400'}`}>
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Empty / welcome state ─────────────────────────────────────────────────────
function EmptyState({ onSend }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col items-center px-5 pt-8 pb-5 text-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-[#2a2a2a] flex items-center justify-center mb-3">
          <img src={brianLogo} alt="Brian" className="w-8 h-8 object-contain" />
        </div>
        <h2 className="text-[15px] font-bold text-white mb-1">Hi, I'm Brian</h2>
        <p className="text-[12px] text-neutral-500 max-w-[200px] leading-relaxed">
          Tell me what to automate and I'll build the workflow. I'll ask if I need details.
        </p>
      </div>

      <div className="px-3 pb-4 space-y-4">
        {SUGGESTION_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <group.icon className={`w-3 h-3 ${group.color}`} />
              <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">{group.label}</span>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button key={item} onClick={() => onSend(item)}
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-[11px] leading-snug
                    ${hovered === item
                      ? 'border-neutral-700 bg-white/[0.04] text-neutral-200'
                      : 'border-[#1e1e1e] bg-neutral-900/40 text-neutral-600'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Context strip ─────────────────────────────────────────────────────────────
function ContextStrip({ nodeCount, workflowName }) {
  if (!nodeCount) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-neutral-900/60 border-b border-[#1a1a1a] shrink-0">
      <Layers className="w-3 h-3 text-neutral-700 shrink-0" />
      <span className="text-[10px] text-neutral-600 truncate">
        {nodeCount} node{nodeCount !== 1 ? 's' : ''} on canvas
        {workflowName ? ` · ${workflowName}` : ''}
        {nodeCount > 0 && <span className="text-neutral-700"> · Brian can see &amp; extend these</span>}
      </span>
    </div>
  );
}

function BuildChecklist({ messages, nodeCount }) {
  const latest = [...messages].reverse().find(m => m.role === 'brian' && (m.flow || m.questions?.length || m.streaming));
  const flow = latest?.flow;
  const nodes = flow?.nodes || [];
  const edges = flow?.edges || [];
  const needsCreds = nodes.filter(n => (n.data?.config || {}).credentialId === "").length;
  const warnings = [...(flow?.warnings || []), ...(flow?.errors || [])];
  const items = [
    {
      label: 'Canvas understood',
      done: nodeCount > 0 || !!flow,
      detail: nodeCount > 0 ? `${nodeCount} existing node${nodeCount === 1 ? '' : 's'}` : 'fresh build',
      icon: Layers,
    },
    {
      label: 'Questions locked',
      done: !latest?.questions?.length && !latest?.streaming,
      detail: latest?.questions?.length ? `${latest.questions.length} answer needed` : 'ready',
      icon: HelpCircle,
    },
    {
      label: 'Workflow validated',
      done: !!flow && warnings.length === 0,
      detail: flow ? `${nodes.length} nodes, ${edges.length} edges` : 'waiting',
      icon: CheckCircle2,
    },
    {
      label: 'Credentials',
      done: !!flow && needsCreds === 0,
      detail: flow ? (needsCreds ? `${needsCreds} to pick` : 'assigned') : 'after plan',
      icon: KeyRound,
    },
  ];

  return (
    <div className="px-3 py-2 border-b border-[#1a1a1a] bg-[#0a0a0c] shrink-0">
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2 rounded-lg border border-[#202024] bg-neutral-900/45 px-2 py-1.5 min-w-0">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${item.done ? 'text-emerald-400' : 'text-neutral-600'}`} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-neutral-300 truncate">{item.label}</p>
                <p className="text-[9px] text-neutral-600 truncate">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Scroll-to-bottom ──────────────────────────────────────────────────────────
function ScrollToBottom({ onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
      onClick={onClick}
      className="absolute bottom-4 right-4 z-10 w-7 h-7 rounded-full bg-neutral-800 border border-[#333] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 shadow-lg transition-colors"
    >
      <ArrowDown className="w-3.5 h-3.5" />
    </motion.button>
  );
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function exportConversation(messages, workflowName) {
  const lines = [`# Brian Conversation — ${workflowName || 'Untitled'}\n`];
  messages.forEach(m => {
    if (m.id === 'welcome') return;
    const role = m.role === 'user' ? '**You**' : '**Brian**';
    lines.push(`${role} · ${fmtTime(m.id)}\n\n${m.text}\n`);
    if (m.flow) lines.push(`\`\`\`json\n${JSON.stringify(m.flow, null, 2)}\n\`\`\`\n`);
  });
  const blob = new Blob([lines.join('\n---\n\n')], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `brian-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════════════════════
const WELCOME_MSG = {
  id: 'welcome', role: 'brian', ts: Date.now(),
  text: "Hi! I'm Brian — describe what you want to automate and I'll build the workflow. If I need details, I'll ask first.",
  flow: null,
};

export default function BrianPanel({ width, onResizeStart, initialPrompt }) {
  const isBrianOpen        = useWorkspaceStore(s => s.isBrianOpen);
  const setBrianOpen       = useWorkspaceStore(s => s.setBrianOpen);
  const brianQueuedMessage = useWorkspaceStore(s => s.brianQueuedMessage);
  const clearBrianQueue    = useWorkspaceStore(s => s.clearBrianQueue);
  const nodes        = useWorkspaceStore(s => s.nodes);
  const edges        = useWorkspaceStore(s => s.edges);
  const workflowName = useWorkspaceStore(s => s.workflowName);
  const { fitView } = useReactFlow();

  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  const bottomRef   = useRef(null);
  const scrollRef   = useRef(null);
  const inputRef    = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(null);

  const isFresh = messages.length === 1 && messages[0].id === 'welcome';

  useEffect(() => {
    if (isBrianOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isBrianOpen]);

  useEffect(() => {
    if (!initialPrompt) return;
    const timer = setTimeout(() => send(initialPrompt), 400);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!brianQueuedMessage) return;
    clearBrianQueue();
    const timer = setTimeout(() => send(brianQueuedMessage), 300);
    return () => clearTimeout(timer);
  }, [brianQueuedMessage]); // eslint-disable-line

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, atBottom]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const applyFlow = useCallback((flow) => {
    if (!flow?.nodes) return;
    useWorkspaceStore.setState(s => mergeBrianFlow(s.nodes, s.edges, flow));
    setTimeout(() => fitView({ padding: 0.35, duration: 450 }), 80);
  }, [fitView]);

  const send = useCallback(async (text) => {
    const txt = (text || input).trim();
    if (!txt || loading) return;
    setInput('');
    setLoading(true);
    setAtBottom(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg = { id: Date.now(), role: 'user', ts: Date.now(), text: txt, flow: null };
    setMessages(prev => [...prev, userMsg]);

    const msgId   = Date.now() + 1;
    const thinkTs = Date.now();
    setMessages(prev => [...prev, {
      id: msgId, role: 'brian', ts: Date.now(),
      text: '', thinking: null, flow: null, questions: null, streaming: true,
    }]);

    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role:    m.role === 'user' ? 'user' : 'assistant',
          content: m.text || (m.questions ? m.questions.map(q => q.question).join(' | ') : '') || '',
        }));

      const canvasContext = {
        nodes: nodes.map(n => ({
          id:          n.id,
          label:       n.data?.label || n.data?.backendType || '',
          backendType: n.data?.backendType || '',
          type:        n.data?.type || 'action',
          x:           Math.round(n.position?.x || 0),
          y:           Math.round(n.position?.y || 0),
        })),
        edges: edges.map(e => ({
          id:           e.id,
          source:       e.source,
          target:       e.target,
          sourceHandle: e.sourceHandle || null,
          targetHandle: e.targetHandle || null,
        })),
      };

      for await (const event of streamBrian(history, canvasContext, controller.signal)) {
        if (event.type === 'text_delta') {
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, text: (m.text || '') + event.delta }
            : m));
        } else if (event.type === 'thinking_delta') {
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, thinking: (m.thinking || '') + event.delta }
            : m));
        } else if (event.type === 'questions') {
          // Brian is asking clarifying questions — render as QuestionBlock
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, text: event.intro || '', questions: event.questions || [], streaming: false }
            : m));
        } else if (event.type === 'flow') {
          const thinkMs = Date.now() - thinkTs;
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, text: event.text || m.text, flow: event.flow, onAccept: applyFlow, onModify: (mod) => send(mod), streaming: false, thinkMs }
            : m));
        } else if (event.type === 'error') {
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, text: `⚠️ ${event.message}`, streaming: false }
            : m));
        } else if (event.type === 'done') {
          const thinkMs = Date.now() - thinkTs;
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, streaming: false, thinkMs }
            : m));
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      const msg = err?.message || 'Unknown error';
      const isConfig = msg.includes('ANTHROPIC_API_KEY') || msg.includes('GOOGLE_AI_KEY') || msg.includes('not configured');
      setMessages(prev => prev.map(m => m.id === msgId
        ? { ...m, streaming: false, text: isConfig
            ? '⚠️ Brian needs an API key. Add `ANTHROPIC_API_KEY` to your environment variables.'
            : `⚠️ ${msg}` }
        : m));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, nodes, edges, applyFlow]);

  // Called when user answers Brian's clarifying questions
  const handleAnswer = useCallback((answerText) => {
    send(answerText);
  }, [send]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([WELCOME_MSG]);
    setInput('');
    setLoading(false);
  }, []);

  if (!isBrianOpen) return null;

  return (
    <>
      <div
        className="shrink-0 h-full flex flex-row bg-[#0c0c0f] border-l border-[#1e1e1e]"
        style={{ width: width ?? 360, animation: 'brianSlide 0.18s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* ── Drag handle ── */}
        <div onMouseDown={onResizeStart}
          className="w-1 shrink-0 cursor-col-resize hover:bg-neutral-700/40 active:bg-neutral-600/40 transition-colors border-r border-[#161616]">
          <div className="w-0.5 h-8 bg-neutral-800 rounded-full mx-auto mt-[calc(50%-16px)] transition-colors" />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center">
                <img src={brianLogo} alt="Brian" className="w-4 h-4 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-white leading-none">Brian</span>
                <span className="text-[9px] font-mono text-neutral-700 leading-tight mt-0.5">agent builder · claude-sonnet-4-6</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {messages.length > 1 && (
                <button onClick={() => exportConversation(messages, workflowName)}
                  title="Export conversation"
                  className="p-1.5 text-neutral-700 hover:text-neutral-400 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
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

          {/* ── Canvas context strip ── */}
          <ContextStrip nodeCount={nodes.length} workflowName={workflowName} />
          <BuildChecklist messages={messages} nodeCount={nodes.length} />

          {/* ── Messages / empty state ── */}
          {isFresh && !loading ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <EmptyState onSend={send} />
            </div>
          ) : (
            <div className="relative flex-1 min-h-0">
              <div
                ref={scrollRef}
                onScroll={onScroll}
                className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-5"
              >
                {messages.map((msg) => {
                  if (msg.id === 'welcome') return null;
                  if (msg.role === 'user') return <UserBubble key={msg.id} text={msg.text} time={fmtTime(msg.ts)} />;
                  return (
                    <BrianBubble
                      key={msg.id}
                      msg={msg}
                      time={fmtTime(msg.ts)}
                      onAnswer={handleAnswer}
                      onModify={send}
                    />
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <AnimatePresence>
                {!atBottom && (
                  <ScrollToBottom onClick={() => {
                    setAtBottom(true);
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }} />
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Input area ── */}
          <div className="px-3 pb-3 pt-2 border-t border-[#1a1a1a] shrink-0">
            <div className="flex flex-col bg-neutral-900 border border-[#252525] rounded-xl overflow-hidden focus-within:border-neutral-700 transition-colors">
              <textarea
                ref={el => { inputRef.current = el; textareaRef.current = el; }}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={nodes.length > 0 ? `Extend or modify your ${nodes.length}-node workflow…` : 'Describe what you want to automate…'}
                rows={1}
                className="w-full bg-transparent text-[12px] text-neutral-200 placeholder:text-neutral-700 resize-none focus:outline-none leading-relaxed px-3 pt-2.5 pb-1"
                style={{ maxHeight: 120, overflowY: 'auto' }}
                disabled={loading}
              />

              <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-neutral-800 select-none">⏎ send · ⇧⏎ newline</span>
                  {input.length > 80 && (
                    <span className={`text-[9px] ${input.length > 500 ? 'text-red-500' : 'text-neutral-700'}`}>
                      {input.length}
                    </span>
                  )}
                </div>
                {loading ? (
                  <button
                    onClick={() => { abortRef.current?.abort(); setLoading(false); }}
                    className="w-7 h-7 rounded-lg bg-neutral-800 border border-[#333] flex items-center justify-center shrink-0 hover:bg-neutral-700 transition-colors"
                    title="Stop"
                  >
                    <div className="w-2.5 h-2.5 bg-neutral-400 rounded-sm" />
                  </button>
                ) : (
                  <button
                    onClick={() => send()}
                    disabled={!input.trim()}
                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 hover:bg-neutral-200 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5 text-black" />
                  </button>
                )}
              </div>
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
