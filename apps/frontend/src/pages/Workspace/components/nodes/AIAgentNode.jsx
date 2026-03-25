import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Settings2,
  Wrench,
  BookOpen,
  Search,
  Cpu,
  AlertTriangle,
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

// ── Agent Types ──────────────────────────────────────────────────────────────

const AGENT_TYPES = [
  {
    value: "tools_agent",
    label: "Tools Agent",
    desc: "Uses function-calling to invoke tools",
    icon: Wrench,
  },
  {
    value: "conversational",
    label: "Conversational",
    desc: "Chat-optimized with memory support",
    icon: MessageSquare,
  },
  {
    value: "react",
    label: "ReAct",
    desc: "Reason + Act loop, step-by-step",
    icon: LuBrainCircuit,
  },
];

// ── Brand Icons ──────────────────────────────────────────────────────────────

const BRAND_ICONS = {
  openai: SiOpenai,
  anthropic: SiAnthropic,
  gemini: SiGooglegemini,
  deepseek: Cpu,
  openrouter: Cpu,
  together: Cpu,
  perplexity: SiPerplexity,
  xai: Cpu,
  fireworks: Cpu,
  cerebras: Cpu,
  ollama: SiOllama,
  novita: Cpu,
  deepinfra: Cpu,
  hyperbolic: Cpu,
};

const TOOL_CALLING_PROVIDERS = new Set([
  "openai", "anthropic", "gemini", "deepseek", "openrouter", "xai", "fireworks",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getConnectedNodeInfo(edges, nodes, nodeId, handleId) {
  const edge = edges.find((e) => e.target === nodeId && e.targetHandle === handleId);
  if (!edge) return null;
  const src = nodes.find((n) => n.id === edge.source);
  if (!src) return null;
  return {
    label: src.data?.label || src.data?.backendType,
    backendType: src.data?.backendType,
    model: src.data?.config?.model || null,
    nodeId: src.id,
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

// ── Collapsible Section ──────────────────────────────────────────────────────

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 py-2 text-left group"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-zinc-600" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-600" />
        )}
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-200 transition-colors">
          {title}
        </span>
      </button>
      {open && <div className="flex flex-col gap-3 pb-1">{children}</div>}
    </div>
  );
}

// ── Connection Row ───────────────────────────────────────────────────────────

function ConnectionRow({ label, color, connected, info, required, onSelect }) {
  const BrandIcon = info ? (BRAND_ICONS[info.backendType] || Cpu) : null;

  return (
    <button
      onClick={info && onSelect ? () => onSelect(info.nodeId) : undefined}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left w-full ${
        connected
          ? "bg-zinc-800/40 hover:bg-zinc-800/60"
          : "bg-zinc-900/30"
      }`}
    >
      {/* Status dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: connected ? "#10b981" : required ? "#ef4444" : "#3f3f46" }}
      />

      {/* Label + info */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-medium ${connected ? "text-zinc-200" : "text-zinc-500"}`}>
            {label}
          </span>
          {required && !connected && (
            <span className="text-[8px] font-bold text-red-500/70 uppercase">required</span>
          )}
        </div>
        {connected && info ? (
          <span className="text-[10px] text-zinc-500 truncate">
            {info.label}{info.model ? ` · ${info.model}` : ""}
          </span>
        ) : (
          <span className="text-[9px] text-zinc-700">Not connected</span>
        )}
      </div>

      {/* Brand icon */}
      {connected && BrandIcon && (
        <BrandIcon className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
      )}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN CONFIG PANEL
// ═════════════════════════════════════════════════════════════════════════════

export default function AIAgentNode({ config = {}, updateConfig, nodeId, edges = [] }) {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  const agentType = config.agentType || "tools_agent";
  const outputFormat = config.outputFormat || "text";

  // Resolve connections
  const modelInfo = getConnectedNodeInfo(edges, nodes, nodeId, "chat_model");
  const memoryInfo = getConnectedNodeInfo(edges, nodes, nodeId, "memory");
  const connectedTools = getConnectedTools(edges, nodes, nodeId);

  const isModelConnected = !!modelInfo;
  const isMemoryConnected = !!memoryInfo;
  const hasTools = connectedTools.length > 0;

  const connectedProvider = modelInfo?.backendType;
  const supportsToolCalling = connectedProvider ? TOOL_CALLING_PROVIDERS.has(connectedProvider) : true;

  const handleSelectNode = (id) => setSelectedNodeId?.(id);

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/50">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <LuBrainCircuit className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-zinc-200">AI Agent</span>
          <span className="text-[10px] text-zinc-600">
            {AGENT_TYPES.find((t) => t.value === agentType)?.label || "Agent"}
          </span>
        </div>
      </div>

      {/* ── Agent Type ──────────────────────────────────────────────────── */}
      <Section title="Agent Type">
        <div className="flex flex-col gap-1">
          {AGENT_TYPES.map((type) => {
            const TypeIcon = type.icon;
            const isSelected = agentType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => updateConfig("agentType", type.value)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-violet-500/30 bg-violet-500/5"
                    : "border-transparent hover:bg-zinc-800/30"
                }`}
              >
                <TypeIcon
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: isSelected ? "#a78bfa" : "#52525b" }}
                />
                <div className="flex flex-col min-w-0">
                  <span className={`text-[11px] font-medium ${isSelected ? "text-violet-300" : "text-zinc-400"}`}>
                    {type.label}
                  </span>
                  <span className="text-[9px] text-zinc-600 leading-snug">{type.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Connections ──────────────────────────────────────────────────── */}
      <Section title="Connections">
        <div className="flex flex-col gap-1">
          <ConnectionRow
            label="Model"
            color="#6366f1"
            connected={isModelConnected}
            info={modelInfo}
            required
            onSelect={handleSelectNode}
          />
          <ConnectionRow
            label="Memory"
            color="#a855f7"
            connected={isMemoryConnected}
            info={memoryInfo}
            required={agentType === "conversational"}
            onSelect={handleSelectNode}
          />
          <ConnectionRow
            label="Tools"
            color="#f97316"
            connected={hasTools}
            info={hasTools ? { label: `${connectedTools.length} tool${connectedTools.length > 1 ? "s" : ""}`, backendType: connectedTools[0]?.backendType, nodeId: connectedTools[0]?.nodeId } : null}
            required={agentType === "tools_agent"}
            onSelect={handleSelectNode}
          />
        </div>

        {/* Connected tools list */}
        {hasTools && (
          <div className="flex flex-wrap gap-1 mt-1">
            {connectedTools.map((tool) => {
              const TIcon = BRAND_ICONS[tool.backendType] || LuWrench;
              return (
                <button
                  key={tool.nodeId}
                  onClick={() => handleSelectNode(tool.nodeId)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <TIcon className="w-2.5 h-2.5 text-orange-400/60" />
                  <span className="text-[9px] text-zinc-500">{tool.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Warnings */}
        {agentType === "tools_agent" && isModelConnected && !supportsToolCalling && (
          <p className="text-[9px] text-amber-500/70 flex items-start gap-1.5 mt-1">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
            {modelInfo.label} may not support function calling. Consider ReAct agent type.
          </p>
        )}

        {!isModelConnected && (
          <p className="text-[9px] text-zinc-600 mt-1">
            Connect a model node to the Model handle on the left side of this node.
          </p>
        )}
      </Section>

      {/* ── System Prompt ───────────────────────────────────────────────── */}
      <Section title="System Prompt">
        <SmartVariableInput
          value={config.systemPrompt || ""}
          onChange={(val) => updateConfig("systemPrompt", val)}
          placeholder="You are a helpful assistant..."
          multiline
        />
        <p className="text-[9px] text-zinc-700">
          Defines the agent's persona and behavioral constraints.
        </p>
      </Section>

      {/* ── Instructions ────────────────────────────────────────────────── */}
      <Section title="Instructions">
        <SmartVariableInput
          value={config.prompt || ""}
          onChange={(val) => updateConfig("prompt", val)}
          placeholder="Analyze the input data and..."
          multiline
        />
      </Section>

      {/* ── Options ─────────────────────────────────────────────────────── */}
      <Section title="Options" defaultOpen={false}>
        {/* Output format */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Output Format
          </label>
          <div className="flex gap-1">
            {["text", "json"].map((f) => (
              <button
                key={f}
                onClick={() => updateConfig("outputFormat", f)}
                className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider border transition-all ${
                  outputFormat === f
                    ? "border-violet-500/30 bg-violet-500/8 text-violet-300"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Max Iterations + Temperature */}
        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              Max Iterations
            </label>
            <select
              value={config.maxIterations || 5}
              onChange={(e) => updateConfig("maxIterations", Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 outline-none focus:border-violet-500/40 transition-colors cursor-pointer appearance-none"
            >
              {[1, 2, 3, 5, 8, 10, 15].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature ?? 0.3}
              onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 font-mono outline-none focus:border-violet-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Max Tokens */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Max Tokens
          </label>
          <input
            type="number"
            min="100"
            max="128000"
            step="100"
            value={config.maxTokens ?? 4000}
            onChange={(e) => updateConfig("maxTokens", parseInt(e.target.value, 10))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 font-mono outline-none focus:border-violet-500/40 transition-colors"
          />
        </div>

        {/* Return intermediate steps */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-300">Intermediate Steps</span>
            <span className="text-[9px] text-zinc-600">Include reasoning & tool calls in output</span>
          </div>
          <button
            onClick={() => updateConfig("returnIntermediateSteps", !config.returnIntermediateSteps)}
            className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
              config.returnIntermediateSteps ? "bg-violet-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 ${
                config.returnIntermediateSteps ? "translate-x-[14px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </Section>

      {/* ── Built-in Tools ──────────────────────────────────────────────── */}
      <Section title="Built-in Tools" defaultOpen={false}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-orange-400/60" />
            <div className="flex flex-col">
              <span className="text-[11px] text-zinc-300">Web Search</span>
              <span className="text-[9px] text-zinc-600">Search via Tavily API</span>
            </div>
          </div>
          <button
            onClick={() => updateConfig("builtinWebSearch", !config.builtinWebSearch)}
            className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
              config.builtinWebSearch ? "bg-orange-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 ${
                config.builtinWebSearch ? "translate-x-[14px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {config.builtinWebSearch && (
          <div className="ml-6">
            <CredentialPicker
              value={config.webSearchCredentialId || ""}
              onChange={(id) => updateConfig("webSearchCredentialId", id)}
              accentColor="orange"
              label="Tavily API Key"
              placeholder="Select credential..."
            />
          </div>
        )}
      </Section>
    </div>
  );
}
