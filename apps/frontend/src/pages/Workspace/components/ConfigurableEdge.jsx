import { getSmoothStepPath, EdgeLabelRenderer } from "@xyflow/react";
import { Plus } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

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
}) {
  const setInsertOnEdge = useWorkspaceStore((s) => s.setInsertOnEdge);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const status = data?.status;
  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  // Color palette
  let stroke = selected ? "#71717a" : "#3f3f46";
  let strokeWidth = selected ? 1.8 : 1.2;
  let strokeDasharray = "6 4";
  let animation = "edgeFlow 1.2s linear infinite";
  let filter = "none";

  if (isRunning) {
    stroke = "#3b82f6";
    strokeWidth = 2;
    strokeDasharray = "6 4";
    animation = "edgeFlow 0.5s linear infinite";
    filter = "drop-shadow(0 0 4px rgba(59,130,246,0.5))";
  } else if (isCompleted) {
    stroke = "#10b981";
    strokeWidth = 1.8;
    strokeDasharray = "none";
    animation = "edgeFadeToIdle 1.5s ease-out forwards";
    filter = "drop-shadow(0 0 3px rgba(16,185,129,0.4))";
  } else if (isFailed) {
    stroke = "#ef4444";
    strokeWidth = 1.8;
    strokeDasharray = "none";
    animation = "none";
    filter = "drop-shadow(0 0 3px rgba(239,68,68,0.4))";
  }

  const handleInsert = (e) => {
    e.stopPropagation();
    setInsertOnEdge(id);
  };

  return (
    <>
      {/* Glow underlay for running edges */}
      {isRunning && (
        <path
          d={edgePath}
          strokeWidth={5}
          stroke="#3b82f6"
          fill="none"
          opacity={0.12}
          style={{ filter: "blur(4px)" }}
        />
      )}

      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={strokeWidth}
        stroke={stroke}
        fill="none"
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
        <circle r="2.5" fill="#60a5fa" filter="drop-shadow(0 0 4px rgba(96,165,250,0.9))">
          <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Inline + button on the edge midpoint */}
      <EdgeLabelRenderer>
        {/* Insert node button */}
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleInsert}
            className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600/40 flex items-center justify-center
              opacity-0 hover:opacity-100 focus:opacity-100 transition-all duration-200
              hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:scale-110
              shadow-md shadow-black/40 group/edge-btn"
            title="Insert node here"
          >
            <Plus className="w-2.5 h-2.5 text-zinc-400 group-hover/edge-btn:text-emerald-400 transition-colors" strokeWidth={2.5} />
          </button>
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
