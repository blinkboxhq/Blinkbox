import { Regex } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function RegexMatchNode({ config = {}, updateConfig, nodeId }) {
  const field = config.field ?? '';
  const pattern = config.pattern ?? '';
  const flags = config.flags ?? 'gi';
  const mode = config.mode ?? 'test'; // 'test' | 'match' | 'extract'
  const group = config.group ?? 0;
  const outputField = config.outputField ?? 'result';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
          <Regex className="w-4 h-4 text-pink-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Regex Match</div>
          <div className="text-[11px] text-zinc-500">Test or extract with a regular expression</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.text }}" nodeId={nodeId} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pattern</label>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-zinc-500">
          <span className="text-zinc-600 font-mono text-[13px]">/</span>
          <input value={pattern} onChange={(e) => updateConfig('pattern', e.target.value)} placeholder="\d+"
            className="flex-1 bg-transparent text-[13px] text-zinc-100 font-mono focus:outline-none px-1" />
          <span className="text-zinc-600 font-mono text-[13px]">/</span>
          <input value={flags} onChange={(e) => updateConfig('flags', e.target.value)} placeholder="gi" maxLength={4}
            className="w-8 bg-transparent text-[13px] text-pink-400 font-mono focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'test',    label: 'Test (true/false)' },
            { value: 'match',   label: 'Match All' },
            { value: 'extract', label: 'Extract Group' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'extract' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Capture Group</label>
          <input type="number" min={0} value={group} onChange={(e) => updateConfig('group', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          <p className="text-[10px] text-zinc-600 mt-1">0 = full match, 1+ = capture group index</p>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="result"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>
    </div>
  );
}
