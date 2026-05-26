import { Shuffle } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

export default function RandomPickNode({ config = {}, updateConfig, nodeId }) {
  const mode   = config.mode   ?? 'one'; // one | multiple | shuffle | weighted
  const array  = config.array  ?? '';
  const count  = config.count  ?? 1;
  const seed   = config.seed   ?? '';
  const unique = config.unique ?? true;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
          <Shuffle className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Random Pick</div>
          <div className="text-[11px] text-zinc-500">Pick random items, shuffle or sample from any array</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'one',      label: 'Pick One' },
            { value: 'multiple', label: 'Pick N' },
            { value: 'shuffle',  label: 'Shuffle All' },
            { value: 'weighted', label: 'Weighted Pick' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Array</label>
        <SmartVariableInput value={array} onChange={(v) => updateConfig('array', v)}
          placeholder='{{ $json.items }}  or  ["a","b","c","d"]' multiline />
        {mode === 'weighted' && <p className="text-[10px] text-zinc-600 mt-1">For weighted: array of {`{ item, weight }`} objects</p>}
      </div>

      {mode === 'multiple' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">How Many to Pick</label>
          <input type="number" min={1} value={count} onChange={(e) => updateConfig('count', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {mode === 'multiple' && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div>
            <p className="text-[12px] font-semibold text-zinc-300">No Duplicates</p>
            <p className="text-[10px] text-zinc-600">Each item picked at most once</p>
          </div>
          <button onClick={() => updateConfig('unique', !unique)}
            className={`w-10 h-5 rounded-full border transition-all relative ${unique ? 'bg-fuchsia-500 border-fuchsia-400' : 'bg-zinc-700 border-zinc-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${unique ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Seed (optional — for reproducibility)</label>
        <input value={seed} onChange={(e) => updateConfig('seed', e.target.value)} placeholder="42"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'one'      && <>Returns: <span className="text-zinc-300">item (single value), index</span></>}
        {mode === 'multiple' && <>Returns: <span className="text-zinc-300">items[] (picked values), indices[]</span></>}
        {mode === 'shuffle'  && <>Returns: <span className="text-zinc-300">items[] (full shuffled array)</span></>}
        {mode === 'weighted' && <>Returns: <span className="text-zinc-300">item, weight, probability</span></>}
      </div>
    </div>
  );
}
