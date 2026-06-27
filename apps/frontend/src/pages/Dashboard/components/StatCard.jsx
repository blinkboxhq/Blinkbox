export default function StatCard({ label, value, sub, icon: Icon, accent = '#fff', dim = false }) {
  return (
    <div className="flex flex-col bb-card bb-liquid p-5 rounded-2xl gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}10`, border: `1px solid ${accent}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: dim ? '#3a3a3a' : accent }} />
        </div>
      </div>
      <div>
        <p className="text-[28px] font-bold leading-none tabular-nums" style={{ color: dim ? '#333' : '#fff' }}>{value}</p>
        {sub && <p className="text-[11px] text-neutral-700 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}
