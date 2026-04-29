import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const RECORD_TYPES = ["A","AAAA","MX","CNAME","TXT","NS","SOA","SRV","PTR","CAA"];

export default function DNSLookupNode({ config = {}, updateConfig }) {
  const selectedTypes = config.recordTypes || ["A"];

  const toggleType = (type) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    updateConfig("recordTypes", next.length ? next : ["A"]);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#38bdf8" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">DNS Lookup</div>
          <div className="text-[11px] text-zinc-500">Query A, MX, TXT, CNAME and more</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Domain</label>
        <SmartVariableInput value={config.domain || ""} onChange={(v) => updateConfig("domain", v)} placeholder="{{ $json.domain }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Record Types</label>
        <div className="flex gap-1 flex-wrap">
          {RECORD_TYPES.map((t) => (
            <button key={t} onClick={() => toggleType(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedTypes.includes(t) ? "bg-sky-500/10 border-sky-500/40 text-sky-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">DNS Resolver</label>
        <div className="flex gap-1.5">
          {["system","8.8.8.8","1.1.1.1","9.9.9.9"].map((r) => (
            <button key={r} onClick={() => updateConfig("resolver", r)}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all font-mono ${(config.resolver||"8.8.8.8") === r ? "bg-sky-500/10 border-sky-500/40 text-sky-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {r === "system" ? "system" : r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Include TTL values</p>
          <p className="text-[10px] text-zinc-600">Returns time-to-live for each record</p>
        </div>
        <button onClick={() => updateConfig("includeTtl", !config.includeTtl)}
          className={`w-10 h-5 rounded-full border transition-all relative ${config.includeTtl ? "bg-sky-500 border-sky-400" : "bg-zinc-700 border-zinc-600"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.includeTtl ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">domain, records[ ] (type, value, ttl)</span>
      </div>
    </div>
  );
}
