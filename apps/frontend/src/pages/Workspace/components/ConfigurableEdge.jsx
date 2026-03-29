import { getBezierPath, EdgeLabelRenderer } from "@xyflow/react";

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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const status = data?.status;
  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  // Color palette: running = blue glow, completed = emerald pulse, failed = red, idle = zinc
  let stroke = selected ? "#a1a1aa" : "#52525b";
  let strokeWidth = selected ? 1.5 : 1;
  let strokeDasharray = "none";
  let animation = "none";
  let filter = "none";

  if (isRunning) {
    stroke = "#3b82f6";
    strokeWidth = 1.5;
    strokeDasharray = "6 4";
    animation = "edgeFlow 0.6s linear infinite";
    filter = "drop-shadow(0 0 3px rgba(59,130,246,0.5))";
  } else if (isCompleted) {
    stroke = "#10b981";
    strokeWidth = 1.5;
    animation = "edgeFadeToIdle 1.5s ease-out forwards";
    filter = "drop-shadow(0 0 2px rgba(16,185,129,0.4))";
  } else if (isFailed) {
    stroke = "#ef4444";
    strokeWidth = 1.5;
    filter = "drop-shadow(0 0 3px rgba(239,68,68,0.4))";
  }

  return (
    <>
      {/* Glow underlay for running edges */}
      {isRunning && (
        <path
          d={edgePath}
          strokeWidth={4}
          stroke="#3b82f6"
          fill="none"
          opacity={0.15}
          style={{ filter: "blur(3px)" }}
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
        <circle r="2.5" fill="#60a5fa" filter="drop-shadow(0 0 3px rgba(96,165,250,0.8))">
          <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Condition Label */}
      {data?.condition && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan bg-zinc-900 border border-zinc-800 text-zinc-500 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
          >
            {data.condition.operator ? "Condition" : "Pass"}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
