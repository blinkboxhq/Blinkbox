import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const LABEL_W = 30;
const TOP_PAD = 18;

const LEVELS = [
  'rgba(255, 255, 255, 0.05)',
  'rgba(77, 124, 255, 0.32)',
  'rgba(77, 124, 255, 0.55)',
  'rgba(77, 124, 255, 0.78)',
  'var(--bb-accent)',
];

function levelFor(count, max) {
  if (!count) return 0;
  if (max <= 0) return 1;
  const q = count / max;
  if (q > 0.75) return 4;
  if (q > 0.5) return 3;
  if (q > 0.25) return 2;
  return 1;
}

function fmtDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function buildWeeks(year, byDate, max) {
  const last = new Date(Date.UTC(year, 11, 31));
  const start = new Date(Date.UTC(year, 0, 1));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks = [];
  const monthAt = [];
  const cursor = new Date(start);
  let lastMonth = -1;

  while (cursor <= last) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const inYear = cursor.getUTCFullYear() === year;
      const iso = cursor.toISOString().slice(0, 10);
      const rec = inYear ? byDate.get(iso) : null;
      col.push({
        iso,
        inYear,
        count: rec?.count || 0,
        success: rec?.success || 0,
        failed: rec?.failed || 0,
        level: inYear ? levelFor(rec?.count || 0, max) : -1,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const firstInYear = col.find((c) => c.inYear);
    if (firstInYear) {
      const m = new Date(firstInYear.iso + 'T12:00:00').getMonth();
      if (m !== lastMonth) { monthAt.push({ col: weeks.length, label: MONTH_SHORT[m] }); lastMonth = m; }
    }
    weeks.push(col);
  }
  return { weeks, monthAt };
}

export default function ContributionGraph({ userName = 'You' }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState({ days: [], total: 0, max: 0 });
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [cw, setCw] = useState(900);
  const wrapRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/api/analytics/contributions', { params: { year } })
      .then((r) => { if (alive) setData(r.data); })
      .catch(() => { if (alive) setData({ days: [], total: 0, max: 0 }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [year]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const byDate = useMemo(() => {
    const m = new Map();
    for (const d of data.days || []) m.set(d.date, d);
    return m;
  }, [data]);

  const { weeks, monthAt } = useMemo(() => buildWeeks(year, byDate, data.max || 0), [year, byDate, data.max]);

  const cols = weeks.length || 53;
  const gridW = Math.max(0, cw - LABEL_W);
  const step = gridW / cols;
  const cell = Math.max(6, step - Math.max(2, step * 0.14));
  const radius = Math.min(3, cell * 0.28);
  const stepY = step;
  const svgH = TOP_PAD + stepY * 7;

  const onHover = (day, e) => {
    if (!day) return setTooltip(null);
    const wrap = wrapRef.current?.getBoundingClientRect();
    const cellBox = e.currentTarget.getBoundingClientRect();
    if (!wrap) return;
    setTooltip({ day, x: cellBox.left - wrap.left + cellBox.width / 2, y: cellBox.top - wrap.top });
  };

  const canForward = year < now.getFullYear();

  return (
    <div className="bb-card bb-liquid p-5 rounded-2xl mb-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] font-semibold text-[var(--bb-text-dim)] uppercase tracking-widest mb-1">Activity</p>
          <p className="text-[14px] font-semibold text-[var(--bb-text-hi)]">Run history</p>
        </div>
        <div className="flex items-center gap-1 bb-card rounded-xl p-1">
          <button onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-lg text-[var(--bb-text-dim)] hover:text-[var(--bb-text-hi)] hover:bg-white/[0.05] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[12px] font-semibold text-[var(--bb-text-hi)] px-2 min-w-[44px] text-center tabular-nums">{year}</span>
          <button onClick={() => canForward && setYear((y) => y + 1)} disabled={!canForward} className="p-1.5 rounded-lg text-[var(--bb-text-dim)] hover:text-[var(--bb-text-hi)] hover:bg-white/[0.05] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full">
        <div className={loading ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
          <svg width="100%" height={svgH} viewBox={`0 0 ${cw} ${svgH}`} className="block">
            {monthAt.map((m) => (
              <text key={`${m.col}-${m.label}`} x={LABEL_W + m.col * stepY + 1} y={11} fill="var(--bb-text-dim)" fontSize="10" fontWeight="500">{m.label}</text>
            ))}
            {WEEKDAY.map((w, i) => w && (
              <text key={w} x={0} y={TOP_PAD + i * stepY + cell - 1} fill="var(--bb-text-dim)" fontSize="9">{w}</text>
            ))}
            <g transform={`translate(${LABEL_W}, ${TOP_PAD})`}>
              {weeks.map((col, ci) => (
                <g key={ci} transform={`translate(${ci * stepY}, 0)`}>
                  {col.map((day, ri) => (
                    day.inYear ? (
                      <rect
                        key={ri}
                        x={0} y={ri * stepY}
                        width={cell} height={cell}
                        rx={radius} ry={radius}
                        fill={LEVELS[day.level]}
                        stroke="rgba(255,255,255,0.05)" strokeWidth={1}
                        className="cursor-pointer transition-[fill] duration-100"
                        onMouseEnter={(e) => onHover(day, e)}
                        onMouseLeave={() => onHover(null)}
                      />
                    ) : null
                  ))}
                </g>
              ))}
            </g>
          </svg>
        </div>

        {tooltip && (
          <div className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full" style={{ left: tooltip.x, top: tooltip.y - 6 }}>
            <div className="bb-pop rounded-lg px-2.5 py-1.5 whitespace-nowrap">
              <p className="text-[13px] font-bold text-[var(--bb-text-hi)] tabular-nums">
                {tooltip.day.count} {tooltip.day.count === 1 ? 'run' : 'runs'}
              </p>
              <p className="text-[10px] text-[var(--bb-text-dim)]">{fmtDate(tooltip.day.iso)}</p>
              {tooltip.day.count > 0 && (
                <div className="flex gap-2.5 mt-0.5">
                  <span className="text-[10px] text-emerald-400">{tooltip.day.success} ok</span>
                  <span className="text-[10px] text-rose-400">{tooltip.day.failed} fail</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--bb-text-dim)]">Less</span>
          {LEVELS.map((c, i) => (
            <span key={i} className="rounded-[2.5px]" style={{ width: 11, height: 11, background: c, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }} />
          ))}
          <span className="text-[10px] text-[var(--bb-text-dim)]">More</span>
        </div>

        <p className="text-[12px] text-[var(--bb-text-lo)]">
          <span className="font-semibold text-[var(--bb-text-hi)]">{userName}</span> ran{' '}
          <span className="font-bold text-[var(--bb-accent-hot)] tabular-nums">{data.total.toLocaleString()}</span> automations this year
        </p>
      </div>
    </div>
  );
}
