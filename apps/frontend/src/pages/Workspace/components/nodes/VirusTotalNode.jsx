import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "scanUrl",      label: "Scan URL" },
  { value: "scanFile",     label: "Scan File Hash" },
  { value: "getUrlReport", label: "Get URL Report" },
  { value: "getFileReport",label: "Get File Report" },
  { value: "getIpReport",  label: "Get IP Report" },
  { value: "getDomainReport", label: "Get Domain Report" },
];

export default function VirusTotalNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "scanUrl";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#394EFF]/10 border border-[#394EFF]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#394EFF">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 13H9V8h2v6zm4 0h-2V8h2v6z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">VirusTotal</div>
          <div className="text-[11px] text-zinc-500">Scan URLs, files, IPs, domains for threats</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#394EFF]/10 border-[#394EFF]/40 text-[#394EFF]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {(op === "scanUrl" || op === "getUrlReport") && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">URL</label>
          <SmartVariableInput value={config.url || ""} onChange={(v) => updateConfig("url", v)} placeholder="{{ $json.suspiciousUrl }}" />
        </div>
      )}

      {(op === "scanFile" || op === "getFileReport") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Hash (MD5, SHA-1, or SHA-256)</label>
            <SmartVariableInput value={config.hash || ""} onChange={(v) => updateConfig("hash", v)} placeholder="{{ $json.fileHash }}" />
          </div>
          {op === "scanFile" && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
              ⚠ Hash-based scan looks up existing VirusTotal reports. To upload a new file, use the File Upload node first.
            </div>
          )}
        </>
      )}

      {op === "getIpReport" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">IP Address</label>
          <SmartVariableInput value={config.ip || ""} onChange={(v) => updateConfig("ip", v)} placeholder="{{ $json.sourceIp }}" />
        </div>
      )}

      {op === "getDomainReport" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Domain</label>
          <SmartVariableInput value={config.domain || ""} onChange={(v) => updateConfig("domain", v)} placeholder="{{ $json.domain }}" />
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Wait for analysis</p>
          <p className="text-[10px] text-zinc-600">Poll until scan completes (up to 60s)</p>
        </div>
        <button onClick={() => updateConfig("waitForAnalysis", !config.waitForAnalysis)}
          className={`w-10 h-5 rounded-full border transition-all relative ${config.waitForAnalysis ? "bg-[#394EFF] border-blue-400" : "bg-zinc-700 border-zinc-600"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.waitForAnalysis ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="VirusTotal API Key" placeholder="Select VirusTotal credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">malicious, suspicious, harmless, undetected, stats, permalink</span>
      </div>
    </div>
  );
}
