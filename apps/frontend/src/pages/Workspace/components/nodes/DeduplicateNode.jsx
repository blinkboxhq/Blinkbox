import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function DeduplicateNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-violet-400">Deduplicate</span>
          <span className="text-[10px] text-zinc-500">Remove duplicate items from array</span>
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
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unique Key Field</label>
        <SmartVariableInput
          value={config.field || ""}
          onChange={(v) => updateConfig("field", v)}
          placeholder="email  (blank = deep equality on whole item)"
        />
        <p className="text-[10px] text-zinc-600">Dot-path to field used to determine uniqueness</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">When Duplicate Found, Keep</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: "first", label: "First occurrence" }, { value: "last", label: "Last occurrence" }].map((o) => (
            <button
              key={o.value}
              onClick={() => updateConfig("keep", o.value)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                (config.keep || "first") === o.value
                  ? "bg-violet-500/10 border-violet-500/40 text-violet-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Key</label>
        <input
          value={config.outputKey || "items"}
          onChange={(e) => updateConfig("outputKey", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/40"
        />
      </div>
    </div>
  );
}
