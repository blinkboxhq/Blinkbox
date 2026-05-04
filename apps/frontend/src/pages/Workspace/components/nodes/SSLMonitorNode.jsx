import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function SSLMonitorNode({ config = {}, updateConfig, nodeId }) {
  const warningDays = config.warningDays ?? 30;
  const criticalDays = config.criticalDays ?? 7;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#4ade80" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">SSL Cert Monitor</div>
          <div className="text-[11px] text-zinc-500">Check certificate expiry and validity</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Domain(s)</label>
        <SmartVariableInput value={config.domains || ""} onChange={(v) => updateConfig("domains", v)}
          placeholder="myapp.com, api.myapp.com (comma-sep)" />
        <p className="text-[10px] text-zinc-600 mt-1">HTTPS port 443 is checked by default.</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Port (optional)</label>
        <SmartVariableInput value={config.port || "443"} onChange={(v) => updateConfig("port", v)} placeholder="443" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Warning threshold (days)</label>
          <input type="number" min={1} max={365} value={warningDays}
            onChange={(e) => updateConfig("warningDays", Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Critical threshold (days)</label>
          <input type="number" min={1} max={90} value={criticalDays}
            onChange={(e) => updateConfig("criticalDays", Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Fail if invalid chain</p>
          <p className="text-[10px] text-zinc-600">Checks full cert chain validity</p>
        </div>
        <button onClick={() => updateConfig("checkChain", !config.checkChain)}
          className={`w-10 h-5 rounded-full border transition-all relative ${config.checkChain !== false ? "bg-green-500 border-green-400" : "bg-zinc-700 border-zinc-600"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.checkChain !== false ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">domain, valid (bool), expiresIn (days), issuer, status (ok/warning/critical)</span>
      </div>
    </div>
  );
}
