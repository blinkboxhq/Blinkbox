import { GitMerge } from 'lucide-react';
export default function MergeNode({ config = {}, updateConfig }) {
  const mode = config.mode || "combine";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center shrink-0">
            <GitMerge className="w-4 h-4 text-[#8B5CF6]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-teal-400">Merge</span>
          <span className="text-[10px] text-zinc-500">Combine outputs from parallel branches</span>
        </div>
      </div>

      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-[11px] text-zinc-500 leading-relaxed">
        Connect multiple upstream nodes to this Merge node. It waits for all branches to finish, then combines their outputs.
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Merge Mode</label>
        <div className="flex flex-col gap-2">
          {[
            { value: "combine", label: "Combine (flat merge)", desc: "Shallow-merge all fields into one object" },
            { value: "array",   label: "Array",                desc: "Wrap each branch's output as an array element" },
            { value: "first",   label: "First",                desc: "Keep only the first non-empty branch output" },
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => updateConfig("mode", m.value)}
              className={`flex flex-col items-start gap-0.5 p-3 rounded-lg border text-left transition-all ${
                mode === m.value
                  ? "bg-teal-500/10 border-teal-500/40"
                  : "bg-[#0a0a0a] border-[#222] hover:border-[#333]"
              }`}
            >
              <span className={`text-xs font-bold ${mode === m.value ? "text-teal-400" : "text-zinc-300"}`}>{m.label}</span>
              <span className="text-[10px] text-zinc-500">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === "array" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Array Key</label>
          <input
            value={config.key || "merged"}
            onChange={(e) => updateConfig("key", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-teal-500/40"
          />
        </div>
      )}
    </div>
  );
}
