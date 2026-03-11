import { BaseEdge, getStraightPath, getBezierPath } from "@xyflow/react";
import useWorkspaceStore from "../../../store/workspaceStore";

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedEdge — Renders a flowing dashed stroke between nodes during
// execution.  When idle, renders a clean static bezier.
// When the source node is "running", the dash animates (marching ants).
// When completed, glows blue.  When failed, glows red.
// ─────────────────────────────────────────────────────────────────────────────

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
}) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore((s) => s.getNodeStatus);
  const sourceStatus = getNodeStatus(source);

  // Determine visual state
  const isRunning = isExecutionLive && sourceStatus === "running";
  const isCompleted = sourceStatus === "completed";
  const isFailed = sourceStatus === "failed";

  let strokeColor = style.stroke || "#3b82f6";
  let strokeOpacity = 0.5;
  let dashArray = "none";
  let animationName = "none";

  if (isRunning) {
    strokeColor = "#3b82f6";
    strokeOpacity = 1;
    dashArray = "8 4";
    animationName = "edgeFlow 0.5s linear infinite";
  } else if (isCompleted) {
    strokeColor = "#22c55e";
    strokeOpacity = 0.8;
  } else if (isFailed) {
    strokeColor = "#ef4444";
    strokeOpacity = 0.8;
  }

  return (
    <>
      {/* Glow layer (behind) */}
      {(isRunning || isCompleted || isFailed) && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={6}
          strokeOpacity={0.15}
          style={{ filter: "blur(4px)" }}
        />
      )}

      {/* Main edge path */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={style.strokeWidth || 2}
        strokeOpacity={strokeOpacity}
        strokeDasharray={dashArray}
        markerEnd={markerEnd}
        style={{
          animation: animationName,
          transition: "stroke 0.3s, stroke-opacity 0.3s",
        }}
      />

      {/* Keyframe injection (only once via CSS) */}
      <style>{`
        @keyframes edgeFlow {
          to { stroke-dashoffset: -12; }
        }
      `}</style>
    </>
  );
}
