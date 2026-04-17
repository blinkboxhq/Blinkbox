import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Zap, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import api from "../../../lib/api";

const SUCCESS_COLOR = "#10b981";
const FAIL_COLOR = "#ef4444";
const BASE_COLOR = "#3f3f46";

function StatCard({ icon: Icon, label, value, sub, color = "zinc" }) {
  const colors = {
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    zinc: "text-zinc-400 bg-zinc-500/10 border-zinc-700/40",
  };
  return (
    <div className={`flex flex-col gap-3 p-5 rounded-2xl border ${colors[color]} bg-[#0d0d0f]`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-2xl font-bold text-zinc-100 tabular-nums">{value ?? "—"}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-zinc-600 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function formatDuration(ms) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1e] border border-zinc-700/50 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-zinc-300 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-zinc-400 capitalize">{p.dataKey}:</span>
          <span className="text-zinc-200 font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/analytics/overview?days=${days}`),
      api.get(`/api/analytics/daily?days=${days}`),
    ])
      .then(([ov, dl]) => {
        setOverview(ov.data);
        // Pivot daily data: [{date, completed: N, failed: N}, ...]
        const map = {};
        for (const row of dl.data) {
          if (!map[row.date]) map[row.date] = { date: row.date };
          map[row.date][row.status] = row.count;
        }
        setDaily(Object.values(map).sort((a, b) => a.date.localeCompare(b.date)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const successRate = overview
    ? overview.totalRuns > 0
      ? Math.round((overview.successCount / overview.totalRuns) * 100)
      : 100
    : null;

  const pieData = overview
    ? [
        { name: "Success", value: overview.successCount, color: SUCCESS_COLOR },
        { name: "Failed", value: overview.failureCount, color: FAIL_COLOR },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Analytics</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Workflow performance across your workspace</p>
        </div>
        <div className="flex items-center gap-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${days === d ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">Loading analytics…</div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Zap} label="Total Runs" value={overview?.totalRuns?.toLocaleString()} color="blue" />
            <StatCard icon={CheckCircle2} label="Success Rate" value={`${successRate}%`} sub={`${overview?.successCount} succeeded`} color="green" />
            <StatCard icon={XCircle} label="Failed" value={overview?.failureCount?.toLocaleString()} color={overview?.failureCount > 0 ? "red" : "zinc"} />
            <StatCard icon={Clock} label="Avg Duration" value={formatDuration(overview?.avgDurationMs)} sub={`p95: ${formatDuration(overview?.p95DurationMs)}`} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bar chart */}
            <div className="md:col-span-2 p-5 bg-[#0d0d0f] border border-zinc-800/50 rounded-2xl">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Runs per day</div>
              {daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={daily} barCategoryGap="30%">
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} width={24} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="completed" name="Success" fill={SUCCESS_COLOR} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" fill={FAIL_COLOR} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-zinc-700 text-sm">No runs in this period</div>
              )}
            </div>

            {/* Pie chart */}
            <div className="p-5 bg-[#0d0d0f] border border-zinc-800/50 rounded-2xl flex flex-col">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Outcome split</div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[10px] text-zinc-400">{v}</span>} />
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center flex-1 text-zinc-700 text-sm">No data</div>
              )}
            </div>
          </div>

          {/* Top failed nodes */}
          {overview?.topFailedNodes?.length > 0 && (
            <div className="p-5 bg-[#0d0d0f] border border-zinc-800/50 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Most failing nodes</span>
              </div>
              <div className="flex flex-col gap-2">
                {overview.topFailedNodes.map((n, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/40 last:border-0">
                    <div>
                      <span className="text-xs font-mono text-zinc-300">{n.nodeType}</span>
                      <span className="text-[10px] text-zinc-600 ml-2 font-mono">{n.nodeId}</span>
                    </div>
                    <span className="text-xs font-bold text-red-400 tabular-nums">{n.failureCount}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
