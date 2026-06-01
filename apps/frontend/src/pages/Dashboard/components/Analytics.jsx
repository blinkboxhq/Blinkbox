import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, CheckCircle2, XCircle, Zap, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent = '#fff', dim = false }) {
  return (
    <div className="flex flex-col p-5 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] gap-3">
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

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const [tooltip, setTooltip] = useState(null);
  const every = Math.ceil(data.length / 7);

  return (
    <div className="relative select-none">
      <div className="flex items-end gap-[2px] h-[120px]">
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.count / max) * 112));
          const isToday = i === data.length - 1;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end group/bar cursor-default"
              onMouseEnter={() => setTooltip({ ...d, i })}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className="w-full rounded-[3px] transition-all duration-100"
                style={{
                  height: `${h}px`,
                  background: d.count === 0
                    ? '#161616'
                    : isToday
                      ? 'rgba(255,255,255,0.9)'
                      : tooltip?.i === i
                        ? 'rgba(255,255,255,0.5)'
                        : 'rgba(255,255,255,0.18)',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X labels */}
      <div className="flex gap-[2px] mt-2.5">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {(i % every === 0 || i === data.length - 1) && (
              <span className="text-[9px] text-neutral-800">{d.day}</span>
            )}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-full mb-3 pointer-events-none z-20"
          style={{ left: `${((tooltip.i + 0.5) / data.length) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 shadow-2xl whitespace-nowrap">
            <p className="text-[10px] text-neutral-600 mb-1">{tooltip.date}</p>
            <p className="text-[14px] font-bold text-white">{tooltip.count} <span className="text-[11px] font-normal text-neutral-500">runs</span></p>
            {tooltip.count > 0 && (
              <div className="flex gap-3 mt-1">
                <span className="text-[10px] text-emerald-400">{tooltip.success} ok</span>
                <span className="text-[10px] text-red-400">{tooltip.failed} fail</span>
              </div>
            )}
          </div>
          <div className="w-2 h-2 bg-[#111] border-r border-b border-[#2a2a2a] rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

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
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth={STROKE} />
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
export default function Analytics() {
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
    { label: 'Success', count: successCount, pct: successRate, color: '#10b981' },
    { label: 'Failed',  count: failedCount,  pct: failRate,    color: '#f87171' },
    { label: 'Pending', count: pendingCount, pct: total > 0 ? Math.round((pendingCount / total) * 100) : 0, color: '#f59e0b' },
    ...(otherCount > 0 ? [{ label: 'Other', count: otherCount, pct: total > 0 ? Math.round((otherCount / total) * 100) : 0, color: '#2a2a2a' }] : []),
  ].filter(s => s.count > 0);

  const chartSlices = rawSlices.length > 0 ? rawSlices : [{ label: 'No data', count: 1, pct: 100, color: '#1c1c1c' }];

  const peak      = Math.max(...daily.map(d => d.count), 0);
  const weekTotal = daily.slice(-7).reduce((s, d) => s + d.count, 0);
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

      {/* ── Bar chart ── */}
      <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] mb-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest mb-1">Executions per day</p>
            <p className="text-[14px] font-semibold text-white">{MONTH_NAMES[month - 1]} {year}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-neutral-700 uppercase tracking-wider mb-1">Last 7d</p>
              <p className="text-[16px] font-bold text-white tabular-nums">{weekTotal}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-neutral-700 uppercase tracking-wider mb-1">Peak</p>
              <p className="text-[16px] font-bold text-white tabular-nums">{peak}</p>
            </div>
          </div>
        </div>
        {loading ? <Spinner /> : daily.length > 0 ? (
          <BarChart data={daily} />
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] gap-2">
            <Activity className="w-6 h-6 text-neutral-800" />
            <p className="text-[12px] text-neutral-700">No executions this month</p>
          </div>
        )}
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Donut */}
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a]">
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
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a]">
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
                        style={{ width: `${pct}%`, background: d.failed > 0 ? 'linear-gradient(90deg,#fff,#f87171)' : '#fff' }}
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
