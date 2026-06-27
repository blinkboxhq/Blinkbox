import { useMemo, useState } from 'react';
import { Loader2, Activity, ChevronDown, CheckCircle2, XCircle, Clock, Workflow } from 'lucide-react';

function timeAgo(d) {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function duration(ex) {
  const start = ex.startedAt || ex.createdAt;
  if (!ex.completedAt || !start) return null;
  const ms = new Date(ex.completedAt) - new Date(start);
  if (ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

function statusMeta(status) {
  if (status === 'completed' || status === 'executed') {
    return { Icon: CheckCircle2, dot: 'var(--bb-accent)', color: 'var(--bb-accent-hot)', label: 'Succeeded' };
  }
  if (status === 'failed') {
    return { Icon: XCircle, dot: '#f87171', color: '#f87171', label: 'Failed' };
  }
  if (status === 'cancelled') {
    return { Icon: XCircle, dot: 'var(--bb-text-dim)', color: 'var(--bb-text-lo)', label: 'Cancelled' };
  }
  return { Icon: Clock, dot: '#f59e0b', color: '#f59e0b', label: 'Running' };
}

const FILTERS = [
  { id: 'all', label: 'All runs' },
  { id: 'success', label: 'Succeeded' },
  { id: 'failed', label: 'Failed' },
  { id: 'running', label: 'Running' },
];

function matchesFilter(status, f) {
  if (f === 'all') return true;
  if (f === 'success') return status === 'completed' || status === 'executed';
  if (f === 'failed') return status === 'failed';
  if (f === 'running') return status === 'pending' || status === 'running';
  return true;
}

export default function HistoryPanel({ executions = [], loading }) {
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () => executions.filter((ex) => matchesFilter(ex.status, filter)),
    [executions, filter],
  );

  const activeFilter = FILTERS.find((f) => f.id === filter) || FILTERS[0];

  return (
    <div className="max-w-[1100px] mx-auto w-full" style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
      <div className="mb-6">
        <h2 className="text-[18px] font-bold text-[var(--bb-text-hi)] tracking-tight">History</h2>
        <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">Every workflow execution in this workspace</p>
      </div>

      <div className="bb-card bb-liquid rounded-2xl overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bb-divider bg-white/[0.02]">
          <p className="text-[13px] font-semibold text-[var(--bb-text-hi)] tabular-nums">
            {rows.length.toLocaleString()} workflow run{rows.length === 1 ? '' : 's'}
          </p>
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--bb-text-mid)] hover:text-[var(--bb-text-hi)] bb-card rounded-lg px-3 py-1.5 transition-colors"
            >
              {activeFilter.label}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="bb-pop absolute right-0 mt-1.5 w-[160px] rounded-xl p-1 z-30">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onMouseDown={() => { setFilter(f.id); setOpen(false); }}
                    className={`w-full text-left text-[12px] px-3 py-1.5 rounded-lg transition-colors ${
                      filter === f.id
                        ? 'text-[var(--bb-accent-hot)] bg-[var(--bb-accent-soft)]'
                        : 'text-[var(--bb-text-mid)] hover:bg-white/[0.05]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--bb-text-lo)] text-[13px] px-5 py-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading runs…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Activity className="w-8 h-8 text-[var(--bb-text-dim)] mb-3" />
            <p className="text-[13px] text-[var(--bb-text-lo)]">No runs match this filter.</p>
          </div>
        ) : (
          rows.map((ex, i) => {
            const m = statusMeta(ex.status);
            const dur = duration(ex);
            return (
              <div
                key={ex._id || i}
                className="group flex items-center gap-3.5 px-5 py-3.5 border-t bb-divider hover:bg-white/[0.025] transition-colors"
              >
                <span className="relative flex shrink-0" style={{ width: 18, height: 18 }}>
                  <m.Icon className="w-[18px] h-[18px]" style={{ color: m.dot }} strokeWidth={2} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--bb-text-hi)] truncate group-hover:text-white transition-colors">
                    {ex.automationName || ex.name || 'Untitled workflow'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--bb-text-dim)]">
                    <span style={{ color: m.color }}>{m.label}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Workflow className="w-3 h-3" /> {ex.trigger || ex.name || 'manual'}
                    </span>
                    {ex._id && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{String(ex._id).slice(-7)}</span>
                      </>
                    )}
                  </div>
                </div>

                <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-md text-[var(--bb-text-lo)] bg-white/[0.04] border border-white/[0.05]">
                  main
                </span>

                <div className="shrink-0 text-right w-[120px]">
                  <p className="text-[11px] text-[var(--bb-text-lo)]">{timeAgo(ex.startedAt || ex.createdAt)}</p>
                  {dur && <p className="text-[10px] text-[var(--bb-text-dim)] font-mono mt-0.5">{dur}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
