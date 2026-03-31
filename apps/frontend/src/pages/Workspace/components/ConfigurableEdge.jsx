import { getSmoothStepPath, EdgeLabelRenderer, useReactFlow, MarkerType } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

// ── Arrow marker ID (matches Canvas defaultEdgeOptions) ─────────────────────
export const EDGE_ARROW_ID = "blinkbox-arrow";

export default function ConfigurableEdge({
  id,
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
  const { deleteElements } = useReactFlow();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  // ── Status-driven styling ─────────────────────────────────────────────────
  const status = data?.status;
  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isActive = isRunning || isCompleted || isFailed;

  // Solid bold lines. Dashed ONLY when running.
  let stroke = "#3f3f46";
  let strokeWidth = 3.5;
  let strokeDasharray = "none";
  let animation = "none";
  let filter = "none";

  if (isRunning) {
    stroke = "#3b82f6";
    strokeWidth = 3.5;
    strokeDasharray = "6 4";
    animation = "edgeFlow 0.5s linear infinite";
    filter = "drop-shadow(0 0 4px rgba(59,130,246,0.5))";
  } else if (isCompleted) {
    stroke = "#10b981";
    strokeWidth = 3.5;
    animation = "edgeFadeToIdle 1.5s ease-out forwards";
    filter = "drop-shadow(0 0 3px rgba(16,185,129,0.4))";
  } else if (isFailed) {
    stroke = "#ef4444";
    strokeWidth = 3.5;
    filter = "drop-shadow(0 0 3px rgba(239,68,68,0.4))";
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
      {isRunning && (
        <path
          d={edgePath}
          strokeWidth={6}
          stroke="#3b82f6"
          fill="none"
          opacity={0.1}
          style={{ filter: "blur(4px)" }}
        />
      )}

      {/* Wide invisible hit area for hover detection */}
      <path
        d={edgePath}
        strokeWidth={24}
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
        <circle r="3" fill="#60a5fa" filter="drop-shadow(0 0 4px rgba(96,165,250,0.9))">
          <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* ── Midpoint action buttons (+ and delete) ───────────────────────── */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-1 opacity-0 edge-action-buttons transition-all duration-150">
            {/* Insert node */}
            <button
              onClick={handleInsert}
              className="w-8 h-8 rounded-lg bg-[#1e1e22] border border-zinc-700/60 flex items-center justify-center
                hover:bg-zinc-700 hover:border-zinc-500/70 active:scale-95 transition-all duration-150
                shadow-lg shadow-black/60"
              title="Insert node"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-300" strokeWidth={2.5} />
            </button>
            {/* Delete edge */}
            <button
              onClick={handleDelete}
              className="w-8 h-8 rounded-lg bg-[#1e1e22] border border-zinc-700/60 flex items-center justify-center
                hover:bg-red-950/60 hover:border-red-500/40 active:scale-95 transition-all duration-150
                shadow-lg shadow-black/60 group/del"
              title="Delete connection"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400 group-hover/del:text-red-400 transition-colors" strokeWidth={2} />
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
