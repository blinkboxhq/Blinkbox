import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, CheckCircle2, XCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';
import ContributionGraph from './ContributionGraph';
import StatCard from './StatCard';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ slices, total }) {
  const SIZE = 120;
  const STROKE = 22;
  const r = (SIZE - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const [hovered, setHovered] = useState(null);

  let offset = 0;
  const arcs = slices.map((s) => {
    const dash = (s.pct / 100) * circ;
    const arc = { ...s, dash, gap: circ - dash, offset };
    offset += dash + (s.pct > 0 ? 1 : 0);
    return arc;
  });

  const active = hovered !== null ? slices[hovered] : null;

  return (
    <div className="flex items-center gap-8">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bb-surface-2)" strokeWidth={STROKE} />
          {arcs.map((arc, i) => (
            <circle
              key={arc.label}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={arc.color}
              strokeWidth={hovered === i ? STROKE + 3 : STROKE}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              className="transition-all duration-100 cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[20px] font-bold text-white leading-none tabular-nums">
            {active ? active.count : total}
          </span>
          <span className="text-[9px] text-neutral-600 mt-1 uppercase tracking-wider">
            {active ? active.label : 'total'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {slices.map((s, i) => (
          <div
            key={s.label}
            className="flex items-center gap-2.5 cursor-default group/slice"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-2 h-2 rounded-full shrink-0 transition-transform duration-100 group-hover/slice:scale-125" style={{ background: s.color }} />
            <span className="text-[12px] text-neutral-500 flex-1 group-hover/slice:text-neutral-300 transition-colors">{s.label}</span>
            <span className="text-[12px] font-semibold text-white tabular-nums">{s.count}</span>
            <span className="text-[10px] text-neutral-700 tabular-nums w-8 text-right">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Analytics({ user }) {
  const userName = user?.name || user?.email?.split('@')[0] || 'You';
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const r = await api.get('/api/execution/analytics', { params: { year: y, month: m } });
      setData(r.data);
    } catch {
      setData(null);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(year, month); }, [year, month, load]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const { daily = [], breakdown = {}, total = 0, activeBoxes = 0 } = data || {};

  const successCount = (breakdown.executed || 0) + (breakdown.completed || 0);
  const failedCount  = breakdown.failed  || 0;
  const pendingCount = breakdown.pending || 0;
  const otherCount   = Math.max(0, total - successCount - failedCount - pendingCount);
  const successRate  = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const failRate     = total > 0 ? Math.round((failedCount  / total) * 100) : 0;

  const rawSlices = [
    { label: 'Success', count: successCount, pct: successRate, color: '#6f97e8' },
    { label: 'Failed',  count: failedCount,  pct: failRate,    color: '#52525b' },
    { label: 'Pending', count: pendingCount, pct: total > 0 ? Math.round((pendingCount / total) * 100) : 0, color: '#3a3a42' },
    ...(otherCount > 0 ? [{ label: 'Other', count: otherCount, pct: total > 0 ? Math.round((otherCount / total) * 100) : 0, color: '#2a2a30' }] : []),
  ].filter(s => s.count > 0);

  const chartSlices = rawSlices.length > 0 ? rawSlices : [{ label: 'No data', count: 1, pct: 100, color: '#1c1c1c' }];

  const dayMax7   = Math.max(...daily.slice(-7).map(d => d.count), 1);

  const Spinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-[#1e1e1e] border-t-neutral-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[18px] font-bold text-white tracking-tight">Analytics</h2>
          <p className="text-[12px] text-neutral-600 mt-0.5">Your workflow executions</p>
        </div>

        {/* Month picker */}
        <div className="flex items-center gap-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-1">
          <button onClick={prevMonth} className="p-2 rounded-lg text-neutral-600 hover:text-white hover:bg-white/[0.05] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[12px] font-semibold text-white px-3 min-w-[110px] text-center tabular-nums">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-2 rounded-lg text-neutral-600 hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Runs"   value={total}        sub={`${MONTH_SHORT[month-1]} ${year}`}    icon={TrendingUp}   accent="#a3a3a3" />
        <StatCard label="Successful"   value={successCount} sub={`${successRate}% success rate`}        icon={CheckCircle2} accent="#10b981" dim={successCount === 0} />
        <StatCard label="Failed"       value={failedCount}  sub={`${failRate}% failure rate`}           icon={XCircle}      accent="#f87171" dim={failedCount === 0} />
        <StatCard label="Active Flows" value={activeBoxes}  sub="currently live"                        icon={Zap}          accent="#a3a3a3" dim={activeBoxes === 0} />
      </div>

      {/* ── Contribution heatmap ── */}
      <ContributionGraph userName={userName} />

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Donut */}
        <div className="bb-card bb-reflect p-5 rounded-2xl">
          <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest mb-1">Status breakdown</p>
          <p className="text-[14px] font-semibold text-white mb-5">Distribution</p>
          {loading ? <Spinner /> : (
            total === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-16 h-16 rounded-full border-4 border-[#161616] flex items-center justify-center">
                  <span className="text-[10px] text-neutral-700">No data</span>
                </div>
              </div>
            ) : (
              <DonutChart slices={chartSlices} total={total} />
            )
          )}
        </div>

        {/* Last 7 days table */}
        <div className="bb-card bb-reflect p-5 rounded-2xl">
          <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest mb-1">Daily breakdown</p>
          <p className="text-[14px] font-semibold text-white mb-5">Last 7 days</p>
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {daily.slice(-7).reverse().map((d) => {
                const pct = d.count === 0 ? 0 : Math.round((d.count / dayMax7) * 100);
                const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                });
                return (
                  <div key={d.date} className="flex items-center gap-3 group/row">
                    <span className="text-[11px] w-[108px] shrink-0 text-neutral-600 group-hover/row:text-neutral-400 transition-colors">{label}</span>
                    <div className="flex-1 h-[3px] bg-[#111] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: d.failed > 0 ? 'linear-gradient(90deg,var(--bb-accent),#52525b)' : 'var(--bb-accent)' }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums w-6 text-right shrink-0 text-white">{d.count}</span>
                    {d.failed > 0 && (
                      <span className="text-[10px] text-red-400/60 shrink-0 w-[44px] text-right">{d.failed} fail</span>
                    )}
                  </div>
                );
              })}
              {daily.length === 0 && (
                <p className="text-[12px] text-neutral-700 py-4 text-center">No data yet</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
