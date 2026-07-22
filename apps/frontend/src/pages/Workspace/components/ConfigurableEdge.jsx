import { getBezierPath, getSmoothStepPath, EdgeLabelRenderer, useReactFlow } from "@xyflow/react";
import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

// ── Obstacle avoidance (n8n-style) ──────────────────────────────────────────
// Edges are curvy (bezier) by default. But when a node's bounding box sits
// under the edge's span, the edge switches to an orthogonal step path with
// rounded elbows that routes *below* the obstacle — the same behaviour as n8n.
const NODE_W = 108;   // canvas card footprint (see Canvas node sizing)
const NODE_H = 108;
const CLEARANCE = 28; // gap kept between edge and a node it routes around

function segmentHitsNodes(sx, sy, tx, ty, nodes, sourceId, targetId) {
  const minX = Math.min(sx, tx);
  const maxX = Math.max(sx, tx);
  let lowestBottom = null;
  for (const n of nodes) {
    if (n.id === sourceId || n.id === targetId) continue;
    if (!n.position) continue;
    const w = n.width || n.measured?.width || NODE_W;
    const h = n.height || n.measured?.height || NODE_H;
    const nx = n.position.x;
    const ny = n.position.y;
    const bandTop = Math.min(sy, ty) - CLEARANCE;
    const bandBottom = Math.max(sy, ty) + CLEARANCE;
    const overlapsX = nx < maxX - 4 && nx + w > minX + 4;
    const overlapsY = ny < bandBottom && ny + h > bandTop;
    if (overlapsX && overlapsY) {
      lowestBottom = lowestBottom == null ? ny + h : Math.max(lowestBottom, ny + h);
    }
  }
  return lowestBottom;
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
  const { deleteElements } = useReactFlow();

  // Slot-edge (agent connector) curvature.
  const dx = Math.abs(targetX - sourceX);
  const curvature = Math.max(0.12, Math.min(0.28, dx / 1200));

  // Curvy by default. Drop to the orthogonal step path (n8n-style) when either:
  //   1. a node's box sits under the span → route below it, or
  //   2. the edge runs backward — target handle is behind the source handle, so
  //      a bezier would cross back over itself in an ugly S. Step routing wraps
  //      it in clean right angles instead.
  // Slot edges (agent connectors) are short and never reroute.
  const obstacleBottom = isSlotEdge ? null : segmentHitsNodes(sourceX, sourceY, targetX, targetY, nodes, source, target);
  const isBackward = !isSlotEdge && targetX < sourceX + 40;
  const useStep = obstacleBottom != null || isBackward;

  let edgePath, labelX, labelY;
  if (useStep) {
    const [p, lx, ly] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      borderRadius: 16,
      ...(obstacleBottom != null ? { centerY: obstacleBottom + CLEARANCE } : {}),
    });
    edgePath = p; labelX = lx; labelY = ly;
  } else {
    const bezierCurvature = isSlotEdge ? curvature : Math.max(0.25, Math.min(0.5, dx / 600));
    const [p, lx, ly] = getBezierPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      curvature: bezierCurvature,
    });
    edgePath = p; labelX = lx; labelY = ly;
  }

  // getSmoothStepPath returns the *requested* centerY as the label point even when
  // the routing ignores it (aligned horizontal spans), which throws the midpoint
  // controls off the wire. Sample the rendered path instead — always on the edge.
  const pathRef = useRef(null);
  const [mid, setMid] = useState(null);
  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el?.getTotalLength) return;
    const len = el.getTotalLength();
    if (!len) return;
    const p = el.getPointAtLength(len / 2);
    const a = el.getPointAtLength(Math.max(0, len / 2 - 2));
    const b = el.getPointAtLength(Math.min(len, len / 2 + 2));
    setMid({ x: p.x, y: p.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
  }, [edgePath]);
  const midX = mid?.x ?? labelX;
  const midY = mid?.y ?? labelY;
  const midAngle = mid?.angle ?? 0;

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
        ref={pathRef}
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

      {/* Directional arrow at the edge midpoint — points along the edge */}
      {!isAgentEdge && !isRunning && (
        <g
          transform={`translate(${midX}, ${midY}) rotate(${midAngle})`}
          className={`transition-opacity duration-100 ${hovered ? "opacity-0" : "opacity-100"}`}
          style={{ pointerEvents: "none" }}
        >
          <path
            d="M -4 -6 L 6 0 L -4 6 Z"
            fill={isFailed ? "#ef4444" : "#a1a1aa"}
            stroke="#0d0d0f"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* ── Midpoint buttons (+ and trash, shown on hover) ─────────────────── */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
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
              transform: `translate(-50%, -120%) translate(${midX}px,${midY}px)`,
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
