import { getBezierPath, EdgeLabelRenderer, useReactFlow, MarkerType } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

// ── Arrow marker ID (matches Canvas defaultEdgeOptions) ─────────────────────
export const EDGE_ARROW_ID = "blinkbox-arrow";

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
}) {
  const setInsertOnEdge = useWorkspaceStore((s) => s.setInsertOnEdge);
  const nodeStatuses = useWorkspaceStore((s) => s.nodeStatuses);
  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const { deleteElements } = useReactFlow();

  // Soft cursive curvature — gentle bend that avoids going under nodes
  const dx = Math.abs(targetX - sourceX);
  const curvature = Math.max(0.25, Math.min(0.5, dx / 800));

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });

  // ── Status-driven styling — derived live from source node's execution status ──
  const sourceStatus = isExecutionLive ? nodeStatuses[source] : null;
  const targetStatus = isExecutionLive ? nodeStatuses[target] : null;
  // Edge is "running" while the target node is executing (data flowing into it)
  // Edge is "completed" once the target node finishes successfully
  // Edge is "failed" if the target node failed
  const status = targetStatus === "running" ? "running"
    : targetStatus === "completed" ? "completed"
    : targetStatus === "failed" ? "failed"
    : sourceStatus === "completed" && !targetStatus ? "ready"
    : data?.status;
  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isReady = status === "ready";

  // Dark grey, bold, uniform
  let stroke = "#3f3f46";
  let strokeWidth = 5;
  let strokeDasharray = "none";
  let animation = "none";
  let filter = "none";

  if (isRunning) {
    stroke = "#22d3ee";
    strokeWidth = 5;
    strokeDasharray = "8 5";
    animation = "edgeFlow 0.4s linear infinite";
    filter = "drop-shadow(0 0 6px rgba(34,211,238,0.6))";
  } else if (isCompleted) {
    stroke = "#10b981";
    strokeWidth = 5;
    animation = "edgeFadeToIdle 2s ease-out forwards";
    filter = "drop-shadow(0 0 4px rgba(16,185,129,0.5))";
  } else if (isFailed) {
    stroke = "#ef4444";
    filter = "drop-shadow(0 0 3px rgba(239,68,68,0.4))";
  } else if (isReady) {
    stroke = "#10b981";
    strokeWidth = 5;
    strokeDasharray = "3 6";
    animation = "edgeFlow 1.2s linear infinite";
    filter = "drop-shadow(0 0 3px rgba(16,185,129,0.3))";
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
      {/* Glow underlay for active edges */}
      {(isRunning || isCompleted) && (
        <path
          d={edgePath}
          strokeWidth={isRunning ? 12 : 8}
          stroke={isRunning ? "#22d3ee" : "#10b981"}
          fill="none"
          opacity={isRunning ? 0.12 : 0.08}
          style={{ filter: "blur(6px)" }}
        />
      )}

      {/* Wide invisible hit area for hover detection */}
      <path
        d={edgePath}
        strokeWidth={28}
        stroke="transparent"
        fill="none"
        className="react-flow__edge-interaction"
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
        markerEnd={markerEnd}
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
          <circle r="4" fill="#22d3ee" filter="drop-shadow(0 0 6px rgba(34,211,238,1))">
            <animateMotion dur="0.8s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="2.5" fill="white" opacity="0.8">
            <animateMotion dur="0.8s" repeatCount="indefinite" path={edgePath} />
          </circle>
        </>
      )}
      {/* Completion pulse dot */}
      {isCompleted && (
        <circle r="3" fill="#10b981" filter="drop-shadow(0 0 5px rgba(16,185,129,0.9))">
          <animateMotion dur="1.2s" repeatCount="1" path={edgePath} fill="freeze" />
        </circle>
      )}

      {/* ── Midpoint buttons (+ and trash, shown on hover) ─────────────────── */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div className="opacity-0 edge-action-buttons transition-all duration-150 flex items-center gap-2">
            <button
              onClick={handleInsert}
              className="w-8 h-8 rounded-full bg-zinc-800 border-[2.5px] border-zinc-600
                flex items-center justify-center
                hover:bg-zinc-700 hover:border-zinc-400 active:scale-95
                transition-all duration-150 shadow-lg shadow-black/50 group/btn"
              title="Add step between"
            >
              <Plus className="w-4 h-4 text-zinc-300 group-hover/btn:text-white" strokeWidth={3} />
            </button>
            <button
              onClick={handleDelete}
              className="w-8 h-8 rounded-full bg-zinc-800 border-[2.5px] border-zinc-600
                flex items-center justify-center
                hover:bg-red-500/20 hover:border-red-500/50 active:scale-95
                transition-all duration-150 shadow-lg shadow-black/50 group/btn"
              title="Delete connection"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400 group-hover/btn:text-red-400" strokeWidth={2.5} />
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
