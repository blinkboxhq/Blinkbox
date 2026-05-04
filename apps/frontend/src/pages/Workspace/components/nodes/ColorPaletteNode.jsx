import { Palette } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function ColorPaletteNode({ config = {}, updateConfig, nodeId }) {
  const source      = config.source      ?? 'prompt'; // prompt | image | color
  const prompt      = config.prompt      ?? '';
  const imageUrl    = config.imageUrl    ?? '';
  const baseColor   = config.baseColor   ?? '#6366f1';
  const count       = config.count       ?? 5;
  const model       = config.model       ?? 'gpt-4o-mini';
  const format      = config.format      ?? 'hex'; // hex | rgb | hsl
  const harmony     = config.harmony     ?? 'auto'; // auto | complementary | analogous | triadic | split | monochromatic
  const apiKey      = config.apiKey      ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
          <Palette className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Color Palette</div>
          <div className="text-[11px] text-zinc-500">Generate a palette from prompt, image or seed color</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Source</label>
        <div className="flex gap-1.5">
          {[
            { value: 'prompt', label: 'From Prompt' },
            { value: 'image',  label: 'From Image' },
            { value: 'color',  label: 'From Color' },
          ].map((s) => (
            <button key={s.value} onClick={() => updateConfig('source', s.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${source === s.value ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {source === 'prompt' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Describe the Mood / Theme</label>
          <SmartVariableInput value={prompt} onChange={(v) => updateConfig('prompt', v)}
            placeholder="ocean sunset, warm and calming  or  {{ $json.brandDesc }}" multiline />
        </div>
      )}

      {source === 'image' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Image URL</label>
          <SmartVariableInput value={imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="{{ $json.imageUrl }}" />
        </div>
      )}

      {source === 'color' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Seed Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={baseColor} onChange={(e) => updateConfig('baseColor', e.target.value)}
              className="w-10 h-9 rounded cursor-pointer border-0 bg-transparent" />
            <input value={baseColor} onChange={(e) => updateConfig('baseColor', e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
          </div>
        </div>
      )}

      {source === 'color' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Color Harmony</label>
          <div className="grid grid-cols-3 gap-1.5">
            {['auto','complementary','analogous','triadic','split','monochromatic'].map((h) => (
              <button key={h} onClick={() => updateConfig('harmony', h)}
                className={`py-1.5 rounded-lg text-[10px] font-bold capitalize border transition-all ${harmony === h ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Colors</label>
          <input type="number" min={2} max={12} value={count} onChange={(e) => updateConfig('count', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Format</label>
          <div className="flex gap-1">
            {['hex','rgb','hsl'].map((f) => (
              <button key={f} onClick={() => updateConfig('format', f)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${format === f ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {source !== 'color' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Model</label>
            <select value={model} onChange={(e) => updateConfig('model', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku</option>
              <option value="gemini-2.0-flash">Gemini Flash</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
            <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="violet"
        label="API Key"
        placeholder="Select API Key..."
      />
          </div>
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">colors array, names array, mood description</span>
      </div>
    </div>
  );
}
