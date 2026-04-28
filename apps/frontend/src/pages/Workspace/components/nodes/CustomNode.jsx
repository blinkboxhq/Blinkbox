import { useState, useCallback } from "react";
import { Handle, Position, NodeToolbar, useReactFlow } from "@xyflow/react";
import { Check, AlertTriangle, Settings2, Loader2, Plus, X, Search, Brain, Database, MousePointer2, Play, Settings, Copy, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import { NodeRegistry } from "../../nodeRegistry";
import { TRIGGER_VARIANTS } from "../../triggerVariants";
import useWorkspaceStore from "../../../../store/workspaceStore";

// ── AI Agent Left-Side Handles ───────────────────────────────────────────────
const AI_AGENT_LEFT_HANDLES = [
  {
    id: "chat_model",
    label: "Model",
    color: "#6366f1",
    top: "30%",
    allowedTypes: [
      "openai", "anthropic", "gemini", "deepseek",
      "openrouter", "together", "perplexity", "xai", "fireworks",
      "cerebras", "ollama", "novita", "deepinfra", "hyperbolic",
    ],
  },
  {
    id: "memory",
    label: "Memory",
    color: "#a855f7",
    top: "52%",
    allowedTypes: [
      "window_buffer_memory", "redis_memory", "postgres_memory",
      "vector_memory", "mem0",
    ],
  },
  {
    id: "tools",
    label: "Tools",
    color: "#f97316",
    top: "74%",
    allowedTypes: [
      "http_request", "web_scraper", "web_search", "code",
      "slack", "discord", "telegram", "whatsapp",
      "stripe", "airtable",
    ],
  },
];

// ── Node Picker Popover ──────────────────────────────────────────────────────
function NodePickerPopover({ handle, parentNodeId, onClose }) {
  const addNode = useWorkspaceStore((s) => s.addNode);
  const onConnect = useWorkspaceStore((s) => s.onConnect);
  const { getNode } = useReactFlow();
  const [search, setSearch] = useState("");

  const entries = Object.entries(NodeRegistry).filter(([key, def]) => {
    if (def.category === "trigger") return false;
    if (handle.allowedTypes.length > 0 && !handle.allowedTypes.includes(key)) return false;
    if (search && !def.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSelect = useCallback((nodeKey) => {
    const parentNode = getNode(parentNodeId);
    if (!parentNode) return;

    const newId = `${nodeKey}-${crypto.randomUUID()}`;
    const nodeDef = NodeRegistry[nodeKey];

    addNode({
      id: newId,
      type: "custom",
      position: {
        x: parentNode.position.x - 280,
        y: parentNode.position.y + 60,
      },
      data: {
        backendType: nodeKey,
        label: nodeDef?.label || nodeKey,
        type: "action",
        config: {},
      },
    });

    setTimeout(() => {
      onConnect({
        source: newId,
        sourceHandle: "output",
        target: parentNodeId,
        targetHandle: handle.id,
      });
    }, 50);

    onClose();
  }, [parentNodeId, handle, addNode, onConnect, getNode, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 6, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute right-full top-1/2 -translate-y-1/2 mr-3 z-50
        w-52 max-h-80 overflow-hidden
        bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/60"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Add {handle.label}
        </span>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {handle.allowedTypes.length > 5 && (
        <div className="px-2.5 py-1.5 border-b border-zinc-800/40">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-md">
            <Search className="w-3 h-3 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-[10px] text-zinc-300 outline-none placeholder:text-zinc-600"
              autoFocus
            />
          </div>
        </div>
      )}

      <div className="py-1 max-h-60 overflow-y-auto overscroll-contain">
        {entries.length === 0 ? (
          <p className="px-3 py-3 text-[10px] text-zinc-600 text-center">No matching nodes</p>
        ) : (
          entries.map(([key, def]) => {
            const Icon = def.icon;
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-zinc-800/60 transition-colors text-left group"
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center bg-zinc-800/80 ${def.colorClass} shrink-0 group-hover:bg-zinc-700/80 transition-colors`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 truncate transition-colors">{def.label}</span>
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ── Single Left-Side Handle (Handle = Button when disconnected) ──────────────
function AgentLeftHandle({ handle, parentNodeId, hasConnection }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="absolute left-0 z-10" style={{ top: handle.top, transform: "translateY(-50%)" }}>
      <Handle
        type="target"
        position={Position.Left}
        id={handle.id}
        className={`!w-3 !h-3 !rounded-full !border-2 !border-zinc-900 transition-all duration-200 touch-none ${
          hasConnection ? "" : "!cursor-pointer"
        }`}
        style={{
          backgroundColor: hasConnection ? "#10b981" : handle.color,
          boxShadow: hasConnection ? "0 0 6px rgba(16,185,129,0.3)" : "none",
        }}
      />

      {!hasConnection && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPickerOpen(!pickerOpen);
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[1px] w-3 h-3 rounded-full flex items-center justify-center z-20 group"
          title={`Add ${handle.label}`}
        >
          <Plus className="w-2 h-2 text-white opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
        </button>
      )}

      <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
        <span
          className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap select-none opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ color: handle.color }}
        >
          {handle.label}
        </span>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <NodePickerPopover
            handle={handle}
            parentNodeId={parentNodeId}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Config Hint ──────────────────────────────────────────────────────────────

function getConfigHint(data, edges, nodeId) {
  const c = data.config || {};
  if (data.backendType === "http_request") {
    if (c.method && c.url) return `${c.method} ${c.url}`.slice(0, 40);
    if (c.url) return c.url.slice(0, 40);
  }
  if (data.backendType === "delay" && c.seconds) return `Wait ${c.seconds}s`;
  if (data.backendType === "code" && c.code) return `${c.code}`.slice(0, 40);
  if (data.backendType === "loop" && c.arrayPath) return `each ${c.arrayPath}`;
  if (data.backendType === "web_scraper" && c.url) return c.url.slice(0, 40);
  if (data.backendType === "ai_agent") {
    if (edges && nodeId) {
      const modelEdge = edges.find((e) => e.target === nodeId && e.targetHandle === "chat_model");
      if (modelEdge) {
        const nodes = useWorkspaceStore.getState().nodes;
        const modelNode = nodes.find((n) => n.id === modelEdge.source);
        if (modelNode?.data?.config?.model) return modelNode.data.config.model;
        if (modelNode?.data?.label) return modelNode.data.label;
      }
    }
    if (c.agentType) return c.agentType.replace(/_/g, " ");
    return "tools agent";
  }
  if (data.backendType === "webhook") {
    const v = c.triggerVariant;
    if (v === "form") return c.expectedFields?.length ? `${c.expectedFields.length} fields` : "form";
    if (v === "chat") return c.systemPrompt ? c.systemPrompt.slice(0, 28) : "chat endpoint";
    if (v === "sub_workflow") return "sub-workflow";
    if (v === "app_event") return c.expectedEvents || "app events";
    return "webhook";
  }
  if (data.backendType === "cron_trigger" && c.expression) return c.expression;
  if (data.backendType === "logic_router" && c.field) return `if ${c.field}`;
  if (data.backendType === "slack" && c.message) return c.message.slice(0, 40);
  if (data.backendType === "discord" && c.message) return c.message.slice(0, 40);
  if (data.backendType === "stripe" && c.action) return c.action.replace("_", " ");
  if (data.backendType === "openai" && c.model) return c.model;
  if (data.backendType === "anthropic" && c.model) return c.model;
  if (data.backendType === "gemini" && c.model) return c.model;
  if (data.backendType === "deepseek" && c.model) return c.model;
  if (data.backendType === "openrouter" && c.model) return c.model;
  if (data.backendType === "together" && c.model) return c.model;
  if (data.backendType === "perplexity" && c.model) return c.model;
  if (data.backendType === "xai" && c.model) return c.model;
  if (data.backendType === "fireworks" && c.model) return c.model;
  if (data.backendType === "cerebras" && c.model) return c.model;
  if (data.backendType === "ollama" && c.model) return c.model;
  if (data.backendType === "novita" && c.model) return c.model;
  if (data.backendType === "deepinfra" && c.model) return c.model;
  if (data.backendType === "hyperbolic" && c.model) return c.model;
  if (data.backendType === "telegram" && c.text) return c.text.slice(0, 40);
  if (data.backendType === "whatsapp" && c.to) return `→ ${c.to}`;
  if (data.backendType === "airtable" && c.tableName) return `${c.action || "create"} · ${c.tableName}`;
  if (data.backendType === "web_search" && c.query) return c.query.slice(0, 40);
  return null;
}

// ── Node Shape Helpers ──────────────────────────────────────────────────────

const MEMORY_TYPES = ["window_buffer_memory", "redis_memory", "postgres_memory", "vector_memory", "mem0"];
const AI_TYPES = [
  "openai", "anthropic", "gemini", "deepseek", "openrouter", "together",
  "perplexity", "xai", "fireworks", "cerebras", "ollama", "novita",
  "deepinfra", "hyperbolic", "ai_agent",
];

function isMemoryNode(backendType) { return MEMORY_TYPES.includes(backendType); }
function isAINode(backendType) { return AI_TYPES.includes(backendType); }

// ── Node Icon ────────────────────────────────────────────────────────────────
function NodeIcon({ nodeDef, size = "md" }) {
  const Icon = nodeDef.icon;
  const sizeMap = {
    sm: { icon: "w-4 h-4", img: "w-4 h-4" },
    md: { icon: "w-5 h-5", img: "w-5 h-5" },
    lg: { icon: "w-6 h-6", img: "w-6 h-6" },
  };
  const s = sizeMap[size];

  if (nodeDef.logoUrl) {
    return (
      <img
        src={nodeDef.logoUrl}
        alt={nodeDef.label}
        className={`${s.img} object-contain shrink-0`}
        style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined}
      />
    );
  }

  return <Icon className={`${s.icon} shrink-0 ${nodeDef.colorClass}`} strokeWidth={1.75} />;
}

// ── Toolbar button helper ────────────────────────────────────────────────────
function ToolbarButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
        ${danger
          ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60"
        }`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
    </button>
  );
}

// ── Output Handle + Plus Button (unified) ────────────────────────────────────
// The ReactFlow Handle sits on the node's right edge (standard position).
// When disconnected: a Plus circle overlays on top — click = open picker,
//   dragging the plus circle naturally hits the Handle beneath it.
// When connected: only the dot shows (plus hidden).
function OutputHandle({ nodeId, hasConnection, onAdd, dotColor = "#52525b", statusGlow = "none", cardHeight }) {
  return (
    <>
      {/* ReactFlow handle — positioned by ReactFlow on the right edge */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] touch-none"
        style={{
          backgroundColor: dotColor,
          boxShadow: statusGlow,
          // When disconnected, hide the dot visually — the Plus button covers it
          opacity: hasConnection ? 1 : 0,
        }}
      />

      {/* Plus button — rendered at same position as the handle when disconnected */}
      {!hasConnection && (
        <div
          className="absolute z-10 nodrag"
          style={
            cardHeight
              ? { right: -16, top: cardHeight / 2, transform: "translateY(-50%)" }
              : { right: -16, top: "50%", transform: "translateY(-50%)" }
          }
        >
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(e); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-full bg-zinc-800 border-[2.5px] border-zinc-600
              flex items-center justify-center
              hover:bg-zinc-700 hover:border-zinc-400 active:scale-95
              transition-all duration-150 shadow-lg shadow-black/50 group/plus"
            title="Add next step"
          >
            <Plus className="w-4 h-4 text-zinc-300 group-hover/plus:text-white" strokeWidth={3} />
          </button>
        </div>
      )}
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
  const variantDef = (data.type === "trigger" && data.config?.triggerVariant)
    ? TRIGGER_VARIANTS[data.config.triggerVariant]
    : null;
  const Icon = (variantDef || nodeDef).icon;
  const accent = (variantDef?.accentColor || nodeDef.accentColor) || "161,161,170";

  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore((s) => s.getNodeStatus);
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const runEngine = useWorkspaceStore((s) => s.runEngine);
  const edges = useWorkspaceStore((s) => s.edges);
  const setAddNodeSource = useWorkspaceStore((s) => s.setAddNodeSource);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const duplicateNode = useWorkspaceStore((s) => s.duplicateNode);
  const status = isExecutionLive ? getNodeStatus(id) : null;
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";
  const isAgent = data.backendType === "ai_agent";
  const isMemory = isMemoryNode(data.backendType);
  const isAI = isAINode(data.backendType);
  const configHint = getConfigHint(data, edges, id);
  const isConfigured = !!(data.config && Object.keys(data.config).length > 0);

  const getHandleConnected = (handleId) =>
    edges.some((e) => e.target === id && e.targetHandle === handleId);

  const hasOutputConnection = edges.some((e) => e.source === id && e.sourceHandle === "output");

  // ── Toolbar handlers ──────────────────────────────────────────────────────
  const handlePlay = (e) => { e.stopPropagation(); if (!isRunning && automationId) runEngine(automationId); };
  const handleAddNext = (e) => { e.stopPropagation(); if (setAddNodeSource) setAddNodeSource(id); };
  const handleOpenConfig = (e) => { e.stopPropagation(); setSelectedNodeId(id); };
  const handleDuplicate = (e) => { e.stopPropagation(); if (duplicateNode) duplicateNode(id); };
  const handleDelete = (e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); };

  // ── Status badge ──────────────────────────────────────────────────────────
  let badge = null;
  if (status === "completed") {
    badge = (
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-20 shadow-lg shadow-emerald-500/30"
      >
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </motion.div>
    );
  } else if (status === "failed") {
    badge = (
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center z-20 shadow-lg shadow-red-500/30"
      >
        <AlertTriangle className="w-3 h-3 text-white" strokeWidth={3} />
      </motion.div>
    );
  }

  // ── Status dot color + glow ───────────────────────────────────────────────
  const dotColor = status === "completed" ? "#10b981"
    : status === "running" ? "#3b82f6"
    : status === "failed" ? "#ef4444"
    : "#52525b";

  const statusGlow = status === "running" ? "0 0 8px rgba(59,130,246,0.5)"
    : status === "completed" ? "0 0 8px rgba(16,185,129,0.4)"
    : "none";

  // ── Border/glow from status ───────────────────────────────────────────────
  let borderStyle = {};
  let glowClass = "";
  if (status === "running") { borderStyle = { borderColor: "rgba(59,130,246,0.4)" }; glowClass = "shadow-[0_0_20px_rgba(59,130,246,0.15)]"; }
  else if (status === "completed") { borderStyle = { borderColor: "rgba(16,185,129,0.3)" }; glowClass = "shadow-[0_0_15px_rgba(16,185,129,0.1)]"; }
  else if (status === "failed") { borderStyle = { borderColor: "rgba(239,68,68,0.3)" }; glowClass = "shadow-[0_0_15px_rgba(239,68,68,0.1)]"; }
  else if (hasMappingWarning) { borderStyle = { borderColor: "rgba(245,158,11,0.25)" }; }
  else if (selected) { borderStyle = { borderColor: `rgba(${accent},0.5)` }; glowClass = `shadow-[0_0_24px_rgba(${accent},0.1)]`; }

  const agentHandleStatus = isAgent
    ? AI_AGENT_LEFT_HANDLES.map((h) => ({ ...h, connected: getHandleConnected(h.id) }))
    : [];

  // ── NodeToolbar ───────────────────────────────────────────────────────────
  const toolbar = (
    <NodeToolbar
      isVisible={selected || isHovered}
      position={Position.Top}
      offset={8}
      className="!bg-[#1a1a1e] !border !border-zinc-700/50 !rounded-xl !shadow-xl !shadow-black/50 !p-1 !flex !items-center !gap-0.5"
    >
      <ToolbarButton icon={Play} label="Run workflow" onClick={handlePlay} />
      <ToolbarButton icon={Settings} label="Configure" onClick={handleOpenConfig} />
      {!isTrigger && <ToolbarButton icon={Copy} label="Duplicate" onClick={handleDuplicate} />}
      {!isTrigger && <ToolbarButton icon={Trash2} label="Delete" onClick={handleDelete} danger />}
    </NodeToolbar>
  );

  // ── TRIGGER NODE ──────────────────────────────────────────────────────────
  if (isTrigger) {
    const cardW = 140;
    const cardH = 140;

    const cardBorder = status === "running" ? "1.5px solid rgba(59,130,246,0.5)"
      : status === "completed" ? "1.5px solid rgba(16,185,129,0.4)"
      : status === "failed" ? "1.5px solid rgba(239,68,68,0.4)"
      : selected ? `1.5px solid rgba(${accent},0.45)`
      : "1px solid rgba(55,55,60,0.6)";

    const cardShadow = status === "running" ? "0 0 30px rgba(59,130,246,0.12), 0 12px 40px rgba(0,0,0,0.6)"
      : status === "completed" ? "0 0 24px rgba(16,185,129,0.1), 0 12px 40px rgba(0,0,0,0.6)"
      : status === "failed" ? "0 0 24px rgba(239,68,68,0.1), 0 12px 40px rgba(0,0,0,0.6)"
      : selected ? `0 0 20px rgba(${accent},0.08), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`
      : "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

    return (
      <div
        className="relative group"
        style={{ width: cardW, height: cardH + 54 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {toolbar}

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          onClick={handlePlay}
          className={`relative flex flex-col items-center justify-center transition-all duration-300 ${isRunning ? "cursor-wait" : "cursor-pointer"}`}
          style={{
            width: cardW,
            height: cardH,
            borderRadius: 24,
            background: "linear-gradient(145deg, #232328 0%, #1C1C20 50%, #19191D 100%)",
            border: cardBorder,
            boxShadow: cardShadow,
          }}
        >
          <div className="absolute inset-0 rounded-[23px] pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)" }} />
          <div className="absolute inset-0 rounded-[23px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 40%, rgba(161,161,170,0.04) 0%, transparent 70%)" }} />

          {badge}

          {status === "running" && (
            <div className="absolute top-3 right-3">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
          )}

          {(variantDef?.logoUrl || nodeDef.logoUrl) ? (
            <img
              src={variantDef?.logoUrl || nodeDef.logoUrl}
              alt={data.label}
              className="w-14 h-14 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              style={(variantDef?.imgFilter || nodeDef.imgFilter) ? { filter: variantDef?.imgFilter || nodeDef.imgFilter } : undefined}
            />
          ) : (
            <Icon
              className={`w-14 h-14 ${(variantDef || nodeDef).colorClass} opacity-80 group-hover:opacity-100 transition-opacity duration-300`}
              strokeWidth={1}
            />
          )}

        </motion.div>

        {/* Output handle + plus — outside the card so nothing clips the plus button */}
        <OutputHandle
          nodeId={id}
          hasConnection={hasOutputConnection}
          onAdd={handleAddNext}
          dotColor={dotColor}
          statusGlow={statusGlow}
          cardHeight={cardH}
        />

        <div className="absolute text-center select-none" style={{ left: 0, width: cardW, top: cardH + 8 }}>
          <span className="text-[13px] font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors duration-200 leading-snug block">
            {data.label}
          </span>
          <span className="text-[10px] font-semibold text-zinc-600 mt-0.5 block">
            Click to run
          </span>
        </div>
      </div>
    );
  }

  // ── ACTION NODE ───────────────────────────────────────────────────────────
  const isGlassmorphic = isAI || isMemory;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {toolbar}

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className={`relative border min-w-[240px] max-w-[280px] transition-all duration-300 overflow-visible
          ${isGlassmorphic
            ? "rounded-2xl bg-zinc-900/70 backdrop-blur-xl border-zinc-700/20"
            : "rounded-2xl bg-zinc-900/95 border-zinc-800/40"
          }
          ${glowClass}
        `}
        style={{
          ...borderStyle,
          ...(isGlassmorphic ? {
            boxShadow: `${glowClass ? "" : `0 0 24px rgba(${accent},0.08), 0 0 8px rgba(${accent},0.04), `}inset 0 1px 0 rgba(255,255,255,0.04)`,
          } : {
            boxShadow: glowClass ? undefined : "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
          }),
        }}
      >
        {badge}

        {isGlassmorphic && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: `radial-gradient(ellipse at 30% -20%, rgba(${accent},0.08) 0%, transparent 60%)` }} />
        )}

        {isGlassmorphic && (
          <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ backgroundColor: `rgba(${accent},0.4)`, boxShadow: `0 0 8px rgba(${accent},0.3)` }} />
        )}

        {!isGlassmorphic && (
          <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ backgroundColor: `rgba(${accent},0.35)` }} />
        )}

        {/* Input handle — large dot, bold */}
        {!isTrigger && (
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="!w-5 !h-5 !rounded-full !border-[3px] !border-[#1a1a1e] !bg-[#52525b] transition-all duration-200 touch-none"
            style={isAgent ? { top: "12%" } : {}}
          />
        )}

        {isAgent && AI_AGENT_LEFT_HANDLES.map((h) => (
          <AgentLeftHandle key={h.id} handle={h} parentNodeId={id} hasConnection={getHandleConnected(h.id)} />
        ))}

        {/* Header */}
        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <NodeIcon nodeDef={nodeDef} size="md" />

          <div className="flex flex-col overflow-hidden flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-zinc-100 tracking-tight truncate">
                {data.label}
              </span>
              {isMemory && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                  <Database className="w-2.5 h-2.5 text-purple-400" />
                  <span className="text-[7px] font-bold text-purple-400 uppercase tracking-wider">Mem</span>
                </div>
              )}
              {hasMappingWarning && (
                <div className="relative group/warn">
                  <AlertTriangle className="w-3 h-3 text-amber-500/70 shrink-0 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg opacity-0 group-hover/warn:opacity-100 transition-opacity pointer-events-none z-50 w-52">
                    {warnings.map((w, i) => (
                      <p key={i} className="text-[10px] text-amber-400/80 leading-relaxed">{w}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {configHint && (
              <span className="text-[10px] font-medium text-zinc-500 truncate font-mono mt-0.5">{configHint}</span>
            )}
          </div>

          <div className="shrink-0">
            {status === "running" && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
            )}
            {status === "completed" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />}
            {status === "failed" && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />}
          </div>
        </div>

        {/* Agent footer */}
        {isAgent && (
          <div className="flex items-center gap-3 px-4 py-2 border-t border-zinc-800/30 bg-zinc-950/30">
            {agentHandleStatus.map((h) => (
              <div key={h.id} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full transition-colors" style={{ backgroundColor: h.connected ? "#10b981" : "#3f3f46" }} />
                <span className={`text-[8px] font-bold uppercase tracking-wider ${h.connected ? "text-zinc-500" : "text-zinc-700"}`}>{h.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Standard footer */}
        {!isAgent && (
          <div className={`flex items-center justify-between px-4 py-2 border-t bg-zinc-950/30 ${isGlassmorphic ? "border-zinc-700/15" : "border-zinc-800/30"}`}>
            <span className="text-[9px] font-bold text-zinc-600 font-mono truncate max-w-[120px]">
              {data.backendType}
            </span>
            <div className="flex items-center gap-1.5">
              {isConfigured ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[8px] font-bold text-emerald-400/80 uppercase tracking-wider">Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-zinc-800/50">
                  <Settings2 className="w-2.5 h-2.5 text-zinc-600" />
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Setup</span>
                </div>
              )}
            </div>
          </div>
        )}

      </motion.div>

      {/* Output handle + plus button — outside the card */}
      <OutputHandle
        nodeId={id}
        hasConnection={hasOutputConnection}
        onAdd={handleAddNext}
        dotColor={dotColor}
        statusGlow={statusGlow}
      />
    </div>
  );
}
