import { useEffect, useState, useRef } from 'react';
import { TrendingUp, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import api from '../../../lib/api';

// ── Sparkline bar chart (stocks-style) ─────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  // Only show every Nth label to avoid crowding
  const labelInterval = Math.ceil(data.length / 6);

  return (
    <div className="relative" ref={containerRef}>
      {/* Y-axis hint */}
      <div className="flex items-end gap-[3px] h-[160px] pt-4">
        {data.map((d, i) => {
          const h = max === 0 ? 2 : Math.max(2, Math.round((d.count / max) * 140));
          const isToday = i === data.length - 1;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end group/bar cursor-default"
              onMouseEnter={() => setTooltip({ ...d, i })}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className={`w-full rounded-sm transition-all duration-150 ${
                  d.count === 0
                    ? 'bg-neutral-800/50'
                    : isToday
                    ? 'bg-white group-hover/bar:bg-neutral-300'
                    : 'bg-neutral-600 group-hover/bar:bg-neutral-400'
                }`}
                style={{ height: `${h}px` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-[3px] mt-1.5">
        {data.map((d, i) => {
          const show = i % labelInterval === 0 || i === data.length - 1;
          const label = d.date.slice(5); // MM-DD
          return (
            <div key={d.date} className="flex-1 text-center">
              {show && <span className="text-[9px] text-neutral-700">{label}</span>}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-full mb-3 pointer-events-none z-20"
          style={{
            left: `${(tooltip.i / data.length) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-neutral-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
            <p className="text-[10px] text-neutral-500 mb-1">{tooltip.date}</p>
            <p className="text-[13px] font-semibold text-white">{tooltip.count} runs</p>
            {tooltip.count > 0 && (
              <div className="flex gap-2 mt-0.5">
                <span className="text-[10px] text-emerald-400">{tooltip.success} ok</span>
                <span className="text-[10px] text-red-400">{tooltip.failed} fail</span>
              </div>
            )}
          </div>
          <div className="w-1.5 h-1.5 bg-neutral-900 border-r border-b border-zinc-700 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

// ── Donut / pie chart (pure SVG) ────────────────────────────────────────────
function DonutChart({ slices, size = 140, stroke = 28 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const arcs = slices.map((s) => {
    const dash = (s.pct / 100) * circ;
    const arc = { ...s, dash, gap: circ - dash, offset };
    offset += dash;
    return arc;
  });

  const [hovered, setHovered] = useState(null);

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c1c1c" strokeWidth={stroke} />
          {arcs.map((arc, i) => (
            <circle
              key={arc.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={hovered === i ? stroke + 4 : stroke}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              className="transition-all duration-150 cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        {/* Centre stat */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hovered !== null ? (
            <>
              <span className="text-[18px] font-bold text-white leading-none">{slices[hovered].count}</span>
              <span className="text-[9px] text-neutral-500 mt-0.5">{slices[hovered].label}</span>
            </>
          ) : (
            <>
              <span className="text-[18px] font-bold text-white leading-none">
                {slices.reduce((s, x) => s + x.count, 0)}
              </span>
              <span className="text-[9px] text-neutral-500 mt-0.5">total</span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2.5 flex-1">
        {slices.map((s, i) => (
          <div
            key={s.label}
            className="flex items-center justify-between gap-3 cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[12px] text-neutral-400">{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-white tabular-nums">{s.count}</span>
              <span className="text-[10px] text-neutral-600 tabular-nums w-8 text-right">{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = 'text-white' }) {
  return (
    <div className="p-4 rounded-lg border border-zinc-800/80 bg-[#0a0a0a] flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-[22px] font-bold leading-none ${color}`}>{value}</p>
        {sub && <p className="text-[11px] text-neutral-700 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/api/execution/analytics');
        setData(r.data);
      } catch {
        setError('Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32 text-[13px] text-neutral-600">{error}</div>
    );
  }

  const { daily = [], breakdown = {}, total = 0, activeBoxes = 0 } = data || {};

  const successCount = (breakdown.executed || 0) + (breakdown.completed || 0);
  const failedCount = breakdown.failed || 0;
  const pendingCount = breakdown.pending || 0;
  const otherCount = total - successCount - failedCount - pendingCount;

  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const failRate = total > 0 ? Math.round((failedCount / total) * 100) : 0;

  const donutSlices = [
    { label: 'Success', count: successCount, pct: successRate, color: '#10b981' },
    { label: 'Failed', count: failedCount, pct: failRate, color: '#f87171' },
    { label: 'Pending', count: pendingCount, pct: total > 0 ? Math.round((pendingCount / total) * 100) : 0, color: '#f59e0b' },
    ...(otherCount > 0
      ? [{ label: 'Other', count: otherCount, pct: total > 0 ? Math.round((otherCount / total) * 100) : 0, color: '#404040' }]
      : []),
  ].filter((s) => s.count > 0);

  // If no data at all, show placeholder slices so chart renders
  const chartSlices =
    donutSlices.length > 0
      ? donutSlices
      : [{ label: 'No data', count: 0, pct: 100, color: '#1c1c1c' }];

  const peak = Math.max(...daily.map((d) => d.count), 0);
  const totalThisWeek = daily.slice(-7).reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Analytics</h2>
        <p className="text-xs text-neutral-600 mt-0.5">Execution metrics for the past 30 days.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Runs" value={total} sub="Last 30 days" icon={TrendingUp} />
        <StatCard label="Success" value={successCount} sub={`${successRate}% rate`} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="Failed" value={failedCount} sub={`${failRate}% rate`} icon={XCircle} color={failedCount > 0 ? 'text-red-400' : 'text-neutral-600'} />
        <StatCard label="Active Boxes" value={activeBoxes} sub="Currently live" icon={Zap} color="text-white" />
      </div>

      {/* Bar chart */}
      <div className="p-5 rounded-lg border border-zinc-800/80 bg-[#0a0a0a] mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-0.5">Executions</p>
            <p className="text-[13px] font-semibold text-white">Past 30 Days</p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[10px] text-neutral-600">This week</p>
              <p className="text-[13px] font-semibold text-white">{totalThisWeek}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-600">Peak day</p>
              <p className="text-[13px] font-semibold text-white">{peak}</p>
            </div>
          </div>
        </div>
        {daily.length > 0 ? (
          <BarChart data={daily} />
        ) : (
          <div className="flex items-center justify-center h-[160px] text-[12px] text-neutral-700">No execution data yet.</div>
        )}
      </div>

      {/* Donut + recent day breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="p-5 rounded-lg border border-zinc-800/80 bg-[#0a0a0a]">
          <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-1">Status Breakdown</p>
          <p className="text-[13px] font-semibold text-white mb-5">30-Day Distribution</p>
          <DonutChart slices={chartSlices} />
          {total === 0 && (
            <p className="text-[11px] text-neutral-700 text-center mt-4">Run some boxes to see data here.</p>
          )}
        </div>

        {/* Recent daily table */}
        <div className="p-5 rounded-lg border border-zinc-800/80 bg-[#0a0a0a]">
          <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-1">Daily Breakdown</p>
          <p className="text-[13px] font-semibold text-white mb-4">Last 7 Days</p>
          <div className="space-y-1">
            {daily.slice(-7).reverse().map((d) => {
              const dayMax = Math.max(...daily.slice(-7).map((x) => x.count), 1);
              const pct = dayMax === 0 ? 0 : Math.round((d.count / dayMax) * 100);
              const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={d.date} className="flex items-center gap-3 py-1.5">
                  <span className="text-[11px] text-neutral-600 w-[110px] shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neutral-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 tabular-nums w-6 text-right">{d.count}</span>
                  {d.failed > 0 && <span className="text-[10px] text-red-400/70">({d.failed} fail)</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
