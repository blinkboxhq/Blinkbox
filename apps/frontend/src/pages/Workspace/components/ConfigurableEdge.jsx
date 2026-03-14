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
        strokeWidth={selected ? 2 : 1.5}
        stroke={selected ? "#a1a1aa" : "#3f3f46"}
        style={{
          ...style,
          animation: isRunning ? "flow 1s linear infinite" : "none",
          strokeDasharray: isRunning ? "5 5" : "none",
        }}
      />

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
