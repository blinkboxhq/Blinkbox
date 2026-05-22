const W = 345;
const H = 215;

export default function WorkflowPreview({ thumbnail, accentColor }) {
  return (
    <div style={{
      width: W, height: H, position: 'relative', overflow: 'hidden', flexShrink: 0,
      backgroundImage: 'radial-gradient(circle, #1d1d1d 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }} className="rounded-xl border border-[#1e1e1e] mx-auto">

      {/* Trigger color glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 20% 110%, ${accentColor}18 0%, transparent 55%)`,
      }} />

      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-[#2a2a2a] select-none">No preview yet</span>
        </div>
      )}
    </div>
  );
}
