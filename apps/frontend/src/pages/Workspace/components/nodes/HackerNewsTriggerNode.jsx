import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const FEED_TYPES = [
  { value: 'top', label: 'Top stories' },
  { value: 'new', label: 'New stories' },
  { value: 'best', label: 'Best stories' },
  { value: 'ask', label: 'Ask HN' },
  { value: 'show', label: 'Show HN' },
];

export default function HackerNewsTriggerNode({ config = {}, updateConfig, nodeId }) {
  const feedType = config.feedType || 'top';
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-orange-400">Hacker News</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Feed</label>
          <div className="flex flex-wrap gap-1">
            {FEED_TYPES.map((f) => (
              <button key={f.value} onClick={() => updateConfig?.('feedType', f.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${feedType === f.value ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-[#111] border-[#222] text-zinc-500 hover:text-zinc-300'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Keyword filter <span className="text-zinc-700">(optional)</span></label>
          <SmartVariableInput value={config.keyword || ''} onChange={(v) => updateConfig?.('keyword', v)} placeholder="AI, startup, Python…" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Min points</label>
          <SmartVariableInput value={config.minPoints || '10'} onChange={(v) => updateConfig?.('minPoints', v)} placeholder="10" />
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.id', '$trigger.title', '$trigger.url', '$trigger.score', '$trigger.by', '$trigger.time'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
