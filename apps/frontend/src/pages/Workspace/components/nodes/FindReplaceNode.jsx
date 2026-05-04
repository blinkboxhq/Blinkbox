import { Replace } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function FindReplaceNode({ config = {}, updateConfig, nodeId }) {
  const field = config.field ?? '';
  const find = config.find ?? '';
  const replace = config.replace ?? '';
  const useRegex = config.useRegex ?? false;
  const flags = config.flags ?? 'gi';
  const outputField = config.outputField ?? 'result';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Replace className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Find & Replace</div>
          <div className="text-[11px] text-zinc-500">Search and substitute text</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.text }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Find</label>
        <SmartVariableInput value={find} onChange={(v) => updateConfig('find', v)} placeholder="old text or regex" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Replace With</label>
        <SmartVariableInput value={replace} onChange={(v) => updateConfig('replace', v)} placeholder="new text or $1 for groups" />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Use Regex</p>
          <p className="text-[10px] text-zinc-600">Treat find as a regular expression</p>
        </div>
        <button onClick={() => updateConfig('useRegex', !useRegex)}
          className={`w-10 h-5 rounded-full border transition-all relative ${useRegex ? 'bg-orange-500 border-orange-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${useRegex ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      {useRegex && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Flags</label>
          <input value={flags} onChange={(e) => updateConfig('flags', e.target.value)} placeholder="gi"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
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
