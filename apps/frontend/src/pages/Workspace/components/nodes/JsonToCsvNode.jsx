import { Table2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function JsonToCsvNode({ config = {}, updateConfig, nodeId }) {
  const direction = config.direction ?? 'json_to_csv'; // 'json_to_csv' | 'csv_to_json'
  const field = config.field ?? '';
  const delimiter = config.delimiter ?? ',';
  const includeHeaders = config.includeHeaders ?? true;
  const outputField = config.outputField ?? 'result';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Table2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">JSON ↔ CSV</div>
          <div className="text-[11px] text-zinc-500">Convert between JSON arrays and CSV</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Direction</label>
        <div className="flex gap-1.5">
          {[
            { value: 'json_to_csv', label: 'JSON → CSV' },
            { value: 'csv_to_json', label: 'CSV → JSON' },
          ].map((d) => (
            <button key={d.value} onClick={() => updateConfig('direction', d.value)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all ${direction === d.value ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder={direction === 'json_to_csv' ? '{{ $json.rows }}' : '{{ $json.csv }}'} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Delimiter</label>
          <input value={delimiter} onChange={(e) => updateConfig('delimiter', e.target.value)} maxLength={3}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Headers</label>
          <button onClick={() => updateConfig('includeHeaders', !includeHeaders)}
            className={`w-full py-2 rounded-lg text-[12px] font-bold border transition-all ${includeHeaders ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
            {includeHeaders ? 'Include' : 'Exclude'}
          </button>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="result"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>
    </div>
  );
}
