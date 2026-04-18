import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function BatchSplitNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-orange-400">Batch Split</span>
          <span className="text-[10px] text-zinc-500">Chunk an array into smaller batches</span>
        </div>
      </div>

      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-[11px] text-zinc-500 leading-relaxed">
        Useful for rate-limiting: process 1000 items in batches of 50. Each batch becomes a separate item in the output array.
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
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Batch Size</label>
        <input
          type="number"
          min="1"
          max="10000"
          value={config.batchSize || 10}
          onChange={(e) => updateConfig("batchSize", Number(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
        />
        <p className="text-[10px] text-zinc-600">Number of items per batch</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Batch Key</label>
        <input
          value={config.outputKey || "batch"}
          onChange={(e) => updateConfig("outputKey", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
        />
        <p className="text-[10px] text-zinc-600">Each output item will have this key containing the batch array</p>
      </div>
    </div>
  );
}
