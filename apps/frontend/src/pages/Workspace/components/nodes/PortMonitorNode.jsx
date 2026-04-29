import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function PortMonitorNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#a78bfa" strokeWidth="2">
            <path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Port Monitor</div>
          <div className="text-[11px] text-zinc-500">Check if TCP ports are open or closed</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Host(s)</label>
        <SmartVariableInput value={config.hosts || ""} onChange={(v) => updateConfig("hosts", v)}
          placeholder="api.myapp.com, 10.0.0.1 (comma-sep)" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Port(s)</label>
        <SmartVariableInput value={config.ports || ""} onChange={(v) => updateConfig("ports", v)}
          placeholder="22, 80, 443, 5432 (comma-sep)" />
        <p className="text-[10px] text-zinc-600 mt-1">Common: 22 SSH · 80 HTTP · 443 HTTPS · 5432 Postgres · 6379 Redis · 27017 MongoDB</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (ms)</label>
        <div className="flex gap-1.5">
          {[1000,3000,5000,10000].map((t) => (
            <button key={t} onClick={() => updateConfig("timeout", t)}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.timeout||3000) === t ? "bg-violet-500/10 border-violet-500/40 text-violet-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {t/1000}s
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Fail if any port closed</p>
          <p className="text-[10px] text-zinc-600">Throws an error to stop the workflow</p>
        </div>
        <button onClick={() => updateConfig("failOnClosed", !config.failOnClosed)}
          className={`w-10 h-5 rounded-full border transition-all relative ${config.failOnClosed ? "bg-violet-500 border-violet-400" : "bg-zinc-700 border-zinc-600"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.failOnClosed ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">results[ ] (host, port, open (bool), latencyMs)</span>
      </div>
    </div>
  );
}
