import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function VirusTotalNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "scanUrl";
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#394EFF]/5 border border-[#394EFF]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#394EFF]/10 border border-[#394EFF]/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#394EFF]">VT</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#394EFF]">VirusTotal</span>
          <span className="text-[10px] text-zinc-500">Scan URLs, files and IPs for malware and threats</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">API Key</label>
        <SmartVariableInput value={config.apiKey || ""} onChange={v => updateConfig("apiKey", v)}
          placeholder="VirusTotal public/private API key" nodeId={nodeId} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <select value={op} onChange={e => updateConfig("operation", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#394EFF]/40">
          <option value="scanUrl">Scan URL</option>
          <option value="getUrlReport">Get URL Report</option>
          <option value="scanFile">Scan File (by hash)</option>
          <option value="getIpReport">Get IP Report</option>
        </select>
      </div>

      {(op === "scanUrl" || op === "getUrlReport") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">URL</label>
          <SmartVariableInput value={config.url || ""} onChange={v => updateConfig("url", v)}
            placeholder="https://example.com" nodeId={nodeId} />
        </div>
      )}

      {op === "scanFile" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">File Hash (MD5 / SHA1 / SHA256)</label>
          <SmartVariableInput value={config.hash || ""} onChange={v => updateConfig("hash", v)}
            placeholder="{{upstream.hash}}" nodeId={nodeId} />
        </div>
      )}

      {op === "getIpReport" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">IP Address</label>
          <SmartVariableInput value={config.ip || ""} onChange={v => updateConfig("ip", v)}
            placeholder="1.2.3.4" nodeId={nodeId} />
        </div>
      )}
    </div>
  );
}
