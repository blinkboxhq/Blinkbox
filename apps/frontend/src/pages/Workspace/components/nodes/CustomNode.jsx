import { useState, useEffect, memo, useCallback } from "react";
import { Handle, Position, NodeToolbar, useReactFlow } from "@xyflow/react";
import { Check, AlertTriangle, Settings2, Loader2, Plus, Brain, Database, MousePointer2, Play, Settings, Copy, Trash2, CheckCheck, XCircle, Zap, Bot, Split, X, Sparkles, Plug } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { NodeRegistry, CATEGORIES } from "../../nodeRegistry";
import { TRIGGER_VARIANTS } from "../../triggerVariants";
import useWorkspaceStore from "../../../../store/workspaceStore";
import { useShallow } from "zustand/react/shallow";

// Module-level hover registry — ReactFlow fires onNodeMouseEnter/Leave at the
// wrapper level (more reliable than inner div events). Each mounted node
// registers its setState so only that node re-renders on hover change.
const hoverListeners = new Map();
export function setNodeHovered(nodeId, value) {
  hoverListeners.get(nodeId)?.(value);
}

// ─── Inline output preview chip shown below completed action nodes ────────────
function NodeOutputChip({ output }) {
  const [open, setOpen] = useState(false);
  const items = Array.isArray(output) ? output : [{ json: output }];
  const first = items[0]?.json ?? items[0] ?? {};
  const keys = Object.keys(first).slice(0, 3);
  return (
    <div className="mt-1.5 nodrag" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15 transition-colors">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="text-[9px] font-mono text-emerald-400">{items.length} item{items.length !== 1 ? "s" : ""}</span>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/70 overflow-hidden text-left"
          onMouseDown={e => e.stopPropagation()}>
          <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Last Output</span>
            <span className="text-[9px] text-zinc-600">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="p-2 max-h-48 overflow-y-auto">
            {keys.length > 0 ? keys.map(k => (
              <div key={k} className="flex items-start gap-2 px-2 py-1">
                <span className="text-[10px] font-mono text-zinc-500 shrink-0">{k}</span>
                <span className="text-[10px] font-mono text-emerald-400 truncate">
                  {typeof first[k] === "object" ? "{…}" : String(first[k]).slice(0, 40)}
                </span>
              </div>
            )) : (
              <span className="text-[10px] text-zinc-600 px-2 py-1 block">No fields</span>
            )}
            {Object.keys(first).length > 3 && (
              <span className="text-[9px] text-zinc-600 px-2 block">+{Object.keys(first).length - 3} more fields</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const EDGE_COLOR = "#3f3f46";

// ─── Liquid-glass card surface, shared across all node types ────────────────
const GLASS_BG =
  "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 34%, transparent 62%), rgba(32,32,32,0.66)";
const GLASS_SHADOW = (hovered, selected) =>
  [
    `inset 0 1px 0 rgba(255,255,255,${selected ? 0.22 : 0.12})`,
    `inset 0 0 0 1px rgba(255,255,255,${selected ? 0.22 : 0.07})`,
    "inset 0 -18px 36px -24px rgba(255,255,255,0.07)",
    `0 0 0 1px rgba(255,255,255,${selected ? 0.18 : 0.05})`,
    `0 0 26px -2px rgba(255,255,255,${selected ? 0.20 : 0.05})`,
    "0 14px 44px -12px rgba(0,0,0,0.78)",
  ].join(", ");

// ─── Agent Bottom Dock Slots ────────────────────────────────────────────────
// The AI Agent node has 3 fixed slots on its bottom edge.
// Only one LLM, one Memory (enforced by connection logic), infinite Tools.

const AGENT_BOTTOM_SLOTS = [
  {
    id: "llm",
    label: "Model",
    icon: Brain,
    color: "#a78bfa",
    accentColor: "167,139,250",
    allowedTypes: ["agent_llm"],
    single: true,
    showPlus: false,
  },
  {
    id: "memory",
    label: "Memory",
    icon: Database,
    color: "#c084fc",
    accentColor: "192,132,252",
    allowedTypes: ["agent_memory"],
    single: true,
    showPlus: false,
  },
  {
    id: "integration",
    label: "Integration",
    icon: Plug,
    color: "#34d399",
    accentColor: "52,211,153",
    allowedTypes: ["agent_integration"],
    single: false,
    showPlus: true,
  },
  {
    id: "tools",
    label: "Tools",
    icon: Zap,
    color: "#fb923c",
    accentColor: "251,146,60",
    allowedTypes: ["agent_tool"],
    single: false,
    showPlus: true,
  },
];

// ─── Agent sub-node — top input and bottom output handles ───────────────────
// These are the compact mini-cards: agent_llm, agent_memory, agent_tool.
const AGENT_SUB_TYPES = ["agent_llm", "agent_memory", "agent_tool", "agent_integration"];
// Any node whose backendType starts with "agent_" (except "ai_agent" itself) is a hub node rendered as a circle
const isAgentHubType = (bt) => bt && bt !== "ai_agent" && (bt.startsWith("agent_") || AGENT_SUB_TYPES.includes(bt));

// ─── Dock Popover: spawns the correct agent sub-node ───────────────────────

// ─── Agent Slot Dot — sits on the bottom border line of the card ────────────
function AgentSlotDot({ slot, parentNodeId, hasConnection, leftPct, cardH }) {
  const [hovered, setHovered] = useState(false);
  const openAgentPicker = useWorkspaceStore(s => s.openAgentPicker);

  const showPlus = !hasConnection || (slot.showPlus && hovered);

  // Dots straddle the bottom border of the card but render above it via zIndex:2
  return (
    <div className="absolute nodrag" style={{ left: leftPct, top: cardH - 8, transform: "translateX(-50%)", zIndex: 2 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      <Handle type="target" position={Position.Bottom} id={slot.id}
        className="!opacity-0 !w-5 !h-5 !pointer-events-none"
        style={{ left: "50%", top: 0, transform: "translateX(-50%)" }} />

      {showPlus ? (
        <button
          onClick={e => { e.stopPropagation(); openAgentPicker(parentNodeId); }}
          onMouseDown={e => e.stopPropagation()}
          className="w-4 h-4 bg-zinc-800 border-[2px] border-zinc-500 flex items-center justify-center hover:border-zinc-300 active:scale-95 transition-all duration-100"
          style={{ transform: "rotate(45deg)" }}
          title={slot.label}
        >
          <Plus className="w-2 h-2 text-zinc-300" strokeWidth={3} style={{ transform: "rotate(-45deg)" }} />
        </button>
      ) : (
        <div className="w-4 h-4 border-[2.5px] border-[#1a1a1e]"
          style={{ backgroundColor: "#71717a", transform: "rotate(45deg)" }} />
      )}
    </div>
  );
}

// ─── Config Hint ─────────────────────────────────────────────────────────────
function getConfigHint(data, edges, nodeId) {
  const c = data.config || {};
  if (data.backendType === "http_request") { if (c.method && c.url) return `${c.method} ${c.url}`.slice(0, 40); if (c.url) return c.url.slice(0, 40); }
  if (data.backendType === "delay" && c.seconds) return `Wait ${c.seconds}s`;
  if (data.backendType === "code" && c.code) return `${c.code}`.slice(0, 40);
  if (data.backendType === "loop" && c.arrayPath) return `each ${c.arrayPath}`;
  if (data.backendType === "web_scraper" && c.url) return c.url.slice(0, 40);
  if (data.backendType === "ai_agent") {
    const llmEdge = edges?.find(e => e.target === nodeId && (e.targetHandle === "llm" || e.targetHandle === "chat_model"));
    if (llmEdge) {
      const nodes = useWorkspaceStore.getState().nodes;
      const llmNode = nodes.find(n => n.id === llmEdge.source);
      if (llmNode?.data?.config?.model) return llmNode.data.config.model;
      if (llmNode?.data?.label) return llmNode.data.label;
    }
    if (c.agentType) return c.agentType.replace(/_/g, " ");
    return "tools agent";
  }
  if (data.backendType === "agent_llm") return data.config?.model || (data.config?.provider || "");
  if (data.backendType === "agent_memory") return data.config?.memoryType?.replace(/_/g, " ") || "memory";
  if (data.backendType === "agent_tool") {
    const toolId = data.config?.toolId;
    return toolId ? (data.config?.toolName || toolId.replace(/_/g, " ")) : "pick a tool";
  }
  if (data.backendType === "webhook") { const v = c.triggerVariant; if (v === "form") return c.expectedFields?.length ? `${c.expectedFields.length} fields` : "form"; if (v === "chat") return c.systemPrompt ? c.systemPrompt.slice(0, 28) : "chat endpoint"; if (v === "sub_workflow") return "sub-workflow"; if (v === "app_event") return c.expectedEvents || "app events"; return "webhook"; }
  if (data.backendType === "cron_trigger" && c.expression) return c.expression;
  if (data.backendType === "logic_router" && c.field) return `if ${c.field}`;
  if (data.backendType === "slack" && c.message) return c.message.slice(0, 40);
  if (data.backendType === "discord" && c.message) return c.message.slice(0, 40);
  if (data.backendType === "stripe" && c.action) return c.action.replace("_", " ");
  if (["openai","anthropic","gemini","deepseek","moonshot","openrouter","together","perplexity","xai","fireworks","cerebras","ollama","novita","deepinfra","hyperbolic"].includes(data.backendType) && c.model) return c.model;
  if (data.backendType === "telegram" && c.text) return c.text.slice(0, 40);
  if (data.backendType === "whatsapp" && c.to) return `→ ${c.to}`;
  if (data.backendType === "airtable" && c.tableName) return `${c.action || "create"} · ${c.tableName}`;
  if (data.backendType === "web_search" && c.query) return c.query.slice(0, 40);
  return null;
}

// ─── Node Shape Helpers ───────────────────────────────────────────────────────
const MEMORY_TYPES = ["window_buffer_memory","redis_memory","postgres_memory","vector_memory","mem0"];
const AI_TYPES = ["openai","anthropic","gemini","deepseek","moonshot","openrouter","together","perplexity","xai","fireworks","cerebras","ollama","novita","deepinfra","hyperbolic","ai_agent"];

// ─── Node Icon ────────────────────────────────────────────────────────────────
function NodeIcon({ nodeDef, size = "md" }) {
  const Icon = nodeDef.icon;
  const sizeMap = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };
  const s = sizeMap[size];
  if (nodeDef.logoUrl) return <img src={nodeDef.logoUrl} alt={nodeDef.label} className={`${s} object-contain shrink-0`} style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />;
  return <Icon className={`${s} shrink-0 text-white`} strokeWidth={1.75} />;
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function ToolbarButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button onClick={onClick} title={label}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
        danger ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60"
      }`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
    </button>
  );
}

// ─── Output Handle + Plus Button ──────────────────────────────────────────────
const HANDLE_BORDER = "rgba(255,255,255,0.28)";

function OutputHandle({ nodeId, hasConnection, onAdd, dotColor = "#52525b", statusGlow = "none", cardHeight, handleId = "output" }) {
  const top = cardHeight ? cardHeight / 2 : "50%";
  return (
    <>
      <Handle type="source" position={Position.Right} id={handleId}
        className="!w-4 !h-4 !rounded-full touch-none"
        style={{ boxShadow: statusGlow, top, right: 0, transform: "translate(50%, -50%)", zIndex: 4, background: EDGE_COLOR, border: `1.5px solid ${HANDLE_BORDER}` }}
      />
      {!hasConnection && (
        <div className="absolute z-[2] nodrag flex items-center pointer-events-none"
          style={{ left: "100%", top, transform: "translateY(-50%)" }}>
          <span className="h-[3px] w-[72px] shrink-0 rounded-full" style={{ background: HANDLE_BORDER }} />
          <button onClick={e => { e.stopPropagation(); onAdd(e); }} onMouseDown={e => e.stopPropagation()}
            className="pointer-events-auto w-6 h-6 rounded-full bg-[#18181b] flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all duration-150 shadow-lg shadow-black/50 group/plus"
            title="Add next step">
            <Plus className="w-3.5 h-3.5 text-zinc-300 group-hover/plus:text-white" strokeWidth={3} />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Agent sub-node output handle (goes down, to agent dock) ─────────────────
function AgentOutHandle({ hasConnection, cardHeight }) {
  return (
    <Handle type="source" position={Position.Bottom} id="agent_out"
      className="!w-3 !h-3 !rounded-full !border-2 !border-[#1a1a1e] touch-none"
      style={{ backgroundColor: hasConnection ? "#10b981" : "#52525b", bottom: -6 }}
    />
  );
}

// ─── Agent sub-node input handle (goes up, from workflow) ────────────────────
function AgentInHandle() {
  return (
    <Handle type="target" position={Position.Top} id="input"
      className="!w-4 !h-4 !rounded-full !border-[2.5px] !border-[#1a1a1e] !bg-zinc-600 touch-none"
      style={{ top: -8 }}
    />
  );
}

// ─── Condition dual output handles ───────────────────────────────────────────
function DualOutputHandle({ topY, botY, topId, botId, topLabel, botLabel, topConnected, botConnected, onAdd }) {
  const plusBtn = (y, handleId) => (
    <div className="absolute z-[2] nodrag flex items-center pointer-events-none" style={{ left: "100%", top: y, transform: "translateY(-50%)" }}>
      <span className="h-[3px] w-[72px] shrink-0 rounded-full" style={{ background: HANDLE_BORDER }} />
      <button
        onClick={e => { e.stopPropagation(); onAdd(e, handleId); }}
        onMouseDown={e => e.stopPropagation()}
        className="pointer-events-auto w-6 h-6 rounded-full bg-[#18181b] flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all duration-150 shadow-lg shadow-black/50 group/plus"
        title="Add next step">
        <Plus className="w-3.5 h-3.5 text-zinc-300 group-hover/plus:text-white" strokeWidth={3} />
      </button>
    </div>
  );

  return (
    <>
      <Handle type="source" position={Position.Right} id={topId}
        className="!w-4 !h-4 !rounded-full touch-none"
        style={{ background: EDGE_COLOR, border: `1.5px solid ${HANDLE_BORDER}`, top: topY, right: 0, transform: "translate(50%, -50%)", zIndex: 4 }} />
      {topConnected
        ? <div className="absolute z-10 nodrag pointer-events-none" style={{ right: -46, top: topY, transform: "translateY(-50%)" }}>
            <span className="text-[9px] font-semibold text-white uppercase tracking-wider">{topLabel}</span>
          </div>
        : plusBtn(topY, topId)
      }

      <Handle type="source" position={Position.Right} id={botId}
        className="!w-4 !h-4 !rounded-full touch-none"
        style={{ background: EDGE_COLOR, border: `1.5px solid ${HANDLE_BORDER}`, top: botY, right: 0, transform: "translate(50%, -50%)", zIndex: 4 }} />
      {botConnected
        ? <div className="absolute z-10 nodrag pointer-events-none" style={{ right: -50, top: botY, transform: "translateY(-50%)" }}>
            <span className="text-[9px] font-semibold text-white uppercase tracking-wider">{botLabel}</span>
          </div>
        : plusBtn(botY, botId)
      }
    </>
  );
}

function ConditionOutputHandles({ cardHeight, trueConnected, falseConnected, onAdd }) {
  return (
    <DualOutputHandle
      topY={cardHeight * 0.33} botY={cardHeight * 0.67}
      topId="true" botId="false"
      topLabel="True" botLabel="False"
      topConnected={trueConnected} botConnected={falseConnected}
      onAdd={onAdd}
    />
  );
}

// ─── Success/Failed dual output handles ──────────────────────────────────────
function SuccessFailedOutputHandles({ cardHeight, successConnected, failedConnected, onAdd }) {
  return (
    <DualOutputHandle
      topY={cardHeight * 0.33} botY={cardHeight * 0.67}
      topId="success" botId="failed"
      topLabel="Success" botLabel="Failed"
      topConnected={successConnected} botConnected={failedConnected}
      onAdd={onAdd}
    />
  );
}

// ─── Spinning border overlay (n8n-style live execution ring) ─────────────────
// Renders behind the card. The inner mask div recreates the card background so
// only a 4px rim of the rotating conic-gradient is visible.
function SpinBorder({ radius, w, h, slow = false, color1 = "#3b82f6", color2 = "#93c5fd" }) {
  const grad = `conic-gradient(from 0deg, transparent 0deg, transparent 145deg, rgba(59,130,246,0.45) 180deg, ${color1} 235deg, ${color2} 262deg, ${color1} 288deg, rgba(59,130,246,0.35) 322deg, transparent 358deg)`;
  return (
    <div
      className="absolute pointer-events-none"
      style={{ top: -4, left: -4, width: w + 8, height: h + 8, borderRadius: radius + 4, overflow: "hidden", zIndex: 0 }}
    >
      <div
        className={slow ? "bb-spin-border-slow" : "bb-spin-border"}
        style={{ position: "absolute", width: "200%", height: "200%", top: "-50%", left: "-50%",
          background: grad, filter: "blur(3px)", opacity: 0.75 }}
      />
      <div
        className={slow ? "bb-spin-border-slow" : "bb-spin-border"}
        style={{ position: "absolute", width: "200%", height: "200%", top: "-50%", left: "-50%",
          background: grad }}
      />
      <div style={{
        position: "absolute",
        top: 4, left: 4, width: w, height: h,
        borderRadius: radius,
        background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)",
      }} />
    </div>
  );
}

// ─── Ghost suggestion node (Copilot-style) ───────────────────────────────────
function SuggestionGhostNode({ data }) {
  const nodeDef = NodeRegistry[data.backendType] || NodeRegistry.manual;
  const Icon = nodeDef.icon;
  const clearSuggestionNode = useWorkspaceStore(s => s.clearSuggestionNode);
  const acceptSuggestion = useWorkspaceStore(s => s.acceptSuggestion);
  const cardW = 94, cardH = 94;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.88, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      style={{ width: cardW, height: cardH + 58 }}
    >
      {/* "Suggest" chip above the card */}
      <div className="absolute px-2 py-0.5 rounded border border-violet-500/20 bg-violet-500/8 pointer-events-none select-none"
        style={{ top: -24, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
        <span className="text-[9px] font-bold text-violet-400/90 uppercase tracking-widest">Suggest</span>
      </div>

      {/* Input handle */}
      <Handle type="target" position={Position.Left} id="input"
        className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-violet-700/60 touch-none"
        style={{ top: cardH / 2 }} />

      {/* Ghost card — semi-transparent, solid violet border */}
      <div className="flex flex-col items-center justify-center"
        style={{
          opacity: 0.5, width: cardW, height: cardH, borderRadius: 12,
          background: GLASS_BG,
          backdropFilter: "blur(12px) saturate(120%)", WebkitBackdropFilter: "blur(12px) saturate(120%)",
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 0 28px rgba(139,92,246,0.12), 0 12px 40px rgba(0,0,0,0.7)',
        }}>
        {nodeDef.logoUrl ? (
          <img src={nodeDef.logoUrl} alt={nodeDef.label} className="w-11 h-11 object-contain"
            style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />
        ) : (
          <Icon className="w-11 h-11 text-white" strokeWidth={1} />
        )}
      </div>

      {/* Label + accept/dismiss — full opacity, below the ghost card */}
      <div className="absolute" style={{ top: cardH + 7, left: 0, width: cardW }}>
        <p className="text-[11px] font-bold text-violet-300/80 text-center truncate px-1 mb-2 select-none">
          {nodeDef.label || data.label}
        </p>
        <div className="flex items-center justify-center gap-1.5 nodrag">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); acceptSuggestion(data.suggestionSourceId, data); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500 hover:bg-violet-400 active:scale-95 text-white text-[10px] font-bold transition-all shadow-lg shadow-violet-900/50">
            <Check className="w-3 h-3" strokeWidth={3} /> Accept
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); clearSuggestionNode(); }}
            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700 text-zinc-500 hover:text-zinc-200 flex items-center justify-center transition-all">
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN NODE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
function CustomNode({ id, data, selected }) {
  if (data.isSuggestion) return <SuggestionGhostNode id={id} data={data} />;

  const [isHovered, setIsHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    hoverListeners.set(id, setIsHovered);
    return () => { hoverListeners.delete(id); };
  }, [id]);
  const { id: automationId } = useParams();
  const { deleteElements } = useReactFlow();
  const nodeDef = NodeRegistry[data.backendType] || NodeRegistry.manual;
  const variantDef = (data.type === "trigger" && data.config?.triggerVariant) ? TRIGGER_VARIANTS[data.config.triggerVariant] : null;
  const Icon = (variantDef || nodeDef).icon;
  const accent = (variantDef?.accentColor || nodeDef.accentColor) || "161,161,170";

  const isExecutionLive = useWorkspaceStore(s => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore(s => s.getNodeStatus);
  const getMappingWarnings = useWorkspaceStore(s => s.getMappingWarnings);
  const isRunning = useWorkspaceStore(s => s.isRunning);
  const runEngine = useWorkspaceStore(s => s.runEngine);
  const edges = useWorkspaceStore(useShallow(s => s.edges.filter(e => e.source === id || e.target === id)));
  const setAddNodeSource = useWorkspaceStore(s => s.setAddNodeSource);
  const setSelectedNodeId = useWorkspaceStore(s => s.setSelectedNodeId);
  const duplicateNode = useWorkspaceStore(s => s.duplicateNode);
  const updateNodeConfig = useWorkspaceStore(s => s.updateNodeConfig);
  const lastRunOutputs = useWorkspaceStore(s => s.lastRunOutputs);

  const status = isExecutionLive ? getNodeStatus(id) : null;

  // For agent sub-nodes (circles), light up when parent AI Agent is running
  const parentAgentId = edges.find(e => e.source === id && e.sourceHandle === "agent_out")?.target;
  const parentAgentRunning = isExecutionLive && parentAgentId ? getNodeStatus(parentAgentId) === "running" : false;

  const nodeOutput = lastRunOutputs?.[id];
  const outputCount = (() => {
    if (nodeOutput == null) return null;
    if (nodeOutput.__loopFanOut) {
      const arr = nodeOutput.items ?? nodeOutput.__loopItems;
      return Array.isArray(arr) ? arr.length : null;
    }
    if (Array.isArray(nodeOutput)) return nodeOutput.length;
    if (typeof nodeOutput === 'object') return 1;
    return null;
  })();

  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";
  const isAgent = data.backendType === "ai_agent";
  const isAgentSub = isAgentHubType(data.backendType)
    || data.backendType?.startsWith("tool_")
    || data.backendType?.startsWith("agent_memory_");
  // Detect hub-wired nodes: has an outgoing edge with a known hub targetHandle pointing to an ai_agent
  const HUB_HANDLES = new Set(["chat_model", "integration", "tools", "memory"]);
  const hasAgentOutConnection = edges.some(e =>
    (e.source === id && e.sourceHandle === "agent_out") ||
    (e.source === id && e.targetHandle && HUB_HANDLES.has(e.targetHandle))
  );

  // Shape per category
  const catShape = CATEGORIES.find(c => c.id === nodeDef.category)?.shape ?? "rounded";
  const shapeRadius = catShape === "sharp" ? 4 : catShape === "pill" ? 32 : catShape === "rounded" ? 12 : 20;
  const configHint = getConfigHint(data, edges, id);

  const getSlotConnected = slotId => edges.some(e => e.target === id && e.targetHandle === slotId);
  const hasOutputConnection  = edges.some(e => e.source === id && e.sourceHandle === "output");
  const hasErrorConnection   = edges.some(e => e.source === id && e.sourceHandle === "onFailure");
  const hasTrueConnection    = edges.some(e => e.source === id && e.sourceHandle === "true");
  const hasFalseConnection   = edges.some(e => e.source === id && e.sourceHandle === "false");
  const hasSuccessConnection = edges.some(e => e.source === id && e.sourceHandle === "success");
  const hasFailedConnection  = edges.some(e => e.source === id && e.sourceHandle === "failed");

  const handlePlay = e => { e.stopPropagation(); if (!isRunning && automationId) runEngine(automationId); };
  const handleAddNext = e => { e.stopPropagation(); e.preventDefault(); setAddNodeSource(id); };
  const handleOpenConfig = e => { e.stopPropagation(); setSelectedNodeId(id); };
  const handleDuplicate = e => { e.stopPropagation(); if (duplicateNode) duplicateNode(id); };
  const handleDelete = e => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); };

  // ── Status badge — only on failure ─────────────────────────────────────
  const badge = status === "failed" ? (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/90 flex items-center justify-center z-20">
      <AlertTriangle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
    </motion.div>
  ) : null;

  const dotColor = status === "running" ? "#3b82f6" : status === "failed" ? "#ef4444" : "#52525b";
  const statusGlow = status === "running" ? "0 0 8px rgba(59,130,246,0.5)" : "none";

  // ── NodeToolbar ─────────────────────────────────────────────────────────
  const toolbar = (
    <NodeToolbar isVisible={selected || isHovered} position={Position.Top} offset={8}
      className="!bg-zinc-950 !border !border-zinc-800 !rounded-xl !shadow-xl !shadow-black/50 !p-1 !flex !items-center !gap-0">
      <ToolbarButton icon={Play} label="Run workflow" onClick={handlePlay} />
      <ToolbarButton icon={Settings} label="Configure" onClick={handleOpenConfig} />
      {!isTrigger && <ToolbarButton icon={Copy} label="Duplicate" onClick={handleDuplicate} />}
      {!isTrigger && <ToolbarButton icon={Trash2} label="Delete" onClick={handleDelete} danger />}
    </NodeToolbar>
  );

  // ── TRIGGER NODE ────────────────────────────────────────────────────────
  if (isTrigger) {
    const cardW = 94, cardH = 94;
    const triggerRadius = "33px 10px 10px 33px";
    const isChatTrigger = data.backendType === "chat_trigger" || data.config?.triggerVariant === "chat";
    const cardBorder = status === "running" ? "2px solid transparent"
      : status === "failed" ? "1.5px solid rgba(239,68,68,0.6)"
      : selected ? "1.5px solid rgba(255,255,255,0.65)"
      : "1.5px solid rgba(255,255,255,0.28)";
    const cardShadow = GLASS_SHADOW(isHovered, selected);

    return (
      <div className="relative group" style={{ width: cardW, height: cardH + 54 }}>
        {toolbar}
        {status === "running" && <SpinBorder radius={shapeRadius} w={cardW} h={cardH} />}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          onClick={isChatTrigger ? handleOpenConfig : handlePlay}
          className={`bb-card absolute flex flex-col items-center justify-center transition-all duration-300 ${isRunning ? "cursor-wait" : "cursor-pointer"}`}
          style={{ top: 0, left: 0, width: cardW, height: cardH, borderRadius: triggerRadius, background: GLASS_BG, backdropFilter: "blur(12px) saturate(120%)", WebkitBackdropFilter: "blur(12px) saturate(120%)", border: cardBorder, boxShadow: cardShadow, position: "relative", zIndex: 1 }}>
          {badge}
          {(variantDef?.logoUrl || nodeDef.logoUrl) ? (
            <img src={variantDef?.logoUrl || nodeDef.logoUrl} alt={data.label} className="w-11 h-11 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={(variantDef?.imgFilter || nodeDef.imgFilter) ? { filter: variantDef?.imgFilter || nodeDef.imgFilter } : undefined} />
          ) : (
            <Icon className="w-11 h-11 text-white opacity-80 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.4} />
          )}
        </motion.div>
        <OutputHandle nodeId={id} hasConnection={hasOutputConnection} onAdd={handleAddNext} dotColor={dotColor} statusGlow={statusGlow} cardHeight={cardH} />
        {outputCount != null && (
          <div className="absolute pointer-events-none select-none" style={{ left: cardW + 10, top: cardH / 2 - 16 }}>
            <span style={{ fontSize: 9, color: '#555', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
              {outputCount} item{outputCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <div className="absolute text-center select-none" style={{ left: 0, width: cardW, top: cardH + 6 }}>
          <span className="text-[11px] font-semibold text-white group-hover:text-white transition-colors duration-200 leading-snug block">{data.config?.selectedAction || variantDef?.label || nodeDef.label || data.label}</span>
          <span className="text-[10px] font-semibold text-white/50 mt-0.5 block">{isChatTrigger ? "Type below to test" : data.config?.selectedAction ? variantDef?.label || nodeDef.label : "Click to run"}</span>
        </div>
      </div>
    );
  }

  // ── AI AGENT NODE ── standard dark card, 3 slot dots on the bottom border ──
  if (isAgent) {
    const cardW = 188;
    const cardH = 94;
    const n = AGENT_BOTTOM_SLOTS.length;

    const cardBorder = status === "running" ? "2px solid transparent"
      : status === "failed" ? "1.5px solid rgba(239,68,68,0.6)"
      : selected ? "1.5px solid rgba(255,255,255,0.65)"
      : "1.5px solid rgba(255,255,255,0.28)";
    const cardShadow = GLASS_SHADOW(isHovered, selected);

    return (
      <div className="relative group" style={{ width: cardW, height: cardH + 48 }}>
        {toolbar}
        {status === "running" && <SpinBorder radius={shapeRadius} w={cardW} h={cardH} />}

        <Handle type="target" position={Position.Left} id="input"
          className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] transition-all duration-200 touch-none"
          style={{ top: cardH / 2, zIndex: 2, position: "absolute" }} />

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          onClick={handleOpenConfig} className="bb-card relative flex items-center justify-center cursor-pointer transition-all duration-300"
          style={{ width: cardW, height: cardH, borderRadius: shapeRadius, background: GLASS_BG, backdropFilter: "blur(12px) saturate(120%)", WebkitBackdropFilter: "blur(12px) saturate(120%)", border: cardBorder, boxShadow: cardShadow, position: "relative", zIndex: 1 }}>

          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ borderRadius: shapeRadius - 1, background: `radial-gradient(circle at 50% 40%, rgba(${accent},0.06) 0%, transparent 70%)` }} />

          {badge}

          {/* Icon + name centered in the full card */}
          <div className="flex items-center gap-3 px-5">
            <Bot className="w-9 h-9 text-white opacity-80 group-hover:opacity-100 shrink-0 transition-opacity duration-300" strokeWidth={1.4} />
            <p className="text-[13px] font-bold text-white leading-tight">{nodeDef.label || data.label || "AI Agent"}</p>
          </div>
        </motion.div>

        {/* Slot labels — below the card bottom border dots */}
        <div className="absolute left-0 right-0 grid pointer-events-none select-none"
          style={{ top: cardH + 12, gridTemplateColumns: `repeat(${n}, 1fr)`, height: 18, zIndex: 2 }}>
          {AGENT_BOTTOM_SLOTS.map(slot => (
            <span key={slot.id} className="flex items-center justify-center text-[9px] font-medium text-zinc-500 tracking-wide">
              {slot.label}
            </span>
          ))}
        </div>

        {/* Slot dots — fully below the card so edge origins are unobscured */}
        {AGENT_BOTTOM_SLOTS.map((slot, i) => (
          <AgentSlotDot key={slot.id} slot={slot} parentNodeId={id}
            hasConnection={getSlotConnected(slot.id)}
            leftPct={`${(cardW / n) * i + cardW / n / 2}px`}
            cardH={cardH} />
        ))}

        <OutputHandle nodeId={id} hasConnection={hasOutputConnection} onAdd={handleAddNext} dotColor={dotColor} statusGlow={statusGlow} cardHeight={cardH} />
        {outputCount != null && (
          <div className="absolute pointer-events-none select-none" style={{ left: cardW + 10, top: cardH / 2 - 16 }}>
            <span style={{ fontSize: 9, color: '#555', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
              {outputCount} item{outputCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── AGENT COMPONENT CIRCLE (placed via AgentPicker or legacy agent sub-types) ──
  if (data.isAgentComponent || isAgentSub || hasAgentOutConnection) {
    const d = 58;
    const models = nodeDef.models || [];
    const selectedModel = data.config?.model || nodeDef.defaultModel || "";
    const selectedLabel = models.find(m => m.value === selectedModel)?.label || selectedModel;
    const agentComponentLabel =
      selectedLabel ||
      data.config?.alias ||
      data.config?.memoryType?.replace(/_/g, " ") ||
      data.label ||
      nodeDef.label;

    const cardBorder = parentAgentRunning
      ? "2px solid transparent"
      : selected
      ? "1.5px solid rgba(255,255,255,0.65)"
      : "1.5px solid rgba(255,255,255,0.28)";
    const cardShadow = GLASS_SHADOW(isHovered, selected);

    return (
      <div className="relative group" style={{ width: d, height: d + 22 }}>
        {toolbar}
        {parentAgentRunning && <SpinBorder radius={9999} w={d} h={d} slow color1="#a78bfa" color2="#c4b5fd" />}

        {/* Model picker popup — floats above the circle */}
        {pickerOpen && models.length > 0 && (
          <div className="absolute nodrag" style={{ bottom: d + 10, left: "50%", transform: "translateX(-50%)", zIndex: 9999, minWidth: 180 }}>
            <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/60 overflow-hidden py-1">
              {models.map(m => (
                <button key={m.value}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); updateNodeConfig(id, "model", m.value); setPickerOpen(false); }}
                  className={`w-full px-4 py-2 text-left text-[12px] transition-colors ${
                    selectedModel === m.value
                      ? "text-zinc-100 bg-zinc-800 font-semibold"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Single top dot — connects back up to agent slot */}
        <Handle type="source" position={Position.Top} id="agent_out"
          className="!rounded-full !border-2 !border-[#1a1a1e] touch-none"
          style={{ width: 10, height: 10, backgroundColor: "#52525b", top: -5, left: "50%", transform: "translateX(-50%)" }}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          onClick={e => { e.stopPropagation(); setPickerOpen(p => !p); }}
          className="bb-card relative flex items-center justify-center cursor-pointer transition-all duration-300"
          style={{ width: d, height: d, borderRadius: 9999, background: GLASS_BG, backdropFilter: "blur(12px) saturate(120%)", WebkitBackdropFilter: "blur(12px) saturate(120%)", border: cardBorder, boxShadow: cardShadow, position: "relative", zIndex: 1 }}
        >
          <div className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `radial-gradient(circle at 50% 40%, rgba(${accent},0.07) 0%, transparent 70%)` }} />
          {badge}
          {nodeDef.logoUrl ? (
            <img src={nodeDef.logoUrl} alt={data.label} className="w-7 h-7 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />
          ) : (
            <Icon className="w-7 h-7 text-white opacity-80 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.4} />
          )}
        </motion.div>

        {/* Model name below circle */}
        <div className="absolute text-center select-none pointer-events-none" style={{ top: d + 5, left: 0, width: d }}>
          <span className="text-[9px] text-zinc-400 font-medium block truncate leading-tight">
            {agentComponentLabel}
          </span>
        </div>
      </div>
    );
  }

  // ── DISTRIBUTOR NODE ──────────────────────────────────────────────────────
  if (data.backendType === "distributor") {
    const workers = data.config?.workers || 3;
    const strategy = data.config?.strategy || "parallel";
    const cardW = 190;
    const cardH = Math.max(100, workers * 24 + 24);

    return (
      <div className="relative group" style={{ width: cardW, height: cardH + 28 }}>
        {toolbar}
        <Handle type="target" position={Position.Left} id="input"
          className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] touch-none"
          style={{ top: cardH / 2 }} />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          onClick={handleOpenConfig} className="bb-card relative cursor-pointer overflow-visible"
          style={{ width: cardW, height: cardH, borderRadius: 16,
            background: GLASS_BG,
            backdropFilter: "blur(12px) saturate(120%)", WebkitBackdropFilter: "blur(12px) saturate(120%)",
            border: selected ? "1.5px solid rgba(255,255,255,0.65)" : "1.5px solid rgba(255,255,255,0.28)",
            boxShadow: GLASS_SHADOW(isHovered, selected) }}>
          <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 15, background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)" }} />
          <div className="flex flex-col items-start justify-center h-full gap-1 px-5">
            <div className="flex items-center gap-2">
              <Split className="w-5 h-5 text-violet-400 shrink-0" strokeWidth={1.75} />
              <span className="text-[12px] font-bold text-zinc-100">{data.label || "Distributor"}</span>
            </div>
            <span className="text-[10px] text-zinc-500">{workers} workers · <span className="text-violet-400">{strategy.replace("_", " ")}</span></span>
          </div>
          {Array.from({ length: workers }, (_, i) => {
            const y = cardH * (i + 0.5) / workers;
            const isConnected = edges.some(e => e.source === id && e.sourceHandle === `worker_${i + 1}`);
            return (
              <div key={i}>
                <Handle type="source" position={Position.Right} id={`worker_${i + 1}`}
                  className="!w-4 !h-4 !rounded-full !border-2 !border-[#1a1a1e] touch-none"
                  style={{ backgroundColor: isConnected ? "#a78bfa" : "#52525b", top: y, right: -8 }} />
                <span className="absolute text-[8px] text-zinc-600 font-bold select-none pointer-events-none"
                  style={{ right: 10, top: y, transform: "translateY(-50%)" }}>W{i + 1}</span>
              </div>
            );
          })}
        </motion.div>
        <div className="absolute text-center select-none" style={{ left: 0, width: cardW, top: cardH + 8 }}>
          <span className="text-[11px] font-semibold text-zinc-400">{nodeDef.label || data.label || "Distributor"}</span>
        </div>
      </div>
    );
  }

  // ── STANDARD ACTION NODE ─────────────────────────────────────────────────
  const cardW = 94, cardH = 94;

  const cardBorderTop = status === "running" ? "2px solid transparent"
    : status === "failed" ? "1.5px solid rgba(239,68,68,0.6)"
    : selected ? "1.5px solid rgba(255,255,255,0.65)"
    : "1.5px solid rgba(255,255,255,0.28)";
  const cardBorder = cardBorderTop;
  const cardBottomBorder = status === "failed" ? "1.5px solid rgba(239,68,68,0.45)" : "2px solid rgba(255,255,255,0.32)";
  const cardShadow = GLASS_SHADOW(isHovered, selected);

  return (
    <div className="relative group" style={{ width: cardW, height: cardH + 48 }}>
      {toolbar}
      {status === "running" && <SpinBorder radius={shapeRadius} w={cardW} h={cardH} />}

      {/* Input handle */}
      <Handle type="target" position={Position.Left} id="input"
        className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] transition-all duration-200 touch-none"
        style={{ top: cardH / 2, zIndex: 2, position: "absolute" }} />

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        onClick={handleOpenConfig} className="bb-card relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
        style={{ width: cardW, height: cardH, borderRadius: shapeRadius, background: GLASS_BG, backdropFilter: "blur(12px) saturate(120%)", WebkitBackdropFilter: "blur(12px) saturate(120%)", border: cardBorder, borderBottom: cardBottomBorder, boxShadow: cardShadow, position: "relative", zIndex: 1 }}>
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ borderRadius: shapeRadius - 1, background: `radial-gradient(circle at 50% 40%, rgba(${accent},0.06) 0%, transparent 70%)` }} />
        {badge}
        {hasMappingWarning && (
          <div className="absolute top-2 left-2 group/warn">
            <AlertTriangle className="w-3 h-3 text-amber-500/70 cursor-help" />
            <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg opacity-0 group-hover/warn:opacity-100 transition-opacity pointer-events-none z-50 w-52">
              {warnings.map((w, i) => <p key={i} className="text-[10px] text-amber-400/80 leading-relaxed">{w}</p>)}
            </div>
          </div>
        )}
        {nodeDef.logoUrl ? (
          <img src={nodeDef.logoUrl} alt={data.label} className="w-11 h-11 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />
        ) : (
          <Icon className="w-11 h-11 text-white opacity-80 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.4} />
        )}
      </motion.div>

      {data.backendType === "condition" ? (
        <ConditionOutputHandles cardHeight={cardH} trueConnected={hasTrueConnection} falseConnected={hasFalseConnection} onAdd={handleAddNext} />
      ) : data.backendType === "success_failed" ? (
        <SuccessFailedOutputHandles cardHeight={cardH} successConnected={hasSuccessConnection} failedConnected={hasFailedConnection} onAdd={handleAddNext} />
      ) : (
        <OutputHandle nodeId={id} hasConnection={hasOutputConnection} onAdd={handleAddNext} dotColor={dotColor} statusGlow={statusGlow} cardHeight={cardH} />
      )}
      {outputCount != null && data.backendType !== "condition" && data.backendType !== "success_failed" && (
        <div className="absolute pointer-events-none select-none" style={{ left: cardW + 10, top: cardH / 2 - 16 }}>
          <span style={{ fontSize: 9, color: '#555', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
            {outputCount} item{outputCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Error/onFailure output handle — shown when error path is configured or connected */}
      {(hasErrorConnection || data.config?.retryPolicy?.retryOnFailure === false) && (
        <Handle type="source" position={Position.Right} id="onFailure"
          className="!w-3.5 !h-3.5 !rounded-full !border-2 !border-[#1a1a1e] touch-none"
          style={{ backgroundColor: hasErrorConnection ? "#ef4444" : "#7f1d1d", top: cardH * 0.72, right: -7 }}
        />
      )}
      {(hasErrorConnection || data.config?.retryPolicy?.retryOnFailure === false) && (
        <span className="absolute text-[7px] font-bold text-red-600 select-none pointer-events-none"
          style={{ right: 14, top: cardH * 0.72, transform: "translateY(-50%)" }}>ERR</span>
      )}

      <div className="absolute text-center select-none" style={{ left: 0, width: cardW, top: cardH + 6 }}>
        <span className="text-[11px] font-semibold text-white leading-snug block truncate px-1">
          {data.config?.customLabel || data.config?.selectedAction || nodeDef.label || data.label}
        </span>
        {(data.config?.customLabel || data.config?.selectedAction) && (
          <span className="text-[9px] font-semibold text-white/50 mt-0.5 block truncate px-1">{nodeDef.label}</span>
        )}
        {!data.config?.selectedAction && configHint && <span className="text-[9px] font-medium text-white/40 mt-0.5 block truncate px-1 font-mono">{configHint}</span>}
      </div>
    </div>
  );
}

export default memo(CustomNode);
