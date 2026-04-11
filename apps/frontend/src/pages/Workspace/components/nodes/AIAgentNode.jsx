import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Search,
  Database,
  Calculator,
  FileJson2,
  Cpu,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { LuBrainCircuit, LuWrench } from "react-icons/lu";
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

// ── Tool Definitions (must match backend agentTools.registry.js IDs exactly) ─

const AGENT_TOOLS = [
  {
    id: "web_search",
    label: "Web Search",
    desc: "Search the internet in real-time",
    icon: Search,
    color: "#f97316",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    activeRing: "ring-orange-500/30",
  },
  {
    id: "http_request",
    label: "API Calls",
    desc: "Call any external API",
    icon: Globe,
    color: "#3b82f6",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    activeRing: "ring-blue-500/30",
  },
  {
    id: "workspace_memory",
    label: "Memory",
    desc: "Remember data across runs",
    icon: Database,
    color: "#a855f7",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    activeRing: "ring-purple-500/30",
  },
  {
    id: "math_calculator",
    label: "Calculator",
    desc: "Solve math problems",
    icon: Calculator,
    color: "#10b981",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    activeRing: "ring-emerald-500/30",
  },
  {
    id: "data_extractor",
    label: "Data Extractor",
    desc: "Parse & extract from JSON",
    icon: FileJson2,
    color: "#06b6d4",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    activeRing: "ring-cyan-500/30",
  },
];

// ── Brand icons for connected model nodes ───────────────────────────────────

const BRAND_ICONS = {
  openai: SiOpenai,
  anthropic: SiAnthropic,
  gemini: SiGooglegemini,
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function getConnectedNodeInfo(edges, nodes, nodeId, handleId) {
  const edge = edges.find(
    (e) => e.target === nodeId && e.targetHandle === handleId
  );
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

// ═════════════════════════════════════════════════════════════════════════════
// TOOL TOGGLE CARD
// ═════════════════════════════════════════════════════════════════════════════

function ToolToggle({ tool, active, onToggle }) {
  const Icon = tool.icon;

  return (
    <button
      onClick={onToggle}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200
        ${
          active
            ? `${tool.bg} ${tool.border} ring-1 ${tool.activeRing}`
            : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700/60"
        }
      `}
    >
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
          active ? tool.bg : "bg-zinc-800/60"
        }`}
      >
        <Icon
          className="w-4 h-4 transition-colors duration-200"
          style={{ color: active ? tool.color : "#52525b" }}
        />
      </div>

      {/* Label + description */}
      <div className="flex flex-col text-left min-w-0 flex-1">
        <span
          className={`text-[11px] font-semibold transition-colors duration-200 ${
            active ? "text-zinc-200" : "text-zinc-500"
          }`}
        >
          {tool.label}
        </span>
        <span className="text-[9px] text-zinc-600 leading-snug">
          {tool.desc}
        </span>
      </div>

      {/* Toggle pill */}
      <div
        className={`w-8 h-[18px] rounded-full shrink-0 transition-colors duration-200 ${
          active ? "bg-violet-500" : "bg-zinc-700"
        }`}
      >
        <div
          className={`w-[14px] h-[14px] rounded-full bg-white mt-[2px] transition-transform duration-200 ${
            active ? "translate-x-[16px]" : "translate-x-[2px]"
          }`}
        />
      </div>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN CONFIG PANEL
// ═════════════════════════════════════════════════════════════════════════════

export default function AIAgentNode({
  config = {},
  updateConfig,
  nodeId,
  edges = [],
}) {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const enabledToolIds = config.enabledToolIds || [];

  // Connection info
  const modelInfo = getConnectedNodeInfo(edges, nodes, nodeId, "chat_model");
  const memoryInfo = getConnectedNodeInfo(edges, nodes, nodeId, "memory");
  const connectedTools = getConnectedTools(edges, nodes, nodeId);

  // ── Tool toggle handler ─────────────────────────────────────────────────
  function toggleTool(toolId) {
    const current = config.enabledToolIds || [];
    const next = current.includes(toolId)
      ? current.filter((id) => id !== toolId)
      : [...current, toolId];
    updateConfig("enabledToolIds", next);
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/50">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <LuBrainCircuit className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-zinc-200">
            AI Agent
          </span>
          <span className="text-[10px] text-zinc-600">
            Tell it what to do. It figures out the rest.
          </span>
        </div>
      </div>

      {/* ── Connection Status (compact) ─────────────────────────────────── */}
      {(modelInfo || memoryInfo || connectedTools.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {modelInfo && (
            <button
              onClick={() => setSelectedNodeId?.(modelInfo.nodeId)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/8 border border-indigo-500/15 hover:bg-indigo-500/15 transition-colors"
            >
              {(() => {
                const BIcon = BRAND_ICONS[modelInfo.backendType] || Cpu;
                return <BIcon className="w-3 h-3 text-indigo-400" />;
              })()}
              <span className="text-[10px] font-medium text-indigo-300">
                {modelInfo.model || modelInfo.label}
              </span>
            </button>
          )}
          {memoryInfo && (
            <button
              onClick={() => setSelectedNodeId?.(memoryInfo.nodeId)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/8 border border-purple-500/15 hover:bg-purple-500/15 transition-colors"
            >
              <Database className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-medium text-purple-300">
                {memoryInfo.label}
              </span>
            </button>
          )}
          {connectedTools.map((tool) => {
            const TIcon = BRAND_ICONS[tool.backendType] || LuWrench;
            return (
              <button
                key={tool.nodeId}
                onClick={() => setSelectedNodeId?.(tool.nodeId)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-500/8 border border-orange-500/15 hover:bg-orange-500/15 transition-colors"
              >
                <TIcon className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] font-medium text-orange-300">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!modelInfo && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60 shrink-0 mt-0.5" />
          <span className="text-[10px] text-amber-500/70 leading-relaxed">
            Connect a Model node to the{" "}
            <span className="font-semibold text-amber-400/80">Model</span>{" "}
            handle on the left side.
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ELEMENT 1: Goal (What do you want me to do?)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          What should the agent do?
        </label>
        <SmartVariableInput
          value={config.prompt || ""}
          onChange={(val) => updateConfig("prompt", val)}
          placeholder='e.g. "Find the latest news about AI and summarize it"'
          multiline
          nodeId={nodeId}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ELEMENT 2: Give Agent Access To (visual tool toggles)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-2.5">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Give agent access to
        </label>
        <div className="flex flex-col gap-1.5">
          {AGENT_TOOLS.map((tool) => (
            <ToolToggle
              key={tool.id}
              tool={tool}
              active={enabledToolIds.includes(tool.id)}
              onToggle={() => toggleTool(tool.id)}
            />
          ))}
        </div>

        {/* Active tool count badge */}
        {enabledToolIds.length > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Sparkles className="w-3 h-3 text-violet-400/60" />
            <span className="text-[10px] text-zinc-600">
              {enabledToolIds.length} tool
              {enabledToolIds.length !== 1 ? "s" : ""} enabled — agent will
              decide when to use them
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ELEMENT 3: Advanced Accordion (hidden by default)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col border-t border-zinc-800/40 pt-3">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-2 py-1.5 text-left group"
        >
          {advancedOpen ? (
            <ChevronDown className="w-3 h-3 text-zinc-600" />
          ) : (
            <ChevronRight className="w-3 h-3 text-zinc-600" />
          )}
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
            Advanced
          </span>
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-4 pt-2 pb-1">
            {/* System Prompt */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                System Prompt
              </label>
              <SmartVariableInput
                value={config.systemPrompt || ""}
                onChange={(val) => updateConfig("systemPrompt", val)}
                placeholder="You are a helpful assistant that..."
                multiline
                nodeId={nodeId}
              />
              <p className="text-[9px] text-zinc-700">
                Define the agent's persona, tone, and constraints.
              </p>
            </div>

            {/* Output Format */}
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
                      (config.outputFormat || "text") === f
                        ? "border-violet-500/30 bg-violet-500/8 text-violet-300"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Iterations + Temperature row */}
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Max Iterations
                </label>
                <select
                  value={config.maxIterations || 5}
                  onChange={(e) =>
                    updateConfig("maxIterations", Number(e.target.value))
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 outline-none focus:border-violet-500/40 transition-colors cursor-pointer appearance-none"
                >
                  {[1, 2, 3, 5, 8, 10, 15].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
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
                  onChange={(e) =>
                    updateConfig("temperature", parseFloat(e.target.value))
                  }
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
                value={config.maxTokens ?? 4096}
                onChange={(e) =>
                  updateConfig("maxTokens", parseInt(e.target.value, 10))
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 font-mono outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>

            {/* Intermediate Steps toggle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-zinc-300">
                  Show Reasoning
                </span>
                <span className="text-[9px] text-zinc-600">
                  Include step-by-step thought process in output
                </span>
              </div>
              <button
                onClick={() =>
                  updateConfig(
                    "returnIntermediateSteps",
                    !config.returnIntermediateSteps
                  )
                }
                className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                  config.returnIntermediateSteps ? "bg-violet-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 ${
                    config.returnIntermediateSteps
                      ? "translate-x-[14px]"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
