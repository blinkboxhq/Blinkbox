const STRATEGIES = [
  { value: "parallel",     label: "Parallel",     desc: "Send to all workers simultaneously" },
  { value: "round_robin",  label: "Round Robin",  desc: "Distribute one task at a time in order" },
  { value: "smart",        label: "AI Smart",     desc: "AI decides which worker gets each task" },
  { value: "load_balance", label: "Load Balance", desc: "Send to the least busy worker" },
];

export default function DistributorNode({ config = {}, updateConfig }) {
  const workers = config.workers || 3;
  const strategy = config.strategy || "parallel";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-[13px] font-bold text-zinc-100">Task Distributor</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">Fan-out tasks across parallel worker nodes</p>
      </div>

      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
          Workers — <span className="text-violet-400">{workers}</span>
        </label>
        <input type="range" min={2} max={10} value={workers}
          onChange={e => updateConfig("workers", Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-[9px] text-zinc-600 mt-1"><span>2</span><span>10</span></div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Distribution Strategy</label>
        <div className="flex flex-col gap-1.5">
          {STRATEGIES.map(s => (
            <button key={s.value} onClick={() => updateConfig("strategy", s.value)}
              className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
                strategy === s.value
                  ? "bg-violet-500/10 border-violet-500/40"
                  : "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
              }`}>
              <div className="flex-1">
                <div className={`text-[12px] font-semibold ${strategy === s.value ? "text-violet-300" : "text-zinc-400"}`}>{s.label}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">{s.desc}</div>
              </div>
              {strategy === s.value && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Output Merge Strategy</label>
        <select value={config.mergeStrategy || "array"}
          onChange={e => updateConfig("mergeStrategy", e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500">
          <option value="array">Array (collect all results)</option>
          <option value="first">First result wins</option>
          <option value="merge">Deep merge objects</option>
          <option value="none">No merge (fire and forget)</option>
        </select>
      </div>
    </div>
  );
}
