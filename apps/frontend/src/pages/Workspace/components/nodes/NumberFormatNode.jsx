import { Hash } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const OPERATIONS = [
  { value: 'round',    label: 'Round' },
  { value: 'floor',   label: 'Floor' },
  { value: 'ceil',    label: 'Ceil' },
  { value: 'fixed',   label: 'Fixed Decimals' },
  { value: 'currency',label: 'Currency' },
  { value: 'percent', label: 'Percentage' },
  { value: 'abs',     label: 'Absolute Value' },
  { value: 'pad',     label: 'Zero Pad' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD'];

export default function NumberFormatNode({ config = {}, updateConfig }) {
  const op = config.operation ?? 'round';
  const field = config.field ?? '';
  const decimals = config.decimals ?? 2;
  const currency = config.currency ?? 'USD';
  const padLength = config.padLength ?? 6;
  const outputField = config.outputField ?? 'result';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Hash className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Number Format</div>
          <div className="text-[11px] text-zinc-500">Round, format, or convert a number</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.price }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig('operation', o.value)}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${op === o.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {(op === 'fixed' || op === 'currency' || op === 'percent') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Decimal Places</label>
          <input type="number" min={0} max={10} value={decimals} onChange={(e) => updateConfig('decimals', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {op === 'currency' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Currency</label>
          <select value={currency} onChange={(e) => updateConfig('currency', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {op === 'pad' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pad Length</label>
          <input type="number" min={1} max={20} value={padLength} onChange={(e) => updateConfig('padLength', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
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
