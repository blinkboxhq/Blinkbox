import { useEffect, useState, useRef, useCallback } from 'react';
import { TrendingUp, CheckCircle2, XCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Cartesian plane plot ────────────────────────────────────────────────────
function CartesianPlot({ data }) {
  // Canvas dimensions
  const W = 860;
  const H = 260;
  // Origin sits at bottom-left; leave room for axis labels + arrowheads
  const O = { x: 54, y: H - 40 }; // origin pixel position
  const ARROW = 14;                 // extra space past last tick for arrowhead
  const plotW = W - O.x - 30;      // usable width from origin → right arrow tip
  const plotH = O.y - 20;          // usable height from origin → top arrow tip

  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const n = data.length;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  // Round max up to a nice number for Y axis
  const yMax = Math.ceil(maxVal / 5) * 5 || 5;

  // Y ticks: 5 evenly spaced from 0 → yMax
  const Y_TICKS = 5;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => ({
    val: Math.round((i / Y_TICKS) * yMax),
    py: O.y - (i / Y_TICKS) * plotH,
  }));

  // X ticks: one per day, but label every ~5th to avoid crowding
  const xLabelEvery = Math.max(1, Math.ceil(n / 7));

  // Map day index → pixel X (days start at index 0 = day 1)
  const toX = (i) => O.x + ((i + 1) / (n + 1)) * (plotW - ARROW);
  // Map value → pixel Y
  const toY = (v) => O.y - (v / yMax) * plotH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.count), d, i }));

  // Smooth Catmull-Rom path through points
  function curvePath(points) {
    if (points.length < 2) return '';
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const t = 0.35;
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  }

  const linePath = curvePath(pts);
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x},${O.y} L ${pts[0].x},${O.y} Z`
    : '';

  const handleMouseMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) * (W / rect.width);
    // Find nearest point
    let closest = null, minDist = Infinity;
    pts.forEach((p) => {
      const dist = Math.abs(p.x - mx);
      if (dist < minDist) { minDist = dist; closest = p.i; }
    });
    if (minDist < 30) setHover(closest);
    else setHover(null);
  }, [pts]);

  const hPt = hover !== null ? pts[hover] : null;

  return (
    <div className="relative select-none w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minHeight: '240px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="cpAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
          </linearGradient>
          <marker id="arrowX" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#3f3f3f" />
          </marker>
          <marker id="arrowY" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,6 L3,0 L6,6 Z" fill="#3f3f3f" />
          </marker>
        </defs>

        {/* ── Quadrant grid (light) ── */}
        {yTicks.slice(1).map((t) => (
          <line key={t.val}
            x1={O.x} y1={t.py} x2={W - 24} y2={t.py}
            stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4 4"
          />
        ))}
        {data.map((_, i) => (
          <line key={i}
            x1={toX(i)} y1={O.y} x2={toX(i)} y2={20}
            stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4 4"
          />
        ))}

        {/* ── Y-axis ── */}
        <line
          x1={O.x} y1={O.y + 6} x2={O.x} y2={20 - ARROW}
          stroke="#3f3f3f" strokeWidth="1.5"
          markerEnd="url(#arrowY)"
        />
        {/* Y-axis label */}
        <text x={O.x - 2} y={14} textAnchor="middle" fontSize="9" fill="#555" fontStyle="italic">runs</text>

        {/* Y ticks + labels */}
        {yTicks.filter((t) => t.val > 0).map((t) => (
          <g key={t.val}>
            <line x1={O.x - 4} y1={t.py} x2={O.x + 4} y2={t.py} stroke="#3f3f3f" strokeWidth="1" />
            <text x={O.x - 8} y={t.py + 3.5} textAnchor="end" fontSize="9" fill="#4a4a4a" fontFamily="monospace">
              {t.val}
            </text>
          </g>
        ))}

        {/* ── X-axis ── */}
        <line
          x1={O.x - 6} y1={O.y} x2={W - 24 + ARROW} y2={O.y}
          stroke="#3f3f3f" strokeWidth="1.5"
          markerEnd="url(#arrowX)"
        />
        {/* X-axis label */}
        <text x={W - 18} y={O.y + 12} textAnchor="middle" fontSize="9" fill="#555" fontStyle="italic">day</text>

        {/* X ticks + day labels */}
        {data.map((d, i) => {
          const showLabel = i % xLabelEvery === 0 || i === n - 1;
          return (
            <g key={i}>
              <line x1={toX(i)} y1={O.y - 4} x2={toX(i)} y2={O.y + 4} stroke="#3f3f3f" strokeWidth="1" />
              {showLabel && (
                <text x={toX(i)} y={O.y + 16} textAnchor="middle" fontSize="9" fill="#4a4a4a" fontFamily="monospace">
                  {d.day}
                </text>
              )}
            </g>
          );
        })}

        {/* Origin label */}
        <text x={O.x - 8} y={O.y + 14} textAnchor="middle" fontSize="9" fill="#333" fontFamily="monospace">0</text>

        {/* ── Area fill ── */}
        {areaPath && <path d={areaPath} fill="url(#cpAreaGrad)" />}

        {/* ── Curve line ── */}
        {linePath && (
          <path d={linePath} fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* ── Plotted points ── */}
        {pts.map((p) => {
          const isHov = hover === p.i;
          return (
            <g key={p.i}>
              {/* Crosshair lines through the point when hovered */}
              {isHov && (
                <>
                  <line x1={O.x} y1={p.y} x2={p.x} y2={p.y} stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={p.x} y1={O.y} x2={p.x} y2={p.y} stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3" />
                </>
              )}
              {/* Outer glow ring on hover */}
              {isHov && <circle cx={p.x} cy={p.y} r={9} fill="#ffffff" fillOpacity="0.06" />}
              {/* Point */}
              <circle
                cx={p.x} cy={p.y}
                r={isHov ? 5 : p.d.count === 0 ? 2.5 : 3.5}
                fill={isHov ? '#fff' : p.d.count === 0 ? '#1f1f1f' : '#737373'}
                stroke={isHov ? '#111' : p.d.count === 0 ? '#2a2a2a' : '#111'}
                strokeWidth={isHov ? 2 : 1}
              />
              {/* Coordinate label on hover */}
              {isHov && (
                <text
                  x={p.x + 9} y={p.y - 7}
                  fontSize="9" fill="#888" fontFamily="monospace"
                >
                  ({p.d.day}, {p.d.count})
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip card */}
      {hPt && (
        <div
          className="absolute pointer-events-none z-30 bottom-12"
          style={{
            left: `${(hPt.x / W) * 100}%`,
            transform: hPt.x / W > 0.7 ? 'translateX(-110%)' : 'translateX(12px)',
          }}
        >
          <div className="bg-[#0f0f0f] border border-zinc-700/70 rounded-xl px-4 py-3 shadow-2xl whitespace-nowrap">
            <p className="text-[10px] text-neutral-600 mb-1 font-mono">Day {hPt.d.day} · {hPt.d.date}</p>
            <p className="text-[16px] font-bold text-white leading-none mb-1.5">{hPt.d.count} <span className="text-[11px] font-normal text-neutral-500">runs</span></p>
            <div className="flex gap-3 border-t border-zinc-800 pt-1.5">
              <span className="text-[10px] text-emerald-400">{hPt.d.success} success</span>
              <span className="text-[10px] text-red-400">{hPt.d.failed} failed</span>
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
