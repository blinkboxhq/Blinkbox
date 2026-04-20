import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "diffObjects", label: "Diff Objects" },
  { id: "diffArrays", label: "Diff Arrays" },
  { id: "findNewItems", label: "New Items" },
  { id: "findRemovedItems", label: "Removed Items" },
  { id: "findChanged", label: "Changed Items" },
];

export default function DataDiffNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "diffObjects";
  const isArrayOp = ["diffArrays", "findNewItems", "findRemovedItems", "findChanged"].includes(operation);

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-cyan-400">Data Diff</span>
          <span className="text-[10px] text-zinc-500">Deep compare two objects or arrays, detect exactly what changed</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.id}
              onClick={() => updateConfig("operation", op.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                operation === op.id
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Before</label>
        <SmartVariableInput
          value={config.before || ""}
          onChange={(v) => updateConfig("before", v)}
          placeholder='{{upstream.data}} or {"key": "value"}'
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">After</label>
        <SmartVariableInput
          value={config.after || ""}
          onChange={(v) => updateConfig("after", v)}
          placeholder='{{upstream.newData}} or {"key": "value"}'
          multiline
          nodeId={nodeId}
        />
      </div>

      {isArrayOp && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Array Key (identity field)</label>
          <input
            value={config.arrayKey || ""}
            onChange={(e) => updateConfig("arrayKey", e.target.value)}
            placeholder="id"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/40"
          />
          <span className="text-[9px] text-zinc-600">Field used to match items across arrays (e.g. "id", "email")</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ignore Paths</label>
        <input
          value={config.ignorePaths || ""}
          onChange={(e) => updateConfig("ignorePaths", e.target.value)}
          placeholder="updatedAt, meta.timestamp"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/40"
        />
        <span className="text-[9px] text-zinc-600">Comma-separated dot-paths to ignore</span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Format</label>
        <div className="grid grid-cols-3 gap-2">
          {[{ id: "detailed", label: "Detailed" }, { id: "summary", label: "Summary" }, { id: "paths", label: "Paths Only" }].map((f) => (
            <button
              key={f.id}
              onClick={() => updateConfig("outputFormat", f.id)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                (config.outputFormat || "detailed") === f.id
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Depth</label>
        <input
          type="range" min="1" max="20" step="1"
          value={config.maxDepth ?? 10}
          onChange={(e) => updateConfig("maxDepth", parseInt(e.target.value))}
          className="accent-cyan-500"
        />
        <span className="text-[9px] text-zinc-600 text-center">{config.maxDepth ?? 10} levels</span>
      </div>
    </div>
  );
}
