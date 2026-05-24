import { useState } from "react";
import { Handle, Position, NodeToolbar, useReactFlow } from "@xyflow/react";
import { Check, AlertTriangle, Settings2, Loader2, Plus, Brain, Database, MousePointer2, Play, Settings, Copy, Trash2, CheckCheck, XCircle, Zap, Bot, Split, X, Sparkles, Plug } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { NodeRegistry, CATEGORIES } from "../../nodeRegistry";
import { TRIGGER_VARIANTS } from "../../triggerVariants";
import useWorkspaceStore from "../../../../store/workspaceStore";

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

// ─── Dock Popover: spawns the correct agent sub-node ───────────────────────

// ─── Agent Slot Dot — sits on the bottom border line of the card ────────────
function AgentSlotDot({ slot, parentNodeId, hasConnection, leftPct, cardH }) {
  const [hovered, setHovered] = useState(false);
  const openAgentPicker = useWorkspaceStore(s => s.openAgentPicker);

  const showPlus = !hasConnection || (slot.showPlus && hovered);

  return (
    <div className="absolute nodrag" style={{ left: leftPct, top: cardH, transform: "translateX(-50%)" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      <Handle type="target" position={Position.Bottom} id={slot.id}
        className="!opacity-0 !w-5 !h-5 !pointer-events-none"
        style={{ left: "50%", top: 0, transform: "translateX(-50%)" }} />

      {showPlus ? (
        <button
          onClick={e => { e.stopPropagation(); openAgentPicker(parentNodeId); }}
          onMouseDown={e => e.stopPropagation()}
          className="w-5 h-5 rounded-full bg-zinc-800 border-[2.5px] border-zinc-500 flex items-center justify-center hover:border-zinc-300 active:scale-95 transition-all duration-100"
          title={slot.label}
        >
          <Plus className="w-2.5 h-2.5 text-zinc-300" strokeWidth={3} />
        </button>
      ) : (
        <div className="w-5 h-5 rounded-full border-[3px] border-[#1a1a1e]"
          style={{ backgroundColor: "#71717a" }} />
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
    const llmEdge = edges?.find(e => e.target === nodeId && e.targetHandle === "llm");
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
function OutputHandle({ nodeId, hasConnection, onAdd, dotColor = "#52525b", statusGlow = "none", cardHeight, handleId = "output" }) {
  return (
    <>
      <Handle type="source" position={Position.Right} id={handleId}
        className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] touch-none"
        style={{ backgroundColor: dotColor, boxShadow: statusGlow, opacity: hasConnection ? 1 : 0, ...(cardHeight ? { top: cardHeight / 2, transform: "translate(50%, -50%)" } : {}) }}
      />
      {!hasConnection && (
        <div className="absolute z-10 nodrag"
          style={cardHeight ? { right: -16, top: cardHeight / 2, transform: "translateY(-50%)" } : { right: -16, top: "50%", transform: "translateY(-50%)" }}>
          <button onClick={e => { e.stopPropagation(); onAdd(e); }} onMouseDown={e => e.stopPropagation()}
            className="w-7 h-7 rounded-full bg-[#18181b] border-[2.5px] border-zinc-700/60 flex items-center justify-center hover:bg-zinc-700 hover:border-zinc-400 active:scale-95 transition-all duration-150 shadow-lg shadow-black/50 group/plus"
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
function ConditionOutputHandles({ cardHeight }) {
  const topY = cardHeight * 0.33;
  const botY = cardHeight * 0.67;
  return (
    <>
      <Handle type="source" position={Position.Right} id="true"
        className="!w-4 !h-4 !rounded-full !border-[2.5px] !border-[#1a1a1e] !bg-emerald-500 touch-none"
        style={{ top: topY, right: -8 }} />
      <div className="absolute z-10 nodrag flex items-center gap-1" style={{ right: -56, top: topY, transform: "translateY(-50%)" }}>
        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">True</span>
        <CheckCheck className="w-3 h-3 text-emerald-400" />
      </div>
      <Handle type="source" position={Position.Right} id="false"
        className="!w-4 !h-4 !rounded-full !border-[2.5px] !border-[#1a1a1e] !bg-red-500 touch-none"
        style={{ top: botY, right: -8 }} />
      <div className="absolute z-10 nodrag flex items-center gap-1" style={{ right: -60, top: botY, transform: "translateY(-50%)" }}>
        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">False</span>
        <XCircle className="w-3 h-3 text-red-400" />
      </div>
    </>
  );
}

// ─── Success/Failed dual output handles ──────────────────────────────────────
function SuccessFailedOutputHandles({ cardHeight }) {
  const topY = cardHeight * 0.33;
  const botY = cardHeight * 0.67;
  return (
    <>
      <Handle type="source" position={Position.Right} id="success"
        className="!w-4 !h-4 !rounded-full !border-[2.5px] !border-[#1a1a1e] !bg-emerald-500 touch-none"
        style={{ top: topY, right: -8 }} />
      <div className="absolute z-10 nodrag flex items-center gap-1" style={{ right: -68, top: topY, transform: "translateY(-50%)" }}>
        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Success</span>
        <CheckCheck className="w-3 h-3 text-emerald-400" />
      </div>
      <Handle type="source" position={Position.Right} id="failed"
        className="!w-4 !h-4 !rounded-full !border-[2.5px] !border-[#1a1a1e] !bg-red-500 touch-none"
        style={{ top: botY, right: -8 }} />
      <div className="absolute z-10 nodrag flex items-center gap-1" style={{ right: -62, top: botY, transform: "translateY(-50%)" }}>
        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Failed</span>
        <AlertTriangle className="w-3 h-3 text-red-400" />
      </div>
    </>
  );
}

// ─── Spinning border overlay (n8n-style live execution ring) ─────────────────
// Renders behind the card. The inner mask div recreates the card background so
// only a 2px rim of the rotating conic-gradient is visible.
function SpinBorder({ radius, w, h, slow = false, color1 = "rgba(59,130,246,0.95)", color2 = "rgba(96,165,250,0.8)" }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ top: -2, left: -2, width: w + 4, height: h + 4, borderRadius: radius + 2, overflow: "hidden", zIndex: 0 }}
    >
      <div
        className={slow ? "bb-spin-border-slow" : "bb-spin-border"}
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          top: "-50%",
          left: "-50%",
          background: `conic-gradient(from 0deg, transparent 0deg, transparent 210deg, ${color1} 255deg, ${color2} 300deg, transparent 345deg)`,
        }}
      />
      {/* Inner mask — same bg as card — makes only the rim visible */}
      <div style={{
        position: "absolute",
        top: 2, left: 2, width: w, height: h,
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
  const cardW = 120, cardH = 120;

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
          background: 'linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 0 28px rgba(139,92,246,0.12), 0 12px 40px rgba(0,0,0,0.7)',
        }}>
        {nodeDef.logoUrl ? (
          <img src={nodeDef.logoUrl} alt={nodeDef.label} className="w-12 h-12 object-contain"
            style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />
        ) : (
          <Icon className="w-12 h-12 text-white" strokeWidth={1} />
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
export default function CustomNode({ id, data, selected }) {
  if (data.isSuggestion) return <SuggestionGhostNode id={id} data={data} />;

  const [isHovered, setIsHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const edges = useWorkspaceStore(s => s.edges);
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
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";
  const isAgent = data.backendType === "ai_agent";
  const isAgentSub = AGENT_SUB_TYPES.includes(data.backendType)
    || data.backendType?.startsWith("tool_")
    || data.backendType?.startsWith("agent_memory_");
  // Infer from edge state so the circle survives page refresh even if flag is lost
  const hasAgentOutConnection = edges.some(e => e.source === id && e.sourceHandle === "agent_out");

  // Shape per category
  const catShape = CATEGORIES.find(c => c.id === nodeDef.category)?.shape ?? "rounded";
  const shapeRadius = catShape === "sharp" ? 4 : catShape === "pill" ? 32 : catShape === "rounded" ? 12 : 20;
  const configHint = getConfigHint(data, edges, id);

  const getSlotConnected = slotId => edges.some(e => e.target === id && e.targetHandle === slotId);
  const hasOutputConnection = edges.some(e => e.source === id && e.sourceHandle === "output");
  const hasErrorConnection = edges.some(e => e.source === id && e.sourceHandle === "onFailure");

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
    const cardW = 120, cardH = 120;
    const isChatTrigger = data.backendType === "chat_trigger" || data.config?.triggerVariant === "chat";
    const cardBorder = status === "running" ? "1.5px solid transparent"
      : status === "failed" ? "1.5px solid rgba(239,68,68,0.35)"
      : selected ? "2px solid rgba(255,255,255,0.45)"
      : isHovered ? "6px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(255,255,255,0.08)";
    const cardShadow = "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

    return (
      <div className="relative group" style={{ width: cardW, height: cardH + 54 }}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {toolbar}
        {status === "running" && <SpinBorder radius={shapeRadius} w={cardW} h={cardH} />}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          onClick={isChatTrigger ? handleOpenConfig : handlePlay}
          className={`absolute flex flex-col items-center justify-center transition-all duration-300 ${isRunning ? "cursor-wait" : "cursor-pointer"}`}
          style={{ top: 0, left: 0, width: cardW, height: cardH, borderRadius: shapeRadius, background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)", border: cardBorder, boxShadow: cardShadow, position: "relative", zIndex: 1 }}>
          {badge}
          {(variantDef?.logoUrl || nodeDef.logoUrl) ? (
            <img src={variantDef?.logoUrl || nodeDef.logoUrl} alt={data.label} className="w-12 h-12 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={(variantDef?.imgFilter || nodeDef.imgFilter) ? { filter: variantDef?.imgFilter || nodeDef.imgFilter } : undefined} />
          ) : (
            <Icon className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.4} />
          )}
        </motion.div>
        <OutputHandle nodeId={id} hasConnection={hasOutputConnection} onAdd={handleAddNext} dotColor={dotColor} statusGlow={statusGlow} cardHeight={cardH} />
        <div className="absolute text-center select-none" style={{ left: 0, width: cardW, top: cardH + 6 }}>
          <span className="text-[11px] font-semibold text-white group-hover:text-white transition-colors duration-200 leading-snug block">{data.config?.selectedAction || variantDef?.label || nodeDef.label || data.label}</span>
          <span className="text-[10px] font-semibold text-white/50 mt-0.5 block">{isChatTrigger ? "Type below to test" : data.config?.selectedAction ? variantDef?.label || nodeDef.label : "Click to run"}</span>
        </div>
      </div>
    );
  }

  // ── AI AGENT NODE ── standard dark card, 3 slot dots on the bottom border ──
  if (isAgent) {
    const cardW = 230;
    const cardH = 120;
    const n = AGENT_BOTTOM_SLOTS.length;

    const cardBorder = status === "running" ? "1.5px solid transparent"
      : status === "failed" ? "1.5px solid rgba(239,68,68,0.35)"
      : selected ? "2px solid rgba(255,255,255,0.45)"
      : isHovered ? "6px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(255,255,255,0.08)";
    const cardShadow = "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

    return (
      <div className="relative group" style={{ width: cardW, height: cardH + 48 }}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {toolbar}
        {status === "running" && <SpinBorder radius={shapeRadius} w={cardW} h={cardH} />}

        <Handle type="target" position={Position.Left} id="input"
          className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] transition-all duration-200 touch-none"
          style={{ top: cardH / 2, zIndex: 2, position: "absolute" }} />

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          onClick={handleOpenConfig} className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
          style={{ width: cardW, height: cardH, borderRadius: shapeRadius, background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)", border: cardBorder, boxShadow: cardShadow, position: "relative", zIndex: 1 }}>

          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ borderRadius: shapeRadius - 1, background: `radial-gradient(circle at 50% 40%, rgba(${accent},0.06) 0%, transparent 70%)` }} />

          {badge}

          <Bot className="w-10 h-10 text-white opacity-75 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.4} />
          <p className="text-[11px] font-bold text-white mt-1.5">{nodeDef.label || data.label || "AI Agent"}</p>

          {/* Slot labels above bottom edge */}
          <div className="absolute bottom-3 left-0 right-0 grid pointer-events-none select-none"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {AGENT_BOTTOM_SLOTS.map(slot => (
              <span key={slot.id} className="text-center text-[9px] font-medium text-zinc-500 tracking-wide">
                {slot.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Slot dots — siblings of card so they're never clipped */}
        {AGENT_BOTTOM_SLOTS.map((slot, i) => (
          <AgentSlotDot key={slot.id} slot={slot} parentNodeId={id}
            hasConnection={getSlotConnected(slot.id)}
            leftPct={`${Math.round(100 * (2 * i + 1) / (2 * n))}%`}
            cardH={cardH} />
        ))}

        <OutputHandle nodeId={id} hasConnection={hasOutputConnection} onAdd={handleAddNext} dotColor={dotColor} statusGlow={statusGlow} cardHeight={cardH} />
      </div>
    );
  }

  // ── AGENT COMPONENT CIRCLE (placed via AgentPicker or legacy agent sub-types) ──
  if (data.isAgentComponent || isAgentSub || hasAgentOutConnection) {
    const d = 68;
    const models = nodeDef.models || [];
    const selectedModel = data.config?.model || nodeDef.defaultModel || "";
    const selectedLabel = models.find(m => m.value === selectedModel)?.label || selectedModel;

    const cardBorder = parentAgentRunning
      ? "1.5px solid transparent"
      : selected
      ? "2px solid rgba(255,255,255,0.45)"
      : isHovered ? "6px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(255,255,255,0.08)";
    const cardShadow = selected
      ? "0 0 20px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

    return (
      <div className="relative group" style={{ width: d, height: d + 22 }}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {toolbar}
        {parentAgentRunning && <SpinBorder radius={9999} w={d} h={d} slow color1="rgba(167,139,250,0.8)" color2="rgba(99,102,241,0.8)" />}

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
          className="relative flex items-center justify-center cursor-pointer transition-all duration-300"
          style={{ width: d, height: d, borderRadius: 9999, background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)", border: cardBorder, boxShadow: cardShadow, position: "relative", zIndex: 1 }}
        >
          <div className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `radial-gradient(circle at 50% 40%, rgba(${accent},0.07) 0%, transparent 70%)` }} />
          {badge}
          {nodeDef.logoUrl ? (
            <img src={nodeDef.logoUrl} alt={data.label} className="w-8 h-8 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />
          ) : (
            <Icon className="w-8 h-8 text-white opacity-80 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.4} />
          )}
        </motion.div>

        {/* Model name below circle */}
        <div className="absolute text-center select-none pointer-events-none" style={{ top: d + 5, left: 0, width: d }}>
          <span className="text-[9px] text-zinc-400 font-medium block truncate leading-tight">
            {selectedLabel || nodeDef.label}
          </span>
        </div>
      </div>
    );
  }

  // ── DISTRIBUTOR NODE ──────────────────────────────────────────────────────
  if (data.backendType === "distributor") {
    const workers = data.config?.workers || 3;
    const strategy = data.config?.strategy || "parallel";
    const cardW = 220;
    const cardH = Math.max(110, workers * 24 + 30);

    return (
      <div className="relative group" style={{ width: cardW, height: cardH + 28 }}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {toolbar}
        <Handle type="target" position={Position.Left} id="input"
          className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] touch-none"
          style={{ top: cardH / 2 }} />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          onClick={handleOpenConfig} className="relative cursor-pointer overflow-visible"
          style={{ width: cardW, height: cardH, borderRadius: 16,
            background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)",
            border: selected ? "2px solid rgba(255,255,255,0.45)" : isHovered ? "6px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: selected ? "0 0 24px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.6)" : "0 12px 40px rgba(0,0,0,0.6)" }}>
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
  const cardW = 120, cardH = 120;

  const cardBorderTop = status === "running" ? "1.5px solid transparent"
    : status === "failed" ? "1.5px solid rgba(239,68,68,0.35)"
    : selected ? "2px solid rgba(255,255,255,0.45)"
    : isHovered ? "6px solid rgba(255,255,255,0.14)"
    : "1px solid rgba(255,255,255,0.08)";
  const cardBorder = cardBorderTop;
  const cardBottomBorder = status === "failed" ? "2px solid rgba(239,68,68,0.35)" : "3px solid rgba(255,255,255,0.22)";
  const cardShadow = "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

  return (
    <div className="relative group" style={{ width: cardW, height: cardH + 48 }}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {toolbar}
      {status === "running" && <SpinBorder radius={shapeRadius} w={cardW} h={cardH} />}

      {/* Input handle */}
      <Handle type="target" position={Position.Left} id="input"
        className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] transition-all duration-200 touch-none"
        style={{ top: cardH / 2, zIndex: 2, position: "absolute" }} />

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        onClick={handleOpenConfig} className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
        style={{ width: cardW, height: cardH, borderRadius: shapeRadius, background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)", border: cardBorder, borderBottom: cardBottomBorder, boxShadow: cardShadow, position: "relative", zIndex: 1 }}>
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
          <img src={nodeDef.logoUrl} alt={data.label} className="w-12 h-12 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />
        ) : (
          <Icon className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.4} />
        )}
      </motion.div>

      {data.backendType === "condition" ? (
        <ConditionOutputHandles cardHeight={cardH} />
      ) : data.backendType === "success_failed" ? (
        <SuccessFailedOutputHandles cardHeight={cardH} />
      ) : (
        <OutputHandle nodeId={id} hasConnection={hasOutputConnection} onAdd={handleAddNext} dotColor={dotColor} statusGlow={statusGlow} cardHeight={cardH} />
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
