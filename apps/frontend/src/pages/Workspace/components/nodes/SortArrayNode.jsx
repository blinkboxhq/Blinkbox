import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function SortArrayNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-cyan-400">Sort Array</span>
          <span className="text-[10px] text-zinc-500">Sort items by a field value</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Array Path</label>
        <SmartVariableInput
          value={config.arrayPath || ""}
          onChange={(v) => updateConfig("arrayPath", v)}
          placeholder="items  (blank = use entire input)"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sort By Field</label>
        <SmartVariableInput
          value={config.field || ""}
          onChange={(v) => updateConfig("field", v)}
          placeholder="createdAt  (dot-path within each item)"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Direction</label>
        <div className="grid grid-cols-2 gap-2">
          {["asc", "desc"].map((d) => (
            <button
              key={d}
              onClick={() => updateConfig("direction", d)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                (config.direction || "asc") === d
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {d === "asc" ? "Ascending (A→Z)" : "Descending (Z→A)"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</label>
        <select
          value={config.type || "auto"}
          onChange={(e) => updateConfig("type", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/40"
        >
          <option value="auto">Auto-detect</option>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Key</label>
        <input
          value={config.outputKey || "items"}
          onChange={(e) => updateConfig("outputKey", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/40"
        />
      </div>
    </div>
  );
}
