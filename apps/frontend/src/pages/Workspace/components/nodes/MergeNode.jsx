import { Merge } from 'lucide-react';

const MODES = [
  { value: 'combine', label: 'Combine', desc: 'Shallow-merge all branch outputs into one object' },
  { value: 'array',   label: 'Array',   desc: 'Wrap outputs in an array under a key' },
  { value: 'first',   label: 'First',   desc: 'Keep only the first non-empty result' },
];

export default function MergeNode({ config = {}, updateConfig }) {
  const mode = config.mode || 'combine';

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl">
        <div className="p-2 rounded-lg shrink-0 bg-teal-500/10 text-teal-400">
          <Merge className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-teal-400">Merge Branches</span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">
            Join parallel paths into one
          </span>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Merge Mode</label>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => updateConfig('mode', m.value)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                mode === m.value
                  ? 'border-teal-500/40 bg-teal-500/10'
                  : 'border-[#222] bg-[#0a0a0a] hover:border-[#333]'
              }`}
            >
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${mode === m.value ? 'bg-teal-400' : 'bg-zinc-600'}`} />
              <div>
                <span className={`text-xs font-bold ${mode === m.value ? 'text-teal-400' : 'text-zinc-300'}`}>{m.label}</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Array key (only needed in "array" mode) */}
      {mode === 'array' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Array Output Key</label>
          <input
            type="text"
            value={config.key || 'merged'}
            onChange={(e) => updateConfig('key', e.target.value)}
            placeholder="merged"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-teal-500 transition-colors placeholder-zinc-700"
          />
        </div>
      )}

      <div className="p-3 bg-teal-500/5 border border-teal-500/10 rounded-lg text-[10px] text-zinc-500 leading-relaxed">
        💡 Place this node after a <strong className="text-zinc-300">Loop</strong> or at the end of parallel branches to collect all results back into one item.
      </div>
    </div>
  );
}
