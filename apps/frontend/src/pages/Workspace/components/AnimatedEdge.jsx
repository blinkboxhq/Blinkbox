import { BaseEdge, getStraightPath, getBezierPath } from "@xyflow/react";
import useWorkspaceStore from "../../../store/workspaceStore";

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

  const isRunning = isExecutionLive && sourceStatus === "running";
  const isCompleted = sourceStatus === "completed";
  const isFailed = sourceStatus === "failed";

  // Base state (Idle)
  let strokeColor = style.stroke || "#71717a"; // slick mid-grey
  let strokeOpacity = 0.4;
  let dashArray = "none";
  let animationName = "none";

  if (isRunning) {
    strokeColor = "#e4e4e7"; // greyish-white
    strokeOpacity = 0.9;
    dashArray = "4 4"; // tighter, slicker dashed line
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
      {/* Subtle Glow layer */}
      {(isRunning || isCompleted || isFailed) && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={4} // Thinned down from 6
          strokeOpacity={0.15}
          style={{ filter: "blur(3px)" }} // Tighter glow
        />
      )}

      {/* Main thin edge path */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1} // Forced thin line
        strokeOpacity={strokeOpacity}
        strokeDasharray={dashArray}
        markerEnd={markerEnd}
        style={{
          animation: animationName,
          transition: "stroke 0.3s, stroke-opacity 0.3s",
        }}
      />

      <style>{`
        @keyframes edgeFlow {
          to { stroke-dashoffset: -8; }
        }
      `}</style>
    </>
  );
}