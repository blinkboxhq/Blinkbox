import { Type } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const OPERATIONS = [
  { value: 'uppercase',   label: 'UPPERCASE' },
  { value: 'lowercase',   label: 'lowercase' },
  { value: 'titlecase',   label: 'Title Case' },
  { value: 'trim',        label: 'Trim' },
  { value: 'trim_start',  label: 'Trim Start' },
  { value: 'trim_end',    label: 'Trim End' },
  { value: 'slug',        label: 'Slug' },
  { value: 'truncate',    label: 'Truncate' },
  { value: 'pad_start',   label: 'Pad Start' },
  { value: 'pad_end',     label: 'Pad End' },
  { value: 'reverse',     label: 'Reverse' },
  { value: 'remove_html', label: 'Strip HTML' },
];

export default function TextFormatNode({ config = {}, updateConfig }) {
  const op = config.operation ?? 'uppercase';
  const field = config.field ?? '';
  const length = config.length ?? 100;
  const suffix = config.suffix ?? '...';
  const padChar = config.padChar ?? ' ';
  const padLength = config.padLength ?? 10;
  const outputField = config.outputField ?? 'result';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Type className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Text Format</div>
          <div className="text-[11px] text-zinc-500">Transform and format text values</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.name }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig('operation', o.value)}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${op === o.value ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {op === 'truncate' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Length</label>
            <input type="number" min={1} value={length} onChange={(e) => updateConfig('length', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Suffix</label>
            <input value={suffix} onChange={(e) => updateConfig('suffix', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        </div>
      )}

      {(op === 'pad_start' || op === 'pad_end') && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Length</label>
            <input type="number" min={1} value={padLength} onChange={(e) => updateConfig('padLength', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pad Char</label>
            <input value={padChar} onChange={(e) => updateConfig('padChar', e.target.value)} maxLength={1}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
          </div>
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
