import { Link2 } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const PARTS = ['href', 'protocol', 'hostname', 'port', 'pathname', 'search', 'hash', 'origin'];

export default function UrlParserNode({ config = {}, updateConfig, nodeId }) {
  const field = config.field ?? '';
  const extract = config.extract ?? 'all'; // 'all' | specific part
  const outputField = config.outputField ?? 'parsed';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <Link2 className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">URL Parser</div>
          <div className="text-[11px] text-zinc-500">Extract domain, path, params from a URL</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">URL Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.url }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Extract</label>
        <div className="grid grid-cols-3 gap-1.5">
          {['all', ...PARTS].map((p) => (
            <button key={p} onClick={() => updateConfig('extract', p)}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${extract === p ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p}
            </button>
          ))}
        </div>
        {extract === 'all' && <p className="text-[10px] text-zinc-600 mt-1.5">Returns an object with all URL parts.</p>}
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="parsed"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>
    </div>
  );
}
