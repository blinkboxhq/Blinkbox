import { getBezierPath, EdgeLabelRenderer, useReactFlow, MarkerType } from "@xyflow/react";
import { useState, useRef, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";

// Number of output variables a node exposes downstream — the same field list the
// variable drawer shows (DEFAULT_SCHEMAS is that drawer's source of truth). Count
// top-level keys, matching what the drawer surfaces at the node's root. Falls back
// to 1 for node types with no declared schema (a single passthrough object).
function declaredOutputCount(backendType) {
  const schema = DEFAULT_SCHEMAS[backendType];
  if (!schema) return 1;
  return Object.keys(schema).filter((k) => !k.startsWith("_")).length || 1;
}

// ── Arrow marker ID (matches Canvas defaultEdgeOptions) ─────────────────────
export const EDGE_ARROW_ID = "blinkbox-arrow";

const AGENT_TYPES = new Set(["agent_llm", "agent_memory", "agent_tool", "ai_agent"]);
const AGENT_SUB_TYPES = new Set(["agent_llm", "agent_memory", "agent_tool"]);
const AGENT_HANDLE = "agent_out";

export default function ConfigurableEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
  markerEnd,
  sourceHandleId,
  targetHandleId,
}) {
  const [hovered, setHovered] = useState(false);
  const hideTimer = useRef(null);
  const show = useCallback(() => { clearTimeout(hideTimer.current); setHovered(true); }, []);
  const hide = useCallback(() => { hideTimer.current = setTimeout(() => setHovered(false), 80); }, []);
  const setInsertOnEdge = useWorkspaceStore((s) => s.setInsertOnEdge);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const srcType = nodes.find(n => n.id === source)?.data?.backendType;
  const tgtType = nodes.find(n => n.id === target)?.data?.backendType;
  // Slot edges: sub-node → ai_agent only (agent_out handle or sub-node source type)
  const isSlotEdge = sourceHandleId === AGENT_HANDLE
    || ["llm", "chat_model", "memory", "integration", "tools"].includes(targetHandleId)
    || AGENT_SUB_TYPES.has(srcType)
    || srcType?.startsWith("agent_")
    || srcType?.startsWith("agent_memory_")
    || srcType?.startsWith("agent_integration_");
  // Agent edge (broader): any edge touching an agent node — suppresses insert button
  const isAgentEdge = isSlotEdge
    || AGENT_TYPES.has(srcType)
    || AGENT_TYPES.has(tgtType)
    || tgtType?.startsWith("agent_memory_")
    || tgtType?.startsWith("agent_integration_");
  const nodeStatuses = useWorkspaceStore((s) => s.nodeStatuses);
  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const sourceOutput = useWorkspaceStore((s) => s.lastRunOutputs?.[source]);
  const { deleteElements } = useReactFlow();

  // Output-variable count shown on the thread — the number of variables this node
  // exposes downstream, matching the variable drawer. Use the node's declared output
  // schema (drawer's source of truth); after a run, prefer the live key-count only
  // when the real output reveals MORE fields (dynamic nodes like set_fields).
  const outputCount = (() => {
    const declared = declaredOutputCount(srcType);
    const out = sourceOutput?.__loopFanOut ? (sourceOutput.items?.[0] ?? sourceOutput.__loopItems?.[0]) : sourceOutput;
    if (out == null || typeof out !== "object" || Array.isArray(out)) return declared;
    const liveKeys = Object.keys(out).filter((k) => !k.startsWith("__")).length;
    return Math.max(declared, liveKeys);
  })();

  // Soft cursive curvature — gentle bend that avoids going under nodes
  const dx = Math.abs(targetX - sourceX);
  const curvature = isSlotEdge ? Math.max(0.12, Math.min(0.28, dx / 1200)) : Math.max(0.25, Math.min(0.5, dx / 800));

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });

  // ── Status-driven styling ────────────────────────────────────────────────────
  const sourceStatus = isExecutionLive ? nodeStatuses[source] : null;
  const targetStatus = isExecutionLive ? nodeStatuses[target] : null;
  const isRunning = targetStatus === "running";
  const isFailed = targetStatus === "failed";

  let stroke = isSlotEdge
    ? (hovered ? "#a1a1aa" : "#71717a")
    : (hovered ? "#71717a" : "#3f3f46");
  let strokeWidth = isSlotEdge ? 2 : 3;
  let strokeDasharray = isSlotEdge ? "5 7" : "none";
  let animation = "none";
  let filter = "none";

  if (isRunning) {
    stroke = "#3b82f6";
    strokeDasharray = "8 5";
    animation = "edgeFlow 0.4s linear infinite";
    filter = "drop-shadow(0 0 5px rgba(59,130,246,0.55))";
  } else if (isFailed) {
    stroke = "#ef4444";
    filter = "drop-shadow(0 0 3px rgba(239,68,68,0.35))";
  } else if (selected) {
    stroke = "#52525b";
  }

  const handleInsert = (e) => {
    e.stopPropagation();
    setInsertOnEdge(id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      {/* Glow underlay for running edges */}
      {isRunning && (
        <path d={edgePath} strokeWidth={12} stroke="#3b82f6" fill="none" opacity={0.1} style={{ filter: "blur(6px)" }} />
      )}

      {/* Wide invisible hit area for hover detection */}
      <path
        d={edgePath}
        strokeWidth={28}
        stroke="transparent"
        fill="none"
        className="react-flow__edge-interaction"
        onMouseEnter={show}
        onMouseLeave={hide}
      />

      {/* Main visible edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={strokeWidth}
        stroke={stroke}
        strokeLinecap="round"
        fill="none"
        markerEnd={isSlotEdge && !isRunning ? undefined : markerEnd}
        style={{
          ...style,
          strokeDasharray,
          animation,
          filter,
          transition: "stroke 0.3s ease, stroke-width 0.2s ease, filter 0.3s ease",
        }}
      />

      {/* Traveling dot for running edges */}
      {isRunning && (
        <>
          <circle r="3.5" fill="#3b82f6" filter="drop-shadow(0 0 6px rgba(59,130,246,1))">
            <animateMotion dur="0.7s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="2" fill="white" opacity="0.9">
            <animateMotion dur="0.7s" repeatCount="indefinite" path={edgePath} />
          </circle>
        </>
      )}

      {/* ── Midpoint buttons (+ and trash, shown on hover) ─────────────────── */}
      <EdgeLabelRenderer>
        {/* Output count — sits at midpoint, yields to the hover buttons */}
        {!isAgentEdge && outputCount != null && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
              background: "radial-gradient(ellipse 60% 55% at center, #0a0a0b 55%, transparent 100%)",
            }}
            className={`nodrag nopan flex items-center gap-1 text-[11px] font-medium transition-opacity duration-75 ${hovered ? "opacity-0" : "opacity-100"}`}
            title={`${outputCount} output${outputCount === 1 ? "" : "s"} available downstream`}
          >
            <span className="text-zinc-300">{outputCount}</span>
            <span className="text-zinc-500">output{outputCount === 1 ? "" : "s"}</span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div
            className={`edge-action-buttons flex items-center gap-1.5 transition-opacity duration-75 ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {!isAgentEdge && (
              <button
                onClick={handleInsert}
                className="w-7 h-7 rounded-full bg-[#1c1c1e] border border-zinc-600
                  flex items-center justify-center
                  hover:bg-zinc-700 hover:border-zinc-400 active:scale-95
                  transition-all duration-75 shadow-xl shadow-black/60 group/btn"
                title="Insert node here"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-300 group-hover/btn:text-white" strokeWidth={3} />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="w-7 h-7 rounded-full bg-[#1c1c1e] border border-zinc-600
                flex items-center justify-center
                hover:bg-red-500/20 hover:border-red-500/60 active:scale-95
                transition-all duration-150 shadow-xl shadow-black/60 group/btn"
              title="Remove connection"
            >
              <Trash2 className="w-3 h-3 text-zinc-500 group-hover/btn:text-red-400" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Condition Label */}
        {data?.condition && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -120%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan bg-zinc-900/90 backdrop-blur-sm border border-zinc-700/40 text-zinc-500 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md"
          >
            {data.condition.operator ? "Condition" : "Pass"}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
