import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Settings2,
  Wrench,
  BookOpen,
  ListTree,
  AlertTriangle,
  Search,
  Sparkles,
  Cpu,
  Link2,
  Unlink,
} from "lucide-react";
import { LuBrainCircuit, LuWrench, LuDatabase } from "react-icons/lu";
import {
  SiOpenai,
  SiAnthropic,
  SiGooglegemini,
  SiPerplexity,
  SiOllama,
} from "react-icons/si";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";
import useWorkspaceStore from "../../../../store/workspaceStore";

// ═════════════════════════════════════════════════════════════════════════════
// AGENT TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

const AGENT_TYPES = [
  {
    value: "tools_agent",
    label: "Tools Agent",
    description: "Uses native function-calling to invoke tools. Best for structured tasks.",
    icon: Wrench,
    color: "#f97316",
  },
  {
    value: "conversational",
    label: "Conversational Agent",
    description: "Chat-optimized with memory. Ideal for multi-turn dialogue flows.",
    icon: MessageSquare,
    color: "#818cf8",
  },
  {
    value: "react",
    label: "ReAct Agent",
    description: "Reason + Act loop. Thinks step-by-step before each tool call.",
    icon: LuBrainCircuit,
    color: "#a855f7",
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// BRAND ICON MAP — Resolves backendType → brand icon for connected nodes
// ═════════════════════════════════════════════════════════════════════════════

const BRAND_ICONS = {
  openai: SiOpenai,
  anthropic: SiAnthropic,
  gemini: SiGooglegemini,
  deepseek: Cpu,
  openrouter: Link2,
  together: Cpu,
  perplexity: SiPerplexity,
  xai: Sparkles,
  fireworks: Cpu,
  cerebras: Cpu,
  ollama: SiOllama,
  novita: Cpu,
  deepinfra: Cpu,
  hyperbolic: Cpu,
};

const MEMORY_ICONS = {
  window_buffer_memory: LuDatabase,
  redis_memory: LuDatabase,
  postgres_memory: LuDatabase,
  vector_memory: LuDatabase,
  mem0: LuDatabase,
};

// ═════════════════════════════════════════════════════════════════════════════
// TOOL-CALLING SUPPORT — Providers with native function-calling
// ═════════════════════════════════════════════════════════════════════════════

const TOOL_CALLING_PROVIDERS = new Set([
  "openai", "anthropic", "gemini", "deepseek", "openrouter", "xai", "fireworks",
]);

// ═════════════════════════════════════════════════════════════════════════════
// HELPER — Resolve connected node info from edges + store
// ═════════════════════════════════════════════════════════════════════════════

function getConnectedNodeInfo(edges, nodes, nodeId, handleId) {
  const edge = edges.find((e) => e.target === nodeId && e.targetHandle === handleId);
  if (!edge) return null;
  const sourceNode = nodes.find((n) => n.id === edge.source);
  if (!sourceNode) return null;
  const bt = sourceNode.data?.backendType;
  const cfg = sourceNode.data?.config || {};
  return {
    label: sourceNode.data?.label || bt,
    backendType: bt,
    model: cfg.model || null,
    nodeId: sourceNode.id,
  };
}

function getConnectedTools(edges, nodes, nodeId) {
  return edges
    .filter((e) => e.target === nodeId && e.targetHandle === "tools")
    .map((e) => {
      const src = nodes.find((n) => n.id === e.source);
      if (!src) return null;
      return {
        label: src.data?.label || src.data?.backendType,
        backendType: src.data?.backendType,
        nodeId: src.id,
      };
    })
    .filter(Boolean);
}

// ═════════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═════════════════════════════════════════════════════════════════════════════

function Section({ title, icon: Icon, iconColor, defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col border border-zinc-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900/50 text-left group hover:bg-zinc-800/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        )}
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor || "#a78bfa" }} />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200 transition-colors flex-1">
          {title}
        </span>
        {badge}
      </button>
      {open && (
        <div className="flex flex-col gap-4 px-3 py-3 bg-zinc-950/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DEPENDENCY SLOT — Connection-aware indicator with brand icons
// ═════════════════════════════════════════════════════════════════════════════

function DependencySlot({ label, color, description, required, connected, connectedInfo, icon: SlotIcon, onSelect }) {
  const BrandIcon = connectedInfo ? (BRAND_ICONS[connectedInfo.backendType] || MEMORY_ICONS[connectedInfo.backendType] || Cpu) : null;

  return (
    <button
      onClick={connectedInfo && onSelect ? () => onSelect(connectedInfo.nodeId) : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 text-left w-full ${
        connected
          ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30"
          : required
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-zinc-800/50 bg-zinc-900/30"
      }`}
    >
      {/* Icon area */}
      <div className="shrink-0 relative">
        {connected && BrandIcon ? (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center border"
            style={{ borderColor: `${color}30`, backgroundColor: `${color}10` }}
          >
            <BrandIcon className="w-3.5 h-3.5" style={{ color }} />
          </div>
        ) : (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-zinc-800 bg-zinc-900"
          >
            <SlotIcon className="w-3.5 h-3.5 text-zinc-600" />
          </div>
        )}
        {/* Connection indicator dot */}
        {connected && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-900" />
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-medium ${connected ? "text-zinc-200" : "text-zinc-400"}`}>
            {label}
          </span>
          {required && !connected && (
            <span className="text-[8px] font-bold text-amber-500/80 uppercase">required</span>
          )}
          {connected && (
            <Link2 className="w-2.5 h-2.5 text-emerald-500/60" />
          )}
        </div>
        {connected && connectedInfo ? (
          <span className="text-[10px] text-emerald-400/70 leading-tight truncate">
            {connectedInfo.label}{connectedInfo.model ? ` — ${connectedInfo.model}` : ""}
          </span>
        ) : (
          <span className="text-[9px] text-zinc-600 leading-tight">{description}</span>
        )}
      </div>

      {/* Connection status icon */}
      <div className="shrink-0">
        {connected ? (
          <Link2 className="w-3 h-3 text-emerald-500/50" />
        ) : (
          <Unlink className="w-3 h-3 text-zinc-700" />
        )}
      </div>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL CHIP — Small pill for connected tool nodes
// ═════════════════════════════════════════════════════════════════════════════

function ToolChip({ tool, onSelect }) {
  const Icon = BRAND_ICONS[tool.backendType] || LuWrench;
  return (
    <button
      onClick={() => onSelect?.(tool.nodeId)}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-emerald-500/15 bg-emerald-500/5 hover:border-emerald-500/25 transition-colors"
    >
      <Icon className="w-3 h-3 text-orange-400/70" />
      <span className="text-[9px] text-zinc-400 truncate max-w-[100px]">{tool.label}</span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — n8n-Style AI Agent Configuration Panel
// ═════════════════════════════════════════════════════════════════════════════

export default function AIAgentNode({ config = {}, updateConfig, nodeId, edges = [] }) {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  const agentType = config.agentType || "tools_agent";
  const outputFormat = config.outputFormat || "text";

  // Resolve connected dependencies
  const modelInfo = getConnectedNodeInfo(edges, nodes, nodeId, "chat_model");
  const memoryInfo = getConnectedNodeInfo(edges, nodes, nodeId, "memory");
  const connectedTools = getConnectedTools(edges, nodes, nodeId);

  const isModelConnected = !!modelInfo;
  const isMemoryConnected = !!memoryInfo;
  const hasTools = connectedTools.length > 0;

  // Derive tool-calling support from connected model
  const connectedProvider = modelInfo?.backendType;
  const supportsToolCalling = connectedProvider ? TOOL_CALLING_PROVIDERS.has(connectedProvider) : true;

  const handleSelectNode = (targetNodeId) => {
    if (setSelectedNodeId) setSelectedNodeId(targetNodeId);
  };

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div className="relative flex items-center gap-3 p-4 rounded-xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-zinc-900/80 to-indigo-950/40">
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-violet-500/15 rounded-full blur-2xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: "1.5s" }} />

        <div className="relative shrink-0 z-10">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <LuBrainCircuit className="w-5 h-5 text-violet-400" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-violet-300 animate-pulse" />
        </div>

        <div className="flex flex-col gap-0.5 z-10 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-violet-300 tracking-wide">AI Agent</span>
            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-violet-500/20 text-violet-400 rounded-md border border-violet-500/30">
              {AGENT_TYPES.find((t) => t.value === agentType)?.label || "Agent"}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 leading-relaxed truncate">
            Autonomous reasoning with tool-calling & memory
          </span>
        </div>
      </div>

      {/* ─── AGENT TYPE SELECTOR ────────────────────────────────────────── */}
      <Section title="Agent Type" icon={LuBrainCircuit} iconColor="#a855f7">
        <div className="flex flex-col gap-1.5">
          {AGENT_TYPES.map((type) => {
            const TypeIcon = type.icon;
            const isSelected = agentType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => updateConfig("agentType", type.value)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-150 ${
                  isSelected
                    ? "border-violet-500/30 bg-violet-500/8"
                    : "border-zinc-800/50 bg-zinc-900/20 hover:border-zinc-700/50 hover:bg-zinc-800/20"
                }`}
              >
                <TypeIcon
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: isSelected ? type.color : "#52525b" }}
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className={`text-[11px] font-bold ${isSelected ? "text-violet-300" : "text-zinc-400"}`}>
                    {type.label}
                  </span>
                  <span className="text-[9px] text-zinc-600 leading-relaxed">
                    {type.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ─── DEPENDENCIES (connection-aware) ─────────────────────────────── */}
      <Section title="Dependencies" icon={ListTree} iconColor="#14b8a6">
        <div className="flex flex-col gap-2">
          <DependencySlot
            label="Chat Model"
            color="#6366f1"
            description="Connect an LLM node (OpenAI, Anthropic, etc.) via the Model handle"
            required
            connected={isModelConnected}
            connectedInfo={modelInfo}
            icon={Cpu}
            onSelect={handleSelectNode}
          />
          <DependencySlot
            label="Memory"
            color="#a855f7"
            description="Connect a memory node for multi-turn conversation context"
            required={agentType === "conversational"}
            connected={isMemoryConnected}
            connectedInfo={memoryInfo}
            icon={LuDatabase}
            onSelect={handleSelectNode}
          />
          <DependencySlot
            label="Tools"
            color="#f97316"
            description="Connect tool nodes the agent can invoke autonomously"
            required={agentType === "tools_agent"}
            connected={hasTools}
            connectedInfo={hasTools ? { label: `${connectedTools.length} tool${connectedTools.length > 1 ? "s" : ""} connected`, backendType: connectedTools[0]?.backendType } : null}
            icon={LuWrench}
          />
        </div>

        {/* Connected tools list */}
        {hasTools && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {connectedTools.map((tool) => (
              <ToolChip key={tool.nodeId} tool={tool} onSelect={handleSelectNode} />
            ))}
          </div>
        )}

        <p className="text-[9px] text-zinc-600 leading-relaxed">
          Connect nodes to the colored handles on the left side of this node.
        </p>

        {agentType === "tools_agent" && isModelConnected && !supportsToolCalling && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className="text-[9px] text-amber-400/80 leading-relaxed">
              <strong>{modelInfo.label}</strong> may not support native function calling.
              Consider switching to <strong>ReAct</strong> agent type, or connect OpenAI / Anthropic / Gemini for reliable tool use.
            </span>
          </div>
        )}

        {!isModelConnected && (
          <div className="flex items-start gap-2 px-3 py-2 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span className="text-[9px] text-indigo-400/80 leading-relaxed">
              No model connected. Drag an <strong>OpenAI</strong>, <strong>Anthropic</strong>, or other LLM node and connect it to the <strong>Model</strong> handle.
            </span>
          </div>
        )}
      </Section>

      {/* ─── SYSTEM PROMPT / PERSONA ────────────────────────────────────── */}
      <Section title="System Prompt" icon={MessageSquare} iconColor="#818cf8">
        <SmartVariableInput
          value={config.systemPrompt || ""}
          onChange={(val) => updateConfig("systemPrompt", val)}
          placeholder="You are a senior data analyst. Extract structured insights from the provided data and format them clearly..."
          multiline
        />
        <p className="text-[9px] text-zinc-600">
          Defines the agent's persona, role, and behavioral constraints. This becomes the system-level instruction.
        </p>
      </Section>

      {/* ─── USER PROMPT / INSTRUCTIONS ─────────────────────────────────── */}
      <Section title="Instructions" icon={BookOpen} iconColor="#c084fc">
        <SmartVariableInput
          value={config.prompt || ""}
          onChange={(val) => updateConfig("prompt", val)}
          placeholder="Analyze the input data and return the top 5 key findings..."
          multiline
        />
      </Section>

      {/* ─── ADVANCED SETTINGS ──────────────────────────────────────────── */}
      <Section title="Advanced" icon={Settings2} iconColor="#71717a" defaultOpen={false}>
        {/* Output format */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Output Format
          </label>
          <div className="flex gap-1.5">
            {[
              { value: "text", label: "Text" },
              { value: "json", label: "JSON" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => updateConfig("outputFormat", f.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 ${
                  outputFormat === f.value
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max Iterations + Temperature row */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Max Iterations
            </label>
            <select
              value={config.maxIterations || 5}
              onChange={(e) => updateConfig("maxIterations", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500/50 transition-colors cursor-pointer appearance-none"
            >
              {[1, 2, 3, 5, 8, 10, 15].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature ?? 0.3}
              onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Max Tokens */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Max Tokens
          </label>
          <input
            type="number"
            min="100"
            max="128000"
            step="100"
            value={config.maxTokens ?? 4000}
            onChange={(e) => updateConfig("maxTokens", parseInt(e.target.value, 10))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        {/* Return intermediate steps toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-300 font-medium">Return Intermediate Steps</span>
            <span className="text-[9px] text-zinc-600 leading-relaxed">
              Include the agent's thought process and tool calls in output
            </span>
          </div>
          <button
            onClick={() => updateConfig("returnIntermediateSteps", !config.returnIntermediateSteps)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
              config.returnIntermediateSteps ? "bg-violet-500/80" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                config.returnIntermediateSteps ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </Section>

      {/* ─── BUILT-IN TOOLS ─────────────────────────────────────────────── */}
      <Section title="Built-in Tools" icon={LuWrench} iconColor="#f97316" defaultOpen={false}>
        {/* Web Search toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Search className="w-3 h-3 text-orange-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-zinc-300 font-medium">Web Search</span>
              <span className="text-[9px] text-zinc-600 leading-relaxed">
                Search the internet via Tavily
              </span>
            </div>
          </div>
          <button
            onClick={() => updateConfig("builtinWebSearch", !config.builtinWebSearch)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
              config.builtinWebSearch ? "bg-orange-500/80" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                config.builtinWebSearch ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {config.builtinWebSearch && (
          <div className="ml-8">
            <CredentialPicker
              value={config.webSearchCredentialId || ""}
              onChange={(id) => updateConfig("webSearchCredentialId", id)}
              accentColor="orange"
              label="Tavily API Key"
              placeholder="Select Tavily credential..."
            />
          </div>
        )}
      </Section>

      {/* ─── HANDLE LEGEND ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-900/50 border border-zinc-800/40 rounded-xl">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          Handles
        </span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-[9px] text-zinc-500">Input (left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-zinc-500">Output (right)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[9px] text-zinc-500">Model (left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[9px] text-zinc-500">Memory (left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[9px] text-zinc-500">Tools (left)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
