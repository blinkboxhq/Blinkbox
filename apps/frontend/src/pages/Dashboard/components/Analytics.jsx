import { useEffect, useState, useRef, useCallback } from 'react';
import { TrendingUp, CheckCircle2, XCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── SVG Line / Area plot ────────────────────────────────────────────────────
function LinePlot({ data }) {
  const W = 800;
  const H = 180;
  const PAD = { top: 20, right: 16, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const max = Math.max(...data.map((d) => d.count), 1);
  const n = data.length;

  // Map data point to SVG coordinates
  const px = (i) => PAD.left + (i / (n - 1)) * innerW;
  const py = (v) => PAD.top + innerH - (v / max) * innerH;

  // Build smooth polyline points (cardinal spline via simple bezier)
  const pts = data.map((d, i) => ({ x: px(i), y: py(d.count) }));

  // Catmull-Rom → cubic bezier conversion for smooth curve
  function catmullRomPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const t = 0.4;
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  const linePath = catmullRomPath(pts);
  // Area fill: close path at bottom
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x},${PAD.top + innerH} L ${pts[0].x},${PAD.top + innerH} Z`
    : '';

  // Y-axis grid lines
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + innerH - t * innerH,
    label: Math.round(t * max),
  }));

  // X-axis labels — show ~7 evenly spaced
  const xInterval = Math.max(1, Math.floor(n / 6));
  const xLabels = data
    .map((d, i) => ({ i, label: String(d.day), show: i % xInterval === 0 || i === n - 1 }))
    .filter((x) => x.show);

  const handleMouseMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) * (W / rect.width) - PAD.left;
    const idx = Math.round((relX / innerW) * (n - 1));
    if (idx >= 0 && idx < n) setHover(idx);
  }, [n, innerW]);

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: '180px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#525252" />
            <stop offset="100%" stopColor="#e5e5e5" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t) => (
          <g key={t.label}>
            <line
              x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
              stroke="#1f1f1f" strokeWidth="1"
            />
            <text x={PAD.left - 6} y={t.y + 3.5} textAnchor="end" fontSize="9" fill="#404040">
              {t.label}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map(({ i, label }) => (
          <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#404040">
            {label}
          </text>
        ))}

        {/* Area fill */}
        {areaPath && (
          <path d={areaPath} fill="url(#areaGrad)" />
        )}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover vertical line */}
        {hover !== null && (
          <line
            x1={px(hover)} y1={PAD.top} x2={px(hover)} y2={PAD.top + innerH}
            stroke="#333" strokeWidth="1" strokeDasharray="3 3"
          />
        )}

        {/* Data dots */}
        {pts.map((p, i) => {
          const isHover = hover === i;
          const d = data[i];
          if (d.count === 0 && !isHover) return null;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isHover ? 5 : 3}
              fill={isHover ? '#fff' : '#666'}
              stroke={isHover ? '#111' : 'none'}
              strokeWidth="2"
              className="transition-all duration-75"
            />
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {hover !== null && (
        <div
          className="absolute pointer-events-none z-30"
          style={{
            bottom: `${H * 0.15}px`,
            left: `${(px(hover) / W) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-[#111] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 shadow-2xl whitespace-nowrap">
            <p className="text-[10px] text-neutral-500 mb-1.5">{data[hover]?.date}</p>
            <p className="text-[15px] font-bold text-white leading-none mb-1">{data[hover]?.count} runs</p>
            <div className="flex gap-3">
              <span className="text-[10px] text-emerald-400">{data[hover]?.success} success</span>
              <span className="text-[10px] text-red-400">{data[hover]?.failed} failed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Donut chart (SVG arcs) ──────────────────────────────────────────────────
function DonutChart({ slices, size = 148, stroke = 30 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
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
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#161616" strokeWidth={stroke} />
          {arcs.map((arc, i) => (
            <circle
              key={arc.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={hovered === i ? stroke + 5 : stroke}
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
              <span className="text-[20px] font-bold text-white leading-none">{slices[hovered].count}</span>
              <span className="text-[9px] text-neutral-500 mt-1">{slices[hovered].label}</span>
            </>
          ) : (
            <>
              <span className="text-[20px] font-bold text-white leading-none">
                {slices.reduce((s, x) => s + x.count, 0)}
              </span>
              <span className="text-[9px] text-neutral-500 mt-1">total</span>
            </>
          )}
        </div>
      </div>
      <div className="space-y-3 flex-1">
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
    <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0a0a0a] flex items-start gap-3">
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
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const { daily = [], breakdown = {}, total = 0, activeBoxes = 0 } = data || {};

  const successCount = (breakdown.executed || 0) + (breakdown.completed || 0);
  const failedCount = breakdown.failed || 0;
  const pendingCount = breakdown.pending || 0;
  const otherCount = Math.max(0, total - successCount - failedCount - pendingCount);

  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const failRate = total > 0 ? Math.round((failedCount / total) * 100) : 0;

  const rawSlices = [
    { label: 'Success', count: successCount, pct: successRate, color: '#10b981' },
    { label: 'Failed', count: failedCount, pct: failRate, color: '#f87171' },
    { label: 'Pending', count: pendingCount, pct: total > 0 ? Math.round((pendingCount / total) * 100) : 0, color: '#f59e0b' },
    ...(otherCount > 0 ? [{ label: 'Other', count: otherCount, pct: total > 0 ? Math.round((otherCount / total) * 100) : 0, color: '#303030' }] : []),
  ].filter((s) => s.count > 0);

  const chartSlices = rawSlices.length > 0
    ? rawSlices
    : [{ label: 'No data', count: 1, pct: 100, color: '#1c1c1c' }];

  const peak = Math.max(...daily.map((d) => d.count), 0);
  const totalThisWeek = daily.slice(-7).reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
      {/* Header + month nav */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
          <p className="text-xs text-neutral-600 mt-0.5">Platform-wide execution metrics — visible to all users.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#0d0d0d] border border-zinc-800 rounded-xl px-1 py-1">
          <button onClick={prevMonth} className="p-1.5 text-neutral-600 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[13px] font-semibold text-white px-2 min-w-[90px] text-center tabular-nums">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 text-neutral-600 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Runs" value={total} sub={`${MONTH_NAMES[month-1]} ${year}`} icon={TrendingUp} />
        <StatCard label="Success" value={successCount} sub={`${successRate}% rate`} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="Failed" value={failedCount} sub={`${failRate}% rate`} icon={XCircle} color={failedCount > 0 ? 'text-red-400' : 'text-neutral-600'} />
        <StatCard label="Active Boxes" value={activeBoxes} sub="Currently live" icon={Zap} />
      </div>

      {/* Line plot card */}
      <div className="p-5 rounded-xl border border-zinc-800/80 bg-[#0a0a0a] mb-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-widest mb-0.5">Executions</p>
            <p className="text-[14px] font-semibold text-white">
              {MONTH_NAMES[month - 1]} {year} — daily
            </p>
          </div>
          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="text-[10px] text-neutral-600">Last 7 days</p>
              <p className="text-[14px] font-semibold text-white">{totalThisWeek}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-600">Peak</p>
              <p className="text-[14px] font-semibold text-white">{peak}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[180px]">
            <div className="w-4 h-4 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
          </div>
        ) : daily.length > 0 ? (
          <LinePlot data={daily} />
        ) : (
          <div className="flex items-center justify-center h-[180px] text-[12px] text-neutral-700">
            No executions in this period.
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-5 mt-3 pt-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-neutral-600">Success</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-neutral-600">Failed</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-px bg-neutral-500" /><span className="text-[10px] text-neutral-600">Total runs</span></div>
        </div>
      </div>

      {/* Bottom row: donut + 7-day table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-zinc-800/80 bg-[#0a0a0a]">
          <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-widest mb-0.5">Status Breakdown</p>
          <p className="text-[14px] font-semibold text-white mb-5">Distribution</p>
          {loading ? (
            <div className="flex items-center justify-center h-[148px]">
              <div className="w-4 h-4 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <DonutChart slices={chartSlices} />
              {total === 0 && (
                <p className="text-[11px] text-neutral-700 text-center mt-4">No runs this month.</p>
              )}
            </>
          )}
        </div>

        <div className="p-5 rounded-xl border border-zinc-800/80 bg-[#0a0a0a]">
          <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-widest mb-0.5">Daily Breakdown</p>
          <p className="text-[14px] font-semibold text-white mb-4">Last 7 Days</p>
          {loading ? (
            <div className="flex items-center justify-center h-[120px]">
              <div className="w-4 h-4 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {daily.slice(-7).reverse().map((d) => {
                const dayMax = Math.max(...daily.slice(-7).map((x) => x.count), 1);
                const pct = dayMax === 0 ? 0 : Math.round((d.count / dayMax) * 100);
                const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                });
                return (
                  <div key={d.date} className="flex items-center gap-3 py-1.5">
                    <span className="text-[11px] text-neutral-600 w-[110px] shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-neutral-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-neutral-400 tabular-nums w-5 text-right">{d.count}</span>
                    {d.failed > 0 && (
                      <span className="text-[10px] text-red-400/60 w-14 shrink-0">({d.failed} fail)</span>
                    )}
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
