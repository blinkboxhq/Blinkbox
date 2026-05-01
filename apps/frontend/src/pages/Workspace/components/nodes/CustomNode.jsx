import { useState } from "react";
import { Handle, Position, NodeToolbar, useReactFlow } from "@xyflow/react";
import { Check, AlertTriangle, Settings2, Loader2, Plus, Brain, Database, MousePointer2, Play, Settings, Copy, Trash2, CheckCheck, XCircle, Zap, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { NodeRegistry, CATEGORIES } from "../../nodeRegistry";
import { TRIGGER_VARIANTS } from "../../triggerVariants";
import useWorkspaceStore from "../../../../store/workspaceStore";

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
const AGENT_SUB_TYPES = ["agent_llm", "agent_memory", "agent_tool"];

// ─── Dock Popover: spawns the correct agent sub-node ───────────────────────

// ─── Agent Slot Dot — sits on the bottom border line of the card ────────────
function AgentSlotDot({ slot, parentNodeId, hasConnection, leftPct, cardH }) {
  const [hovered, setHovered] = useState(false);
  const openAgentPicker = useWorkspaceStore(s => s.openAgentPicker);

  const showPlus = !hasConnection || (slot.showPlus && hovered);

  return (
    <div className="absolute nodrag" style={{ left: leftPct, top: cardH - 10, transform: "translateX(-50%)" }}
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
  if (["openai","anthropic","gemini","deepseek","openrouter","together","perplexity","xai","fireworks","cerebras","ollama","novita","deepinfra","hyperbolic"].includes(data.backendType) && c.model) return c.model;
  if (data.backendType === "telegram" && c.text) return c.text.slice(0, 40);
  if (data.backendType === "whatsapp" && c.to) return `→ ${c.to}`;
  if (data.backendType === "airtable" && c.tableName) return `${c.action || "create"} · ${c.tableName}`;
  if (data.backendType === "web_search" && c.query) return c.query.slice(0, 40);
  return null;
}

// ─── Node Shape Helpers ───────────────────────────────────────────────────────
const MEMORY_TYPES = ["window_buffer_memory","redis_memory","postgres_memory","vector_memory","mem0"];
const AI_TYPES = ["openai","anthropic","gemini","deepseek","openrouter","together","perplexity","xai","fireworks","cerebras","ollama","novita","deepinfra","hyperbolic","ai_agent"];

// ─── Node Icon ────────────────────────────────────────────────────────────────
function NodeIcon({ nodeDef, size = "md" }) {
  const Icon = nodeDef.icon;
  const sizeMap = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };
  const s = sizeMap[size];
  if (nodeDef.logoUrl) return <img src={nodeDef.logoUrl} alt={nodeDef.label} className={`${s} object-contain shrink-0`} style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />;
  return <Icon className={`${s} shrink-0 ${nodeDef.colorClass}`} strokeWidth={1.75} />;
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function ToolbarButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button onClick={onClick} title={label}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
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
            className="w-8 h-8 rounded-full bg-zinc-800 border-[2.5px] border-zinc-600 flex items-center justify-center hover:bg-zinc-700 hover:border-zinc-400 active:scale-95 transition-all duration-150 shadow-lg shadow-black/50 group/plus"
            title="Add next step">
            <Plus className="w-4 h-4 text-zinc-300 group-hover/plus:text-white" strokeWidth={3} />
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

// ═════════════════════════════════════════════════════════════════════════════
// MAIN NODE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function CustomNode({ id, data, selected }) {
  const [isHovered, setIsHovered] = useState(false);
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

  const status = isExecutionLive ? getNodeStatus(id) : null;
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";
  const isAgent = data.backendType === "ai_agent";
  const isAgentSub = AGENT_SUB_TYPES.includes(data.backendType);

  // Shape per category
  const catShape = CATEGORIES.find(c => c.id === nodeDef.category)?.shape ?? "rounded";
  const shapeRadius = catShape === "sharp" ? 4 : catShape === "pill" ? 32 : catShape === "rounded" ? 12 : 20;
  const configHint = getConfigHint(data, edges, id);

  const getSlotConnected = slotId => edges.some(e => e.target === id && e.targetHandle === slotId);
  const hasOutputConnection = edges.some(e => e.source === id && e.sourceHandle === "output");
  const hasAgentOutConnection = edges.some(e => e.source === id && e.sourceHandle === "agent_out");

  const handlePlay = e => { e.stopPropagation(); if (!isRunning && automationId) runEngine(automationId); };
  const handleAddNext = e => { e.stopPropagation(); e.preventDefault(); setAddNodeSource(id); };
  const handleOpenConfig = e => { e.stopPropagation(); setSelectedNodeId(id); };
  const handleDuplicate = e => { e.stopPropagation(); if (duplicateNode) duplicateNode(id); };
  const handleDelete = e => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); };

  // ── Status badge ────────────────────────────────────────────────────────
  let badge = null;
  if (status === "completed") badge = (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-20 shadow-lg shadow-emerald-500/30">
      <Check className="w-3 h-3 text-white" strokeWidth={3} />
    </motion.div>
  );
  else if (status === "failed") badge = (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center z-20 shadow-lg shadow-red-500/30">
      <AlertTriangle className="w-3 h-3 text-white" strokeWidth={3} />
    </motion.div>
  );

  const dotColor = status === "completed" ? "#10b981" : status === "running" ? "#3b82f6" : status === "failed" ? "#ef4444" : "#52525b";
  const statusGlow = status === "running" ? "0 0 8px rgba(59,130,246,0.5)" : status === "completed" ? "0 0 8px rgba(16,185,129,0.4)" : "none";

  let borderStyle = {};
  let glowClass = "";
  if (status === "running") { borderStyle = { borderColor: "rgba(59,130,246,0.4)" }; glowClass = "shadow-[0_0_20px_rgba(59,130,246,0.15)]"; }
  else if (status === "completed") { borderStyle = { borderColor: "rgba(16,185,129,0.3)" }; glowClass = "shadow-[0_0_15px_rgba(16,185,129,0.1)]"; }
  else if (status === "failed") { borderStyle = { borderColor: "rgba(239,68,68,0.3)" }; glowClass = "shadow-[0_0_15px_rgba(239,68,68,0.1)]"; }
  else if (hasMappingWarning) { borderStyle = { borderColor: "rgba(245,158,11,0.25)" }; }
  else if (selected) { borderStyle = { borderColor: `rgba(${accent},0.5)` }; glowClass = `shadow-[0_0_24px_rgba(${accent},0.1)]`; }

  // ── NodeToolbar ─────────────────────────────────────────────────────────
  const toolbar = (
    <NodeToolbar isVisible={selected || isHovered} position={Position.Top} offset={8}
      className="!bg-[#1a1a1e] !border !border-zinc-700/50 !rounded-xl !shadow-xl !shadow-black/50 !p-1 !flex !items-center !gap-0.5">
      <ToolbarButton icon={Play} label="Run workflow" onClick={handlePlay} />
      <ToolbarButton icon={Settings} label="Configure" onClick={handleOpenConfig} />
      {!isTrigger && <ToolbarButton icon={Copy} label="Duplicate" onClick={handleDuplicate} />}
      {!isTrigger && <ToolbarButton icon={Trash2} label="Delete" onClick={handleDelete} danger />}
    </NodeToolbar>
  );

  // ── TRIGGER NODE ────────────────────────────────────────────────────────
  if (isTrigger) {
    const cardW = 120, cardH = 120;
    const cardBorder = status === "running" ? "1.5px solid rgba(59,130,246,0.5)"
      : status === "completed" ? "1.5px solid rgba(16,185,129,0.4)"
      : status === "failed" ? "1.5px solid rgba(239,68,68,0.4)"
      : selected ? `1.5px solid rgba(${accent},0.45)` : "1px solid rgba(55,55,60,0.6)";
    const cardShadow = selected ? `0 0 20px rgba(${accent},0.08), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)` : "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

    return (
      <div className="relative group" style={{ width: cardW, height: cardH + 54 }}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {toolbar}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          onClick={handlePlay} className={`absolute flex flex-col items-center justify-center transition-all duration-300 ${isRunning ? "cursor-wait" : "cursor-pointer"}`}
          style={{ top: 0, left: 0, width: cardW, height: cardH, borderRadius: 24, background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)", border: cardBorder, boxShadow: cardShadow }}>
          <div className="absolute inset-0 rounded-[23px] pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)" }} />
          {badge}
          {status === "running" && <div className="absolute top-3 right-3"><Loader2 className="w-4 h-4 text-blue-400 animate-spin" /></div>}
          {(variantDef?.logoUrl || nodeDef.logoUrl) ? (
            <img src={variantDef?.logoUrl || nodeDef.logoUrl} alt={data.label} className="w-14 h-14 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={(variantDef?.imgFilter || nodeDef.imgFilter) ? { filter: variantDef?.imgFilter || nodeDef.imgFilter } : undefined} />
          ) : (
            <Icon className={`w-14 h-14 ${(variantDef || nodeDef).colorClass} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} strokeWidth={1} />
          )}
        </motion.div>
        <OutputHandle nodeId={id} hasConnection={hasOutputConnection} onAdd={handleAddNext} dotColor={dotColor} statusGlow={statusGlow} cardHeight={cardH} />
        <div className="absolute text-center select-none" style={{ left: 0, width: cardW, top: cardH + 8 }}>
          <span className="text-[13px] font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors duration-200 leading-snug block">{data.label}</span>
          <span className="text-[10px] font-semibold text-zinc-600 mt-0.5 block">Click to run</span>
        </div>
      </div>
    );
  }

  // ── AI AGENT NODE ── standard dark card, 3 slot dots on the bottom border ──
  if (isAgent) {
    const cardW = 180;
    const cardH = 120;
    const n = AGENT_BOTTOM_SLOTS.length;

    const cardBorder = status === "running" ? "1.5px solid rgba(59,130,246,0.5)"
      : status === "completed" ? "1.5px solid rgba(16,185,129,0.4)"
      : status === "failed" ? "1.5px solid rgba(239,68,68,0.4)"
      : selected ? `1.5px solid rgba(${accent},0.5)` : `1px solid rgba(${accent},0.2)`;
    const cardShadow = selected
      ? `0 0 20px rgba(${accent},0.12), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`
      : "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

    return (
      <div className="relative group" style={{ width: cardW, height: cardH + 48 }}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {toolbar}

        <Handle type="target" position={Position.Left} id="input"
          className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] transition-all duration-200 touch-none"
          style={{ top: cardH / 2 }} />

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          onClick={handleOpenConfig} className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
          style={{ width: cardW, height: cardH, borderRadius: shapeRadius, background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)", border: cardBorder, boxShadow: cardShadow }}>

          <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: shapeRadius - 1, background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)" }} />
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ borderRadius: shapeRadius - 1, background: `radial-gradient(circle at 50% 40%, rgba(${accent},0.06) 0%, transparent 70%)` }} />

          {badge}
          {status === "running" && <div className="absolute top-2 right-2"><Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" /></div>}

          <Bot className={`w-12 h-12 ${nodeDef.colorClass} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} strokeWidth={1} />
          <p className="text-[11px] font-bold text-zinc-300 mt-1.5 group-hover:text-zinc-100 transition-colors">{data.label || "AI Agent"}</p>

          {/* Slot labels above bottom edge */}
          <div className="absolute bottom-3 left-0 right-0 grid pointer-events-none select-none"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {AGENT_BOTTOM_SLOTS.map(slot => (
              <span key={slot.id} className="text-center text-[8px] font-medium text-zinc-600 tracking-wide">
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
  // Perfect circle, logo only, single top dot connecting back to agent slot
  if (data.isAgentComponent || isAgentSub) {
    const d = 72; // diameter — width === height, mathematically equal

    const cardBorder = selected
      ? `1.5px solid rgba(${accent},0.5)`
      : `1px solid rgba(${accent},0.2)`;
    const cardShadow = selected
      ? `0 0 20px rgba(${accent},0.12), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`
      : "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

    return (
      <div className="relative group" style={{ width: d, height: d }}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {toolbar}

        {/* Single top dot — connects back up to agent slot */}
        <Handle
          type="source"
          position={Position.Top}
          id="agent_out"
          className="!rounded-full !border-2 !border-[#1a1a1e] touch-none"
          style={{
            width: 10, height: 10,
            backgroundColor: hasAgentOutConnection ? "#10b981" : "#52525b",
            top: -5, left: "50%", transform: "translateX(-50%)",
          }}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          onClick={handleOpenConfig}
          className="relative flex items-center justify-center cursor-pointer transition-all duration-300"
          style={{
            width: d, height: d,
            borderRadius: 9999,
            background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)",
            border: cardBorder,
            boxShadow: cardShadow,
          }}
        >
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)" }} />
          <div className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `radial-gradient(circle at 50% 40%, rgba(${accent},0.07) 0%, transparent 70%)` }} />

          {badge}

          {nodeDef.logoUrl ? (
            <img
              src={nodeDef.logoUrl}
              alt={data.label}
              className="w-8 h-8 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined}
            />
          ) : (
            <Icon
              className={`w-8 h-8 ${nodeDef.colorClass} opacity-80 group-hover:opacity-100 transition-opacity duration-300`}
              strokeWidth={1.4}
            />
          )}
        </motion.div>
      </div>
    );
  }

  // ── STANDARD ACTION NODE ─────────────────────────────────────────────────
  const cardW = 120, cardH = 120;

  const cardBorder = status === "running" ? "1.5px solid rgba(59,130,246,0.5)"
    : status === "completed" ? "1.5px solid rgba(16,185,129,0.4)"
    : status === "failed" ? "1.5px solid rgba(239,68,68,0.4)"
    : selected ? `1.5px solid rgba(${accent},0.5)` : `1px solid rgba(${accent},0.2)`;
  const cardShadow = status === "running" ? "0 0 30px rgba(59,130,246,0.12), 0 12px 40px rgba(0,0,0,0.6)"
    : status === "completed" ? "0 0 24px rgba(16,185,129,0.1), 0 12px 40px rgba(0,0,0,0.6)"
    : status === "failed" ? "0 0 24px rgba(239,68,68,0.1), 0 12px 40px rgba(0,0,0,0.6)"
    : selected ? `0 0 20px rgba(${accent},0.12), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`
    : "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

  return (
    <div className="relative group" style={{ width: cardW, height: cardH + 48 }}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {toolbar}

      {/* Input handle */}
      <Handle type="target" position={Position.Left} id="input"
        className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] transition-all duration-200 touch-none"
        style={{ top: cardH / 2 }} />

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        onClick={handleOpenConfig} className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
        style={{ width: cardW, height: cardH, borderRadius: shapeRadius, background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)", border: cardBorder, boxShadow: cardShadow }}>
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: shapeRadius - 1, background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)" }} />
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ borderRadius: shapeRadius - 1, background: `radial-gradient(circle at 50% 40%, rgba(${accent},0.06) 0%, transparent 70%)` }} />
        {badge}
        {status === "running" && <div className="absolute top-2 right-2"><Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" /></div>}
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
          <Icon className={`w-12 h-12 ${nodeDef.colorClass} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} strokeWidth={1} />
        )}
      </motion.div>

      {data.backendType === "condition" ? (
        <ConditionOutputHandles cardHeight={cardH} />
      ) : (
        <OutputHandle nodeId={id} hasConnection={hasOutputConnection} onAdd={handleAddNext} dotColor={dotColor} statusGlow={statusGlow} cardHeight={cardH} />
      )}

      <div className="absolute text-center select-none" style={{ left: 0, width: cardW, top: cardH + 8 }}>
        <span className="text-[12px] font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors duration-200 leading-snug block truncate px-1">{data.label}</span>
        {configHint && <span className="text-[9px] font-medium text-zinc-600 mt-0.5 block truncate px-1 font-mono">{configHint}</span>}
      </div>
    </div>
  );
}
