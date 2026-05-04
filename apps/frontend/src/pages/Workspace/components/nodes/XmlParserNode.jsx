import { Code2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function XmlParserNode({ config = {}, updateConfig, nodeId }) {
  const field = config.field ?? '';
  const mode = config.mode ?? 'parse'; // 'parse' | 'build'
  const extractPath = config.extractPath ?? '';
  const outputField = config.outputField ?? 'result';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Code2 className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">XML Parser</div>
          <div className="text-[11px] text-zinc-500">Parse XML to JSON or build XML from JSON</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[{ value: 'parse', label: 'XML → JSON' }, { value: 'build', label: 'JSON → XML' }].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all ${mode === m.value ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.xml }}" />
      </div>

      {mode === 'parse' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Extract Path (optional)</label>
          <input value={extractPath} onChange={(e) => updateConfig('extractPath', e.target.value)} placeholder="root.items.item"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
          <p className="text-[10px] text-zinc-600 mt-1">Dot-notation path to extract a nested node. Leave empty to parse full XML.</p>
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
