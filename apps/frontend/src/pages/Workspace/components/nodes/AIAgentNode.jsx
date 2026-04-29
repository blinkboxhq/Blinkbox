import { useState, useRef, useEffect } from "react";
import {
  ChevronDown, ChevronUp, Globe, Search, Database, Calculator,
  FileJson2, Clock, AlertTriangle, Sparkles, Cpu, Zap, Brain,
  MessageSquare, Settings2, Play, Eye, EyeOff, RotateCcw,
  Plus, X, ChevronRight,
} from "lucide-react";
import { LuBrainCircuit, LuWrench } from "react-icons/lu";
import { SiOpenai, SiAnthropic, SiGooglegemini, SiPerplexity, SiOllama } from "react-icons/si";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import useWorkspaceStore from "../../../../store/workspaceStore";

// ─── Tool definitions ────────────────────────────────────────────────────────

const AGENT_TOOLS = [
  { id: "web_search",       label: "Web Search",     desc: "Search the internet in real-time",  icon: Search,       color: "#f97316", glow: "shadow-orange-500/20"  },
  { id: "http_request",     label: "API Calls",      desc: "Call any external API or webhook",  icon: Globe,        color: "#3b82f6", glow: "shadow-blue-500/20"    },
  { id: "workspace_memory", label: "Memory",         desc: "Remember data across runs",         icon: Database,     color: "#a855f7", glow: "shadow-purple-500/20"  },
  { id: "math_calculator",  label: "Calculator",     desc: "Precise math & expressions",        icon: Calculator,   color: "#10b981", glow: "shadow-emerald-500/20" },
  { id: "data_extractor",   label: "Data Extractor", desc: "Parse & extract structured data",   icon: FileJson2,    color: "#06b6d4", glow: "shadow-cyan-500/20"    },
  { id: "datetime",         label: "Date & Time",    desc: "Current date, time, timezone",      icon: Clock,        color: "#f59e0b", glow: "shadow-amber-500/20"   },
  { id: "think",            label: "Reasoning",      desc: "Step-by-step scratchpad thinking",  icon: LuBrainCircuit, color: "#8b5cf6", glow: "shadow-violet-500/20" },
];

const BRAND_ICONS = {
  openai: SiOpenai, anthropic: SiAnthropic, gemini: SiGooglegemini,
  perplexity: SiPerplexity, ollama: SiOllama,
};

const TABS = [
  { id: "mission",  label: "Mission",  icon: Zap },
  { id: "tools",    label: "Tools",    icon: LuWrench },
  { id: "persona",  label: "Persona",  icon: Brain },
  { id: "advanced", label: "Advanced", icon: Settings2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConnectedNodeInfo(edges, nodes, nodeId, handleId) {
  const edge = edges.find(e => e.target === nodeId && e.targetHandle === handleId);
  if (!edge) return null;
  const src = nodes.find(n => n.id === edge.source);
  if (!src) return null;
  return { label: src.data?.label || src.data?.backendType, backendType: src.data?.backendType, model: src.data?.config?.model || null, nodeId: src.id };
}

function getConnectedTools(edges, nodes, nodeId) {
  return edges
    .filter(e => e.target === nodeId && e.targetHandle === "tools")
    .map(e => { const src = nodes.find(n => n.id === e.source); return src ? { label: src.data?.label || src.data?.backendType, backendType: src.data?.backendType, nodeId: src.id } : null; })
    .filter(Boolean);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${value ? "bg-violet-500" : "bg-zinc-700"}`}>
      <span className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${value ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function ToolCard({ tool, active, onToggle }) {
  const Icon = tool.icon;
  return (
    <button onClick={onToggle}
      className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 w-full text-left
        ${active
          ? "bg-zinc-900 border-zinc-700 shadow-lg " + tool.glow
          : "bg-zinc-950 border-zinc-800/60 hover:border-zinc-700/80 hover:bg-zinc-900/50"}`}>

      {/* Active glow bar */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full" style={{ background: tool.color }} />
      )}

      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
        style={{ background: active ? tool.color + "18" : "transparent", border: `1px solid ${active ? tool.color + "40" : "#27272a"}` }}>
        <Icon className="w-4 h-4 transition-colors duration-200" style={{ color: active ? tool.color : "#52525b" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold transition-colors ${active ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-400"}`}>{tool.label}</p>
        <p className="text-[9px] text-zinc-700 leading-snug mt-0.5">{tool.desc}</p>
      </div>

      <div className={`w-8 h-[18px] rounded-full shrink-0 transition-all duration-200 ${active ? "bg-violet-500" : "bg-zinc-800"}`}>
        <div className={`w-3.5 h-3.5 rounded-full bg-white mt-[2px] transition-transform duration-200 ${active ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
      </div>
    </button>
  );
}

// Animated placeholder that types through examples
function AnimatedTextarea({ value, onChange, nodeId }) {
  const EXAMPLES = [
    'Research the top 5 AI startups this week and write a summary email',
    'Monitor my Stripe revenue and alert me if it drops below $1,000/day',
    'Scrape competitor pricing pages and create a comparison table',
    'Answer customer support emails using my knowledge base',
  ];
  const [placeholder, setPlaceholder] = useState('');
  const [exIdx, setExIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (value) return; // don't animate when user has content
    const target = EXAMPLES[exIdx];
    timerRef.current = setTimeout(() => {
      if (!deleting) {
        if (charIdx < target.length) {
          setPlaceholder(target.slice(0, charIdx + 1));
          setCharIdx(c => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 2000);
        }
      } else {
        if (charIdx > 0) {
          setPlaceholder(target.slice(0, charIdx - 1));
          setCharIdx(c => c - 1);
        } else {
          setDeleting(false);
          setExIdx(i => (i + 1) % EXAMPLES.length);
        }
      }
    }, deleting ? 18 : 38);
    return () => clearTimeout(timerRef.current);
  }, [value, charIdx, deleting, exIdx]);

  return (
    <div className="relative">
      <SmartVariableInput
        value={value}
        onChange={onChange}
        placeholder={placeholder || "Tell the agent what to do..."}
        multiline
        nodeId={nodeId}
      />
      {!value && (
        <span className="absolute bottom-3 right-3 text-[9px] text-zinc-700 font-mono pointer-events-none">
          examples cycling...
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIAgentNode({ config = {}, updateConfig, nodeId, edges = [] }) {
  const nodes = useWorkspaceStore(s => s.nodes);
  const setSelectedNodeId = useWorkspaceStore(s => s.setSelectedNodeId);
  const [activeTab, setActiveTab] = useState("mission");
  const [showSystemPrompt, setShowSystemPrompt] = useState(!!config.systemPrompt);

  const enabledToolIds = config.enabledToolIds || [];
  const modelInfo = getConnectedNodeInfo(edges, nodes, nodeId, "chat_model");
  const memoryInfo = getConnectedNodeInfo(edges, nodes, nodeId, "memory");
  const connectedTools = getConnectedTools(edges, nodes, nodeId);
  const toolCount = enabledToolIds.length + connectedTools.length;

  function toggleTool(toolId) {
    const current = config.enabledToolIds || [];
    const next = current.includes(toolId) ? current.filter(id => id !== toolId) : [...current, toolId];
    updateConfig("enabledToolIds", next);
  }

  // ── Persona presets
  const PERSONAS = [
    { id: "assistant",  label: "Assistant",    icon: "🤝", prompt: "You are a helpful, concise assistant. Answer clearly and efficiently." },
    { id: "researcher", label: "Researcher",   icon: "🔬", prompt: "You are a meticulous research analyst. Always cite sources, verify information, and present findings in structured format." },
    { id: "writer",     label: "Writer",       icon: "✍️",  prompt: "You are a skilled content writer with a clear, engaging voice. Adapt your tone to the audience and always optimize for readability." },
    { id: "analyst",    label: "Data Analyst", icon: "📊", prompt: "You are a data analyst. Think quantitatively, look for patterns, and always present data with context and insights." },
    { id: "developer",  label: "Developer",    icon: "💻", prompt: "You are an experienced software engineer. Write clean, documented code and explain technical concepts clearly." },
    { id: "custom",     label: "Custom",       icon: "⚙️",  prompt: "" },
  ];

  const activePersona = config.personaId || "assistant";

  function selectPersona(p) {
    updateConfig("personaId", p.id);
    if (p.id !== "custom") updateConfig("systemPrompt", p.prompt);
    if (p.id !== "custom") setShowSystemPrompt(false);
  }

  // ── Model badge
  const ModelBadge = () => {
    if (!modelInfo) return null;
    const BIcon = BRAND_ICONS[modelInfo.backendType] || Cpu;
    return (
      <button onClick={() => setSelectedNodeId?.(modelInfo.nodeId)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-500/8 border border-violet-500/15 hover:bg-violet-500/15 transition-colors group">
        <BIcon className="w-3 h-3 text-violet-400" />
        <span className="text-[10px] font-medium text-violet-300 group-hover:text-violet-200 transition-colors">
          {modelInfo.model || modelInfo.label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col w-full min-h-0" style={{ fontFamily: 'inherit' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl mx-0 mb-4">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        </div>

        <div className="relative flex items-center gap-3 px-4 py-3.5">
          {/* Animated icon */}
          <div className="relative w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
            <LuBrainCircuit className="w-5 h-5 text-violet-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-zinc-100 tracking-tight">AI Agent</span>
              {toolCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-[9px] font-bold text-violet-400 uppercase tracking-wider">
                  {toolCount} tool{toolCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 mt-0.5">Autonomous reasoning & action</p>
          </div>

          {/* Model badge */}
          <ModelBadge />
        </div>

        {/* Warning strip if no model */}
        {!modelInfo && (
          <div className="relative flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-t border-amber-500/10">
            <AlertTriangle className="w-3 h-3 text-amber-500/60 shrink-0" />
            <span className="text-[10px] text-amber-500/70">
              Connect a <span className="font-semibold text-amber-400/80">Model</span> node to the left handle
            </span>
          </div>
        )}
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="flex gap-0.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800/60 mb-4">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150
                ${isActive ? "bg-violet-500/15 text-violet-300 border border-violet-500/20" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40"}`}>
              <Icon className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab: Mission ───────────────────────────────────────────────────── */}
      {activeTab === "mission" && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                What should the agent do?
              </label>
              <span className="text-[9px] text-zinc-700">{(config.prompt || "").length} chars</span>
            </div>
            <AnimatedTextarea value={config.prompt || ""} onChange={v => updateConfig("prompt", v)} nodeId={nodeId} />
            <p className="text-[9px] text-zinc-700 mt-1.5">Use {"{{ variables }}"} to pass dynamic data from previous nodes.</p>
          </div>

          {/* Quick action chips */}
          <div>
            <p className="text-[9px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">Quick templates</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Summarize {{ input }}",
                "Write a reply to {{ email }}",
                "Research {{ topic }} and return bullet points",
                "Classify {{ text }} into categories",
                "Extract key info from {{ document }}",
              ].map(t => (
                <button key={t} onClick={() => updateConfig("prompt", t)}
                  className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-[9px] text-zinc-500 hover:text-zinc-300 transition-all">
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Memory section */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${config.conversationMemoryEnabled ? "bg-violet-500/15 border border-violet-500/25" : "bg-zinc-800 border border-zinc-700"}`}>
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: config.conversationMemoryEnabled ? "#a78bfa" : "#52525b" }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-zinc-300">Conversation Memory</p>
                  <p className="text-[9px] text-zinc-600">Remember chat history between runs</p>
                </div>
              </div>
              <Toggle value={!!config.conversationMemoryEnabled} onChange={v => updateConfig("conversationMemoryEnabled", v)} />
            </div>

            {config.conversationMemoryEnabled && (
              <div className="px-3.5 pb-3.5 flex flex-col gap-3 border-t border-zinc-800/40 pt-3">
                <div>
                  <label className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Session ID</label>
                  <SmartVariableInput value={config.memorySessionId || ""} onChange={v => updateConfig("memorySessionId", v)} placeholder="{{ $json.chatId }}" nodeId={nodeId} />
                  <p className="text-[9px] text-zinc-700 mt-1">Unique per conversation (e.g. Telegram chat.id)</p>
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Remember last N messages</label>
                  <div className="flex gap-1.5">
                    {[10, 20, 50, 100].map(n => (
                      <button key={n} onClick={() => updateConfig("memoryMaxMessages", n)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.memoryMaxMessages || 20) === n ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Tools ─────────────────────────────────────────────────────── */}
      {activeTab === "tools" && (
        <div className="flex flex-col gap-3">
          {/* Summary bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400/60" />
              <span className="text-[10px] text-zinc-500">
                {enabledToolIds.length === 0
                  ? "No built-in tools enabled"
                  : `${enabledToolIds.length} built-in tool${enabledToolIds.length !== 1 ? "s" : ""} active`}
              </span>
            </div>
            {enabledToolIds.length > 0 && (
              <button onClick={() => updateConfig("enabledToolIds", [])}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors">
                <RotateCcw className="w-2.5 h-2.5" />
                Reset
              </button>
            )}
          </div>

          {/* Tool grid */}
          <div className="flex flex-col gap-1.5">
            {AGENT_TOOLS.map(tool => (
              <ToolCard key={tool.id} tool={tool} active={enabledToolIds.includes(tool.id)} onToggle={() => toggleTool(tool.id)} />
            ))}
          </div>

          {/* Connected tool nodes */}
          {connectedTools.length > 0 && (
            <div className="mt-1">
              <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-wider mb-2">External tool nodes connected</p>
              <div className="flex flex-col gap-1">
                {connectedTools.map(tool => {
                  const TIcon = BRAND_ICONS[tool.backendType] || LuWrench;
                  return (
                    <button key={tool.nodeId} onClick={() => setSelectedNodeId?.(tool.nodeId)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/15 hover:bg-orange-500/10 transition-colors">
                      <TIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="text-[11px] text-orange-300 flex-1 text-left">{tool.label}</span>
                      <ChevronRight className="w-3 h-3 text-orange-500/40" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[9px] text-zinc-700 px-1">The agent autonomously decides which tools to call based on the task.</p>
        </div>
      )}

      {/* ── Tab: Persona ───────────────────────────────────────────────────── */}
      {activeTab === "persona" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Agent Persona</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PERSONAS.map(p => (
                <button key={p.id} onClick={() => selectPersona(p)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-150
                    ${activePersona === p.id
                      ? "bg-violet-500/12 border-violet-500/30 shadow-lg shadow-violet-500/10"
                      : "bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900"}`}>
                  <span className="text-lg leading-none">{p.icon}</span>
                  <span className={`text-[9px] font-semibold text-center leading-snug ${activePersona === p.id ? "text-violet-300" : "text-zinc-500"}`}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* System prompt */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
            <button onClick={() => setShowSystemPrompt(v => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-[11px] font-semibold text-zinc-400">System Prompt</span>
                {config.systemPrompt && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
              </div>
              {showSystemPrompt ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />}
            </button>

            {showSystemPrompt && (
              <div className="px-3.5 pb-3.5 border-t border-zinc-800/40 pt-3">
                <SmartVariableInput value={config.systemPrompt || ""} onChange={v => updateConfig("systemPrompt", v)}
                  placeholder="You are a helpful assistant that..." multiline nodeId={nodeId} />
                <p className="text-[9px] text-zinc-700 mt-1.5">Defines the agent's persona, constraints, and behavior.</p>
              </div>
            )}
          </div>

          {/* Output format */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Output Format</label>
            <div className="flex gap-1.5">
              {[
                { id: "text", label: "Plain Text", desc: "Natural language response" },
                { id: "json", label: "JSON",       desc: "Structured data object" },
                { id: "markdown", label: "Markdown", desc: "Formatted markdown" },
              ].map(f => (
                <button key={f.id} onClick={() => updateConfig("outputFormat", f.id)}
                  className={`flex-1 py-2 px-1 rounded-xl border transition-all text-center
                    ${(config.outputFormat || "text") === f.id
                      ? "bg-violet-500/12 border-violet-500/30 text-violet-300"
                      : "bg-zinc-900/50 border-zinc-800/60 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"}`}>
                  <p className="text-[10px] font-bold">{f.label}</p>
                  <p className="text-[8px] mt-0.5 opacity-60">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Reasoning toggle */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <Eye className="w-3.5 h-3.5 text-zinc-600" />
              <div>
                <p className="text-[11px] font-semibold text-zinc-300">Show Reasoning</p>
                <p className="text-[9px] text-zinc-600">Include thought process in output</p>
              </div>
            </div>
            <Toggle value={!!config.returnIntermediateSteps} onChange={v => updateConfig("returnIntermediateSteps", v)} />
          </div>
        </div>
      )}

      {/* ── Tab: Advanced ──────────────────────────────────────────────────── */}
      {activeTab === "advanced" && (
        <div className="flex flex-col gap-4">
          {/* Max iterations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Iterations</label>
              <span className="text-[11px] font-bold text-violet-400">{config.maxIterations || 5}</span>
            </div>
            <input type="range" min="1" max="20" step="1" value={config.maxIterations || 5}
              onChange={e => updateConfig("maxIterations", Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-violet-500" />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-zinc-700">1 (fast)</span>
              <span className="text-[9px] text-zinc-700">20 (thorough)</span>
            </div>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temperature</label>
              <span className="text-[11px] font-bold font-mono text-violet-400">{(config.temperature ?? 0.3).toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" value={config.temperature ?? 0.3}
              onChange={e => updateConfig("temperature", parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-violet-500" />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-zinc-700">0 (precise)</span>
              <span className="text-[9px] text-zinc-700">2 (creative)</span>
            </div>
          </div>

          {/* Max tokens */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Max Tokens</label>
            <div className="flex gap-1.5 flex-wrap">
              {[512, 1024, 2048, 4096, 8192, 16384].map(n => (
                <button key={n} onClick={() => updateConfig("maxTokens", n)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold font-mono border transition-all
                    ${(config.maxTokens || 4096) === n ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"}`}>
                  {n >= 1024 ? `${n / 1024}K` : n}
                </button>
              ))}
            </div>
          </div>

          {/* Fallback behavior */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">On Error</label>
            <div className="flex gap-1.5">
              {[
                { id: "throw",   label: "Throw Error" },
                { id: "return",  label: "Return Partial" },
                { id: "retry",   label: "Auto Retry" },
              ].map(o => (
                <button key={o.id} onClick={() => updateConfig("onError", o.id)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all
                    ${(config.onError || "throw") === o.id ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stop sequences */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Stop Sequences (optional)</label>
            <SmartVariableInput value={config.stopSequences || ""} onChange={v => updateConfig("stopSequences", v)}
              placeholder='["END", "DONE"] — JSON array of stop tokens' nodeId={nodeId} />
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "Iterations", value: config.maxIterations || 5, unit: "max" },
              { label: "Temp", value: (config.temperature ?? 0.3).toFixed(1), unit: "" },
              { label: "Tokens", value: config.maxTokens ? `${(config.maxTokens / 1024).toFixed(0)}K` : "4K", unit: "max" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-[14px] font-bold text-violet-400 font-mono">{s.value}</span>
                <span className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer status ───────────────────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-zinc-800/40 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${modelInfo ? "bg-emerald-500" : "bg-zinc-700"}`} />
        <span className="text-[9px] text-zinc-700 flex-1">
          {modelInfo ? `Ready — ${modelInfo.model || modelInfo.label} connected` : "Waiting for model connection"}
        </span>
        {toolCount > 0 && (
          <span className="text-[9px] text-zinc-700">{toolCount} tool{toolCount !== 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}
