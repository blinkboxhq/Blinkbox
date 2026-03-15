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
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={selected ? 1.5 : 1}
        stroke={isRunning ? "#60a5fa" : selected ? "#71717a" : "#27272a"}
        fill="none"
        style={{
          ...style,
          strokeDasharray: isRunning ? "5 4" : "none",
          animation: isRunning ? "edgeFlow 0.8s linear infinite" : "none",
          transition: "stroke 0.2s ease",
        }}
      />

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
