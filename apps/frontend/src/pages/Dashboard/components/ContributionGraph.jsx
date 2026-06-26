import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;

const LEVELS = [
  'var(--bb-surface-2)',
  'rgba(77, 124, 255, 0.30)',
  'rgba(77, 124, 255, 0.52)',
  'rgba(77, 124, 255, 0.76)',
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
  const first = new Date(Date.UTC(year, 0, 1));
  const last = new Date(Date.UTC(year, 11, 31));
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks = [];
  const monthAt = [];
  let cursor = new Date(start);
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

function Cell({ day, onHover }) {
  if (!day.inYear) {
    return <rect width={CELL} height={CELL} rx={2.5} ry={2.5} fill="transparent" />;
  }
  return (
    <rect
      width={CELL} height={CELL} rx={2.5} ry={2.5}
      fill={LEVELS[day.level]}
      stroke="rgba(255,255,255,0.04)" strokeWidth={1}
      className="cursor-pointer transition-[fill] duration-100"
      onMouseEnter={(e) => onHover(day, e)}
      onMouseLeave={() => onHover(null)}
    />
  );
}

export default function ContributionGraph({ userName = 'You' }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState({ days: [], total: 0, max: 0 });
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [gameMode, setGameMode] = useState(() => localStorage.getItem('bb-contrib-game') === '1');
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

  useEffect(() => { localStorage.setItem('bb-contrib-game', gameMode ? '1' : '0'); }, [gameMode]);

  const byDate = useMemo(() => {
    const m = new Map();
    for (const d of data.days || []) m.set(d.date, d);
    return m;
  }, [data]);

  const { weeks, monthAt } = useMemo(() => buildWeeks(year, byDate, data.max || 0), [year, byDate, data.max]);

  const gridW = weeks.length * STEP;
  const onHover = (day, e) => {
    if (!day) return setTooltip(null);
    const wrap = wrapRef.current?.getBoundingClientRect();
    const cell = e.currentTarget.getBoundingClientRect();
    if (!wrap) return;
    setTooltip({ day, x: cell.left - wrap.left + CELL / 2, y: cell.top - wrap.top });
  };

  const canForward = year < now.getFullYear();

  return (
    <div className="bb-card p-5 rounded-2xl mb-4">
      <div className="flex items-center justify-between mb-4">
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

      <div ref={wrapRef} className="relative overflow-x-auto">
        <div className={loading ? 'opacity-40 transition-opacity' : 'transition-opacity'} style={{ minWidth: gridW + 30 }}>
          <svg width={gridW + 30} height={7 * STEP + 20} className="block">
            {monthAt.map((m) => (
              <text key={`${m.col}-${m.label}`} x={30 + m.col * STEP} y={9} fill="var(--bb-text-dim)" fontSize="10" fontWeight="500">{m.label}</text>
            ))}
            {WEEKDAY.map((w, i) => w && (
              <text key={w} x={0} y={20 + i * STEP + CELL - 1} fill="var(--bb-text-dim)" fontSize="9">{w}</text>
            ))}
            <g transform="translate(30, 16)">
              {weeks.map((col, ci) => (
                <g key={ci} transform={`translate(${ci * STEP}, 0)`}>
                  {col.map((day, ri) => (
                    <g key={ri} transform={`translate(0, ${ri * STEP})`}>
                      <Cell day={day} onHover={onHover} />
                    </g>
                  ))}
                </g>
              ))}
            </g>
          </svg>
        </div>

        {tooltip && (
          <div className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full" style={{ left: tooltip.x, top: tooltip.y - 6 }}>
            <div className="bb-card rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
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

      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--bb-text-dim)]">Less</span>
            {LEVELS.map((c, i) => (
              <span key={i} className="rounded-[2.5px]" style={{ width: CELL, height: CELL, background: c, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)' }} />
            ))}
            <span className="text-[10px] text-[var(--bb-text-dim)]">More</span>
          </div>

          <div className="w-px h-5 bg-[var(--bb-border-subtle)]" />

          <button onClick={() => setGameMode((g) => !g)} className="flex items-center gap-2 group">
            <span className="text-[11px] text-[var(--bb-text-lo)] group-hover:text-[var(--bb-text-mid)] transition-colors">Game Mode</span>
            <span className="relative w-10 h-5 rounded-full transition-colors duration-150 shrink-0" style={{ background: gameMode ? 'var(--bb-accent)' : 'var(--bb-surface-2)' }}>
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150" style={{ transform: gameMode ? 'translateX(20px)' : 'translateX(0)' }} />
            </span>
          </button>
        </div>

        <p className="text-[12px] text-[var(--bb-text-lo)]">
          <span className="font-semibold text-[var(--bb-text-hi)]">{userName}</span> ran{' '}
          <span className="font-bold text-[var(--bb-accent-hot)] tabular-nums">{data.total.toLocaleString()}</span> automations this year
        </p>
      </div>
    </div>
  );
}
