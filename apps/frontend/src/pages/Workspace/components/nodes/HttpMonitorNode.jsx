import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const METHODS = ["GET","POST","PUT","HEAD","OPTIONS"];

export default function HttpMonitorNode({ config = {}, updateConfig, nodeId }) {
  const method = config.method || "GET";
  const expectedStatus = config.expectedStatus || 200;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#f87171" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">HTTP Monitor</div>
          <div className="text-[11px] text-zinc-500">Check uptime, response time & status code</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">URL(s)</label>
        <SmartVariableInput value={config.urls || ""} onChange={(v) => updateConfig("urls", v)}
          placeholder="https://api.myapp.com/health (comma-sep for multiple)" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Method</label>
        <div className="flex gap-1.5">
          {METHODS.map((m) => (
            <button key={m} onClick={() => updateConfig("method", m)}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${method === m ? "bg-red-500/10 border-red-500/40 text-red-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Expected Status Code</label>
        <div className="flex gap-1.5">
          {[200,201,204,301,302].map((s) => (
            <button key={s} onClick={() => updateConfig("expectedStatus", s)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${expectedStatus === s ? "bg-red-500/10 border-red-500/40 text-red-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (ms)</label>
        <div className="flex gap-1.5">
          {[3000,5000,10000,30000].map((t) => (
            <button key={t} onClick={() => updateConfig("timeout", t)}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.timeout||5000) === t ? "bg-red-500/10 border-red-500/40 text-red-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {t/1000}s
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Custom Headers (JSON, optional)</label>
        <SmartVariableInput value={config.headers || ""} onChange={(v) => updateConfig("headers", v)} placeholder='{"Authorization":"Bearer {{ $json.token }}"}' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Response Must Contain (optional)</label>
        <SmartVariableInput value={config.mustContain || ""} onChange={(v) => updateConfig("mustContain", v)} placeholder='"status":"ok"' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Latency (ms, optional)</label>
        <SmartVariableInput value={config.maxLatency || ""} onChange={(v) => updateConfig("maxLatency", v)} placeholder="2000 (fail if slower)" />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Follow redirects</p>
        </div>
        <button onClick={() => updateConfig("followRedirects", !config.followRedirects)}
          className={`w-10 h-5 rounded-full border transition-all relative ${config.followRedirects !== false ? "bg-red-500 border-red-400" : "bg-zinc-700 border-zinc-600"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.followRedirects !== false ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">url, status, latencyMs, up (bool), body (truncated)</span>
      </div>
    </div>
  );
}
