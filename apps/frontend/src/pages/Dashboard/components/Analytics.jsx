import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, CheckCircle2, XCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CARD = 'p-5 rounded-xl border border-zinc-800/80 bg-[#0a0a0a]';
const LABEL = 'text-[10px] font-medium text-neutral-600 uppercase tracking-widest mb-0.5';
const TITLE = 'text-[13px] font-semibold text-white';
const SPINNER = (
  <div className="flex items-center justify-center py-10">
    <div className="w-4 h-4 border-2 border-neutral-800 border-t-neutral-500 rounded-full animate-spin" />
  </div>
);

// ── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const [tooltip, setTooltip] = useState(null);
  const every = Math.ceil(data.length / 6);

  return (
    <div className="relative">
      <div className="flex items-end gap-[3px] h-[148px]">
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.count / max) * 140));
          const isLast = i === data.length - 1;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end group/bar cursor-default"
              onMouseEnter={() => setTooltip({ ...d, i })}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className={`w-full rounded-[2px] transition-colors duration-100 ${
                  d.count === 0 ? 'bg-neutral-800/40'
                  : isLast ? 'bg-white group-hover/bar:bg-neutral-300'
                  : 'bg-neutral-600 group-hover/bar:bg-neutral-400'
                }`}
                style={{ height: `${h}px` }}
              />
            </div>
          );
        })}
      </div>

      {/* X labels */}
      <div className="flex gap-[3px] mt-2">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {(i % every === 0 || i === data.length - 1) && (
              <span className="text-[9px] text-neutral-700">{d.day}</span>
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
          <div className="bg-[#111] border border-zinc-700/80 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
            <p className="text-[10px] text-neutral-600 mb-1">{tooltip.date}</p>
            <p className="text-[13px] font-semibold text-white">{tooltip.count} runs</p>
            {tooltip.count > 0 && (
              <div className="flex gap-2.5 mt-0.5">
                <span className="text-[10px] text-emerald-400">{tooltip.success} ok</span>
                <span className="text-[10px] text-red-400">{tooltip.failed} fail</span>
              </div>
            )}
          </div>
          <div className="w-1.5 h-1.5 bg-[#111] border-r border-b border-zinc-700/80 rotate-45 mx-auto -mt-[3px]" />
        </div>
      )}
    </div>
  );
}

// ── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ slices }) {
  const SIZE = 140;
  const STROKE = 28;
  const r = (SIZE - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const [hovered, setHovered] = useState(null);

  let offset = 0;
  const arcs = slices.map((s) => {
    const dash = (s.pct / 100) * circ;
    const arc = { ...s, dash, gap: circ - dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#141414" strokeWidth={STROKE} />
          {arcs.map((arc, i) => (
            <circle
              key={arc.label}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={arc.color}
              strokeWidth={hovered === i ? STROKE + 4 : STROKE}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              className="transition-all duration-150 cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hovered !== null ? (
            <>
              <span className="text-[19px] font-bold text-white leading-none">{slices[hovered].count}</span>
              <span className="text-[9px] text-neutral-500 mt-1">{slices[hovered].label}</span>
            </>
          ) : (
            <>
              <span className="text-[19px] font-bold text-white leading-none">
                {slices.reduce((s, x) => s + x.count, 0)}
              </span>
              <span className="text-[9px] text-neutral-500 mt-1">total</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {slices.map((s, i) => (
          <div
            key={s.label}
            className="flex items-center justify-between cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[12px] text-neutral-400">{s.label}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] font-semibold text-white tabular-nums">{s.count}</span>
              <span className="text-[10px] text-neutral-600 tabular-nums w-7 text-right">{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = 'text-white' }) {
  return (
    <div className={`${CARD} flex items-start gap-3`}>
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-zinc-800/60 flex items-center justify-center shrink-0">
        <Icon className={`w-[15px] h-[15px] ${color}`} />
      </div>
      <div className="min-w-0">
        <p className={LABEL}>{label}</p>
        <p className={`text-[22px] font-bold leading-none mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-neutral-700 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Analytics() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const r = await api.get('/api/execution/analytics', { params: { year: y, month: m } });
      setData(r.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(year, month); }, [year, month, load]);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const { daily = [], breakdown = {}, total = 0, activeBoxes = 0 } = data || {};

  const successCount = (breakdown.executed || 0) + (breakdown.completed || 0);
  const failedCount  = breakdown.failed || 0;
  const pendingCount = breakdown.pending || 0;
  const otherCount   = Math.max(0, total - successCount - failedCount - pendingCount);
  const successRate  = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const failRate     = total > 0 ? Math.round((failedCount  / total) * 100) : 0;

  const rawSlices = [
    { label: 'Success', count: successCount, pct: successRate, color: '#10b981' },
    { label: 'Failed',  count: failedCount,  pct: failRate,    color: '#f87171' },
    { label: 'Pending', count: pendingCount, pct: total > 0 ? Math.round((pendingCount / total) * 100) : 0, color: '#f59e0b' },
    ...(otherCount > 0 ? [{ label: 'Other', count: otherCount, pct: total > 0 ? Math.round((otherCount / total) * 100) : 0, color: '#2d2d2d' }] : []),
  ].filter((s) => s.count > 0);

  const chartSlices = rawSlices.length > 0
    ? rawSlices
    : [{ label: 'No data', count: 1, pct: 100, color: '#1c1c1c' }];

  const peak = Math.max(...daily.map((d) => d.count), 0);
  const weekTotal = daily.slice(-7).reduce((s, d) => s + d.count, 0);
  const dayMax7 = Math.max(...daily.slice(-7).map((d) => d.count), 1);

  return (
    <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[15px] font-semibold text-white">Analytics</h2>
          <p className="text-[11px] text-neutral-600 mt-0.5">Platform-wide · visible to all users</p>
        </div>
        {/* Month picker */}
        <div className="flex items-center gap-1 bg-[#0d0d0d] border border-zinc-800 rounded-lg p-1">
          <button onClick={prevMonth} className="p-1.5 rounded-md text-neutral-600 hover:text-white hover:bg-white/[0.05] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[12px] font-semibold text-white px-3 min-w-[88px] text-center tabular-nums">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-md text-neutral-600 hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Runs"    value={total}         sub={`${MONTH_NAMES[month-1]} ${year}`} icon={TrendingUp}  />
        <StatCard label="Success"       value={successCount}  sub={`${successRate}% rate`}            icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="Failed"        value={failedCount}   sub={`${failRate}% rate`}               icon={XCircle}      color={failedCount > 0 ? 'text-red-400' : 'text-neutral-600'} />
        <StatCard label="Active Boxes"  value={activeBoxes}   sub="currently live"                    icon={Zap} />
      </div>

      {/* ── Bar chart card ── */}
      <div className={`${CARD} mb-4`}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className={LABEL}>Executions / day</p>
            <p className={TITLE}>{MONTH_NAMES[month - 1]} {year}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className={LABEL}>Last 7 days</p>
              <p className={TITLE}>{weekTotal}</p>
            </div>
            <div className="text-right">
              <p className={LABEL}>Peak day</p>
              <p className={TITLE}>{peak}</p>
            </div>
          </div>
        </div>

        {loading ? SPINNER : daily.length > 0 ? (
          <BarChart data={daily} />
        ) : (
          <div className="flex items-center justify-center h-[148px] text-[12px] text-neutral-700">
            No executions this period.
          </div>
        )}
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Donut */}
        <div className={CARD}>
          <p className={LABEL}>Status breakdown</p>
          <p className={`${TITLE} mb-5`}>Distribution</p>
          {loading ? SPINNER : (
            <>
              <DonutChart slices={chartSlices} />
              {total === 0 && (
                <p className="text-[11px] text-neutral-700 text-center mt-5">No runs this month.</p>
              )}
            </>
          )}
        </div>

        {/* 7-day table */}
        <div className={CARD}>
          <p className={LABEL}>Daily breakdown</p>
          <p className={`${TITLE} mb-5`}>Last 7 Days</p>
          {loading ? SPINNER : (
            <div className="space-y-2">
              {daily.slice(-7).reverse().map((d) => {
                const pct = d.count === 0 ? 0 : Math.round((d.count / dayMax7) * 100);
                const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                });
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className={`text-[11px] w-[108px] shrink-0 ${d.count === 0 ? 'text-neutral-700' : 'text-neutral-500'}`}>{label}</span>
                    <div className="flex-1 h-1 bg-neutral-900 rounded-full overflow-hidden">
                      {pct > 0 && (
                        <div
                          className="h-full rounded-full bg-neutral-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                    <span className={`text-[11px] tabular-nums w-5 text-right shrink-0 ${d.count === 0 ? 'text-neutral-700' : 'text-neutral-300'}`}>{d.count}</span>
                    <span className="text-[10px] text-red-400/70 shrink-0 w-[48px] text-left">
                      {d.failed > 0 ? `${d.failed} fail` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
