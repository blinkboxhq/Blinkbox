import TraceTimelineStep from "./TraceTimelineStep";

export default function TraceTimeline({ nodes, liveExecutionState, isLive, executionLogs = [] }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs text-zinc-600">No nodes in workflow</p>
      </div>
    );
  }

  // Build a map of nodeId → log entries for O(1) lookup
  const logsByNode = {};
  for (const log of executionLogs) {
    if (!log.nodeId) continue;
    if (!logsByNode[log.nodeId]) logsByNode[log.nodeId] = [];
    logsByNode[log.nodeId].push(log);
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
            nodeLogs={logsByNode[node.id] || []}
          />
        );
      })}
    </div>
  );
}
