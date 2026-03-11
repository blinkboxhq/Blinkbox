import { useState, useRef, useEffect } from 'react';
import { getBezierPath } from '@xyflow/react';
import useWorkspaceStore from '../../../store/workspaceStore';

export default function ConfigurableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  source,
  data,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const [showPopover, setShowPopover] = useState(false);
  const [localPath, setLocalPath] = useState(data?.conditionPath || '');
  const popoverRef = useRef(null);
  const inputRef = useRef(null);

  const updateEdgeCondition = useWorkspaceStore((s) => s.updateEdgeCondition);
  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore((s) => s.getNodeStatus);
  const sourceStatus = getNodeStatus(source);

  // Sync local state when data changes externally
  useEffect(() => {
    setLocalPath(data?.conditionPath || '');
  }, [data?.conditionPath]);

  // Close popover on outside click
  useEffect(() => {
    if (!showPopover) return;
    const handle = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showPopover]);

  // Focus input when popover opens
  useEffect(() => {
    if (showPopover && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showPopover]);

  const handleSave = () => {
    if (updateEdgeCondition) {
      updateEdgeCondition(id, localPath.trim());
    }
    setShowPopover(false);
  };

  // Visual state
  const isRunning = isExecutionLive && sourceStatus === 'running';
  const isCompleted = sourceStatus === 'completed';
  const isFailed = sourceStatus === 'failed';

  let strokeColor = style.stroke || '#333';
  let strokeOpacity = 0.5;
  let dashArray = 'none';
  let animationStyle = {};

  if (isRunning) {
    strokeColor = '#3b82f6';
    strokeOpacity = 1;
    dashArray = '8 4';
    animationStyle = { animation: 'edgeFlow 0.5s linear infinite' };
  } else if (isCompleted) {
    strokeColor = '#22c55e';
    strokeOpacity = 0.7;
  } else if (isFailed) {
    strokeColor = '#ef4444';
    strokeOpacity = 0.7;
  }

  const conditionPath = data?.conditionPath;
  const hasCondition = conditionPath && conditionPath.length > 0;

  return (
    <>
      {/* Glow layer */}
      {(isRunning || isCompleted || isFailed) && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={6}
          strokeOpacity={0.1}
          style={{ filter: 'blur(4px)' }}
        />
      )}

      {/* Main edge */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={style.strokeWidth || 2}
        strokeOpacity={strokeOpacity}
        strokeDasharray={dashArray}
        style={{
          ...animationStyle,
          transition: 'stroke 0.2s, stroke-opacity 0.2s',
        }}
      />

      {/* Clickable label area */}
      <foreignObject
        x={labelX - 50}
        y={labelY - 12}
        width={100}
        height={24}
        className="overflow-visible pointer-events-auto"
      >
        <div className="flex items-center justify-center w-full h-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover(!showPopover);
            }}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              hasCondition
                ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20'
                : 'bg-neutral-900/80 border border-neutral-800 text-neutral-600 hover:text-neutral-400 hover:border-neutral-700'
            }`}
          >
            {hasCondition ? conditionPath : 'path'}
          </button>
        </div>
      </foreignObject>

      {/* Condition popover */}
      {showPopover && (
        <foreignObject
          x={labelX - 100}
          y={labelY + 16}
          width={200}
          height={80}
          className="overflow-visible pointer-events-auto"
        >
          <div
            ref={popoverRef}
            className="bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl p-3 flex flex-col gap-2"
          >
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
              Condition Path
            </label>
            <div className="flex gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setShowPopover(false);
                }}
                placeholder="e.g. high_value"
                className="flex-1 bg-black border border-neutral-800 rounded px-2 py-1.5 text-[10px] text-white font-mono focus:outline-none focus:border-pink-500/50 transition-colors placeholder-neutral-700"
              />
              <button
                onClick={handleSave}
                className="px-2.5 py-1.5 bg-white text-black text-[10px] font-bold rounded hover:bg-neutral-200 transition-colors"
              >
                Set
              </button>
            </div>
          </div>
        </foreignObject>
      )}
    </>
  );
}
