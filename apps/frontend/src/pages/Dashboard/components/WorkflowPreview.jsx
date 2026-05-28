export default function WorkflowPreview({ nodeCount = 0, trigger, accentColor = '#525252', lastRunStatus }) {
  const nodes = Math.max(3, Math.min(nodeCount || 3, 8));
  const dots = Array.from({ length: nodes });

  const statusDot = lastRunStatus === 'executed' || lastRunStatus === 'completed'
    ? '#10b981'
    : lastRunStatus === 'failed'
    ? '#ef4444'
    : lastRunStatus === 'running'
    ? '#f59e0b'
    : null;

  return (
    <div className="relative h-[72px] rounded-xl border border-[#191919] bg-[#080808] overflow-hidden flex items-center px-4 gap-0">
      {/* Accent glow from left */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at -10% 50%, ${accentColor}20 0%, transparent 60%)`,
      }} />
      {/* Trigger color bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accentColor, opacity: 0.7, borderRadius: '4px 0 0 4px' }} />

      {/* Mini node chain */}
      <div className="flex items-center gap-0 relative z-10 pl-2">
        {dots.map((_, i) => (
          <div key={i} className="flex items-center">
            <div
              className="w-5 h-5 rounded-lg border flex items-center justify-center shrink-0"
              style={{
                background: i === 0 ? `${accentColor}22` : '#101010',
                borderColor: i === 0 ? `${accentColor}55` : '#1e1e1e',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? accentColor : '#2a2a2a' }} />
            </div>
            {i < dots.length - 1 && (
              <div className="w-4 h-px" style={{ background: `linear-gradient(to right, ${i === 0 ? accentColor + '44' : '#1e1e1e'}, #1a1a1a)` }} />
            )}
          </div>
        ))}
        {nodeCount > 8 && (
          <span className="ml-1.5 text-[9px] text-[#2a2a2a] font-mono">+{nodeCount - 8}</span>
        )}
      </div>

      {/* Right: stats */}
      <div className="ml-auto flex items-center gap-3 relative z-10 shrink-0">
        {nodeCount > 0 && (
          <span className="text-[10px] font-mono text-[#2a2a2a]">{nodeCount}n</span>
        )}
        {statusDot && (
          <span className="flex items-center gap-1 text-[9px]" style={{ color: statusDot }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusDot }} />
          </span>
        )}
      </div>
    </div>
  );
}
