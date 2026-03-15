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

  const isRunning = data?.status === "running";

  return (
    <>
      {/* Glow layer — visible on hover/select/run */}
      {(selected || isRunning) && (
        <path
          d={edgePath}
          fill="none"
          stroke={isRunning ? "#3b82f6" : "#a1a1aa"}
          strokeWidth={6}
          strokeOpacity={0.1}
          style={{ filter: "blur(4px)" }}
        />
      )}

      {/* Main edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={selected ? 2 : 1.5}
        stroke={isRunning ? "#3b82f6" : selected ? "#a1a1aa" : "#3f3f46"}
        fill="none"
        style={{
          ...style,
          strokeDasharray: isRunning ? "6 4" : "none",
          animation: isRunning ? "edgeFlow 0.6s linear infinite" : "none",
          transition: "stroke 0.3s ease",
        }}
      />

      {/* Animated particle dot traveling along the edge when running */}
      {isRunning && (
        <circle r="3" fill="#60a5fa" opacity="0.9" filter="url(#edgeGlow)">
          <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* SVG filter for particle glow */}
      {isRunning && (
        <defs>
          <filter id="edgeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* Condition Label Pill */}
      {data?.condition && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full"
          >
            {data.condition.operator ? "Condition" : "Pass"}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
