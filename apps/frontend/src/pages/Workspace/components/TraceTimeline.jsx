import TraceTimelineStep from "./TraceTimelineStep";

/**
 * TraceTimeline — vertical chronological list of execution trace steps.
 *
 * @param {{ nodes: Array, liveExecutionState: object|null, isLive: boolean }} props
 */
export default function TraceTimeline({ nodes, liveExecutionState, isLive }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs text-zinc-600">No nodes in workflow</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {nodes.map((node, index) => {
        const cursor = liveExecutionState?.cursors?.find(
          (c) => c.nodeId === node.id,
        );
        return (
          <TraceTimelineStep
            key={node.id}
            node={node}
            cursor={cursor}
            isLast={index === nodes.length - 1}
            isLive={isLive}
          />
        );
      })}
    </div>
  );
}
