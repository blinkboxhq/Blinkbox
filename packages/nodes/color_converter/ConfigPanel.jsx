import { Palette } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const FORMATS = ['hex', 'rgb', 'rgba', 'hsl', 'hsla', 'hsv'];

export default function ColorConverterNode({ config = {}, updateConfig, nodeId }) {
  const field = config.field ?? '';
  const from = config.from ?? 'hex';
  const to = config.to ?? 'rgb';
  const outputField = config.outputField ?? 'color';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
          <Palette className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Color Converter</div>
          <div className="text-[11px] text-zinc-500">Convert between HEX, RGB, HSL and more</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Color Field</label>
        <SmartVariableInput value={field} onChange={(v) => updateConfig('field', v)} placeholder="{{ $json.color }}" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">From</label>
          <div className="flex flex-col gap-1">
            {FORMATS.map((f) => (
              <button key={f} onClick={() => updateConfig('from', f)}
                className={`py-1 px-2 rounded-md text-[11px] font-bold border transition-all text-left ${from === f ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center text-zinc-600 text-xl mt-6">→</div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">To</label>
          <div className="flex flex-col gap-1">
            {FORMATS.map((f) => (
              <button key={f} onClick={() => updateConfig('to', f)}
                className={`py-1 px-2 rounded-md text-[11px] font-bold border transition-all text-left ${to === f ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="color"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>
    </div>
  );
}
