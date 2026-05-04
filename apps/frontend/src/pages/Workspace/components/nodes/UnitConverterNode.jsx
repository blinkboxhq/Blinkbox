import { ArrowRightLeft } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const CATEGORIES = {
  weight:      { label: 'Weight',      units: ['kg', 'g', 'mg', 'lb', 'oz', 'stone', 'ton'] },
  length:      { label: 'Length',      units: ['m', 'km', 'cm', 'mm', 'mile', 'yard', 'ft', 'in'] },
  temperature: { label: 'Temperature', units: ['celsius', 'fahrenheit', 'kelvin'] },
  volume:      { label: 'Volume',      units: ['l', 'ml', 'gallon', 'quart', 'pint', 'cup', 'fl_oz'] },
  area:        { label: 'Area',        units: ['m2', 'km2', 'cm2', 'ft2', 'acre', 'hectare'] },
  speed:       { label: 'Speed',       units: ['km/h', 'm/s', 'mph', 'knot'] },
  data:        { label: 'Data',        units: ['b', 'kb', 'mb', 'gb', 'tb'] },
  time:        { label: 'Time',        units: ['ms', 's', 'min', 'hr', 'day', 'week', 'month', 'year'] },
};

export default function UnitConverterNode({ config = {}, updateConfig, nodeId }) {
  const field = config.field ?? '';
  const category = config.category ?? 'weight';
  const from = config.from ?? 'kg';
  const to = config.to ?? 'lb';
  const outputField = config.outputField ?? 'converted';
  const units = CATEGORIES[category]?.units ?? [];

  const setCategory = (c) => {
    updateConfig('category', c);
    const u = CATEGORIES[c]?.units ?? [];
    updateConfig('from', u[0] ?? '');
    updateConfig('to', u[1] ?? '');
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <ArrowRightLeft className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Unit Converter</div>
          <div className="text-[11px] text-zinc-500">Convert between units of measurement</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Value Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.value }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Category</label>
        <div className="grid grid-cols-4 gap-1">
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <button key={k} onClick={() => setCategory(k)}
              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${category === k ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">From</label>
          <select value={from} onChange={(e) => updateConfig('from', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="text-zinc-600 text-lg mt-5">→</div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">To</label>
          <select value={to} onChange={(e) => updateConfig('to', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="converted"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>
    </div>
  );
}
