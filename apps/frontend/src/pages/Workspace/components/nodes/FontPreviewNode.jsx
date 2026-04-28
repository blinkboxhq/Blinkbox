import { PenTool } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const SAMPLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Source Code Pro', 'Fira Code',
  'Pacifico', 'Dancing Script', 'Bebas Neue', 'Anton', 'Oswald',
];

export default function FontPreviewNode({ config = {}, updateConfig }) {
  const text        = config.text        ?? 'The quick brown fox';
  const font        = config.font        ?? 'Inter';
  const fontSize    = config.fontSize    ?? 48;
  const fontWeight  = config.fontWeight  ?? '400';
  const color       = config.color       ?? '#ffffff';
  const bgColor     = config.bgColor     ?? '#18181b';
  const width       = config.width       ?? 800;
  const height      = config.height      ?? 200;
  const padding     = config.padding     ?? 40;
  const outputField = config.outputField ?? 'imageUrl';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <PenTool className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Font Preview</div>
          <div className="text-[11px] text-zinc-500">Render text in any Google Font and export as image</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Text</label>
        <SmartVariableInput value={text} onChange={(v) => updateConfig('text', v)} placeholder='{{ $json.title }}' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Font Family</label>
        <input value={font} onChange={(e) => updateConfig('font', e.target.value)} placeholder="Inter"
          list="font-suggestions"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        <datalist id="font-suggestions">
          {SAMPLE_FONTS.map((f) => <option key={f} value={f} />)}
        </datalist>
        <p className="text-[10px] text-zinc-600 mt-1">Any Google Fonts family name</p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Font Size (px)</label>
          <input type="number" min={8} max={200} value={fontSize} onChange={(e) => updateConfig('fontSize', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Weight</label>
          <select value={fontWeight} onChange={(e) => updateConfig('fontWeight', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {['100','200','300','400','500','600','700','800','900'].map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Text Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={color} onChange={(e) => updateConfig('color', e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border-0" />
            <input value={color} onChange={(e) => updateConfig('color', e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none" />
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Background</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={bgColor} onChange={(e) => updateConfig('bgColor', e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border-0" />
            <input value={bgColor} onChange={(e) => updateConfig('bgColor', e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Width (px)</label>
          <input type="number" min={100} max={2400} value={width} onChange={(e) => updateConfig('width', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Height (px)</label>
          <input type="number" min={50} max={1600} value={height} onChange={(e) => updateConfig('height', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Padding (px)</label>
          <input type="number" min={0} max={200} value={padding} onChange={(e) => updateConfig('padding', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="imageUrl"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">imageUrl (PNG), width, height, font, text</span>
      </div>
    </div>
  );
}
