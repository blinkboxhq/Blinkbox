import { useState, useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Check, AlertTriangle, Settings2, Play, Loader2, Plus, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import { NodeRegistry } from "../../nodeRegistry";
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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Add {handle.label}
        </span>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Search */}
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

      {/* List */}
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
      {/* The React Flow connectable handle */}
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

      {/* Clickable + overlay when disconnected */}
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

      {/* Label tooltip on hover */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
        <span
          className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap select-none opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ color: handle.color }}
        >
          {handle.label}
        </span>
      </div>

      {/* Picker popover */}
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
    // Show connected model name if available
    if (edges && nodeId) {
      const modelEdge = edges.find((e) => e.target === nodeId && e.targetHandle === "chat_model");
      if (modelEdge) {
        const nodes = useWorkspaceStore.getState().nodes;
        const modelNode = nodes.find((n) => n.id === modelEdge.source);
        if (modelNode?.data?.config?.model) {
          return modelNode.data.config.model;
        }
        if (modelNode?.data?.label) {
          return modelNode.data.label;
        }
      }
    }
    if (c.agentType) return c.agentType.replace(/_/g, " ");
    return "tools agent";
  }
  if (data.backendType === "webhook" && c.path) return `/${c.path}`;
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

// ═════════════════════════════════════════════════════════════════════════════
// MAIN NODE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function CustomNode({ id, data, selected }) {
  const { id: automationId } = useParams();
  const nodeDef = NodeRegistry[data.backendType] || NodeRegistry.manual;
  const Icon = nodeDef.icon;
  const accent = nodeDef.accentColor || "161,161,170";

  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore((s) => s.getNodeStatus);
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const runEngine = useWorkspaceStore((s) => s.runEngine);
  const edges = useWorkspaceStore((s) => s.edges);
  const status = isExecutionLive ? getNodeStatus(id) : null;
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";
  const isAgent = data.backendType === "ai_agent";
  const configHint = getConfigHint(data, edges, id);
  const isConfigured = !!(data.config && Object.keys(data.config).length > 0);

  const getHandleConnected = (handleId) =>
    edges.some((e) => e.target === id && e.targetHandle === handleId);

  let borderClass = "border-zinc-800/60";
  let badge = null;

  if (status === "running") {
    borderClass = "border-blue-500/30";
  } else if (status === "completed") {
    borderClass = "border-emerald-500/25";
    badge = (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center z-20"
      >
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </motion.div>
    );
  } else if (status === "failed") {
    borderClass = "border-red-500/25";
    badge = (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center z-20"
      >
        <AlertTriangle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </motion.div>
    );
  }

  if (hasMappingWarning && !status) borderClass = "border-amber-500/25";
  if (selected) borderClass = "border-zinc-600";

  const handlePlay = (e) => {
    e.stopPropagation();
    if (!isRunning && automationId) runEngine(automationId);
  };

  // Agent connection status dots for footer
  const agentHandleStatus = isAgent
    ? AI_AGENT_LEFT_HANDLES.map((h) => ({
        ...h,
        connected: getHandleConnected(h.id),
      }))
    : [];

  return (
    <div className="relative group">
      {/* ── Main Card ───────────────────────────────────────────────────── */}
      <div
        className={`relative border ${borderClass} rounded-xl min-w-[240px] bg-zinc-900 transition-colors duration-150 overflow-hidden`}
      >
        {badge}

        {/* Accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-xl"
          style={{ backgroundColor: `rgba(${accent},0.4)` }}
        />

        {/* Input handle */}
        {!isTrigger && (
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 !rounded-full hover:!bg-zinc-400 transition-colors touch-none"
            style={isAgent ? { top: "12%" } : undefined}
          />
        )}

        {/* Agent left-side dependency handles */}
        {isAgent && AI_AGENT_LEFT_HANDLES.map((h) => (
          <AgentLeftHandle
            key={h.id}
            handle={h}
            parentNodeId={id}
            hasConnection={getHandleConnected(h.id)}
          />
        ))}

        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${nodeDef.colorClass}`}
            style={{ backgroundColor: `rgba(${accent},0.12)` }}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>

          <div className="flex flex-col overflow-hidden flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium text-zinc-200 tracking-tight truncate">
                {data.label}
              </span>
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
              <span className="text-[10px] text-zinc-500 truncate font-mono">{configHint}</span>
            )}
          </div>

          {/* Status indicator */}
          <div className="shrink-0">
            {status === "running" && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}
            {status === "completed" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
            {status === "failed" && <div className="w-2 h-2 rounded-full bg-red-500" />}
          </div>
        </div>

        {/* Agent connection indicators in footer */}
        {isAgent && (
          <div className="flex items-center gap-3 px-3.5 py-1.5 border-t border-zinc-800/40 bg-zinc-950/30">
            {agentHandleStatus.map((h) => (
              <div key={h.id} className="flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: h.connected ? "#10b981" : "#3f3f46" }}
                />
                <span className={`text-[8px] uppercase tracking-wider ${h.connected ? "text-zinc-500" : "text-zinc-700"}`}>
                  {h.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer (non-agent) */}
        {!isAgent && (
          <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-zinc-800/40 bg-zinc-950/30">
            <span className="text-[9px] text-zinc-700 font-mono truncate max-w-[120px]">
              {data.backendType}
            </span>
            <div className="flex items-center gap-1.5">
              {isTrigger ? (
                <button
                  onClick={handlePlay}
                  disabled={isRunning}
                  className={`group flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${
                    isRunning
                      ? "bg-blue-500/10 text-blue-400 cursor-not-allowed"
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-95"
                  }`}
                >
                  {isRunning ? (
                    <><Loader2 className="w-2.5 h-2.5 animate-spin" />Run</>
                  ) : (
                    <><Play className="w-2.5 h-2.5 fill-current" />Run</>
                  )}
                </button>
              ) : isConfigured ? (
                <span className="text-[8px] text-emerald-600/80 uppercase tracking-wider">Ready</span>
              ) : (
                <span className="flex items-center gap-0.5 text-[8px] text-zinc-600 uppercase tracking-wider">
                  <Settings2 className="w-2.5 h-2.5" />Setup
                </span>
              )}
            </div>
          </div>
        )}

        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 !rounded-full hover:!bg-zinc-400 transition-colors touch-none"
        />
      </div>
    </div>
  );
}
