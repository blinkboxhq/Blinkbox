import { Scissors } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function RemoveBackgroundNode({ config = {}, updateConfig, nodeId }) {
  const imageUrl    = config.imageUrl    ?? '';
  const provider    = config.provider    ?? 'removebg'; // removebg | bria | fal
  const apiKey      = config.apiKey      ?? '';
  const outputFormat= config.outputFormat?? 'png';
  const replaceWith = config.replaceWith ?? 'transparent'; // transparent | color | image
  const bgColor     = config.bgColor     ?? '#ffffff';
  const bgImage     = config.bgImage     ?? '';
  const outputField = config.outputField ?? 'imageUrl';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
          <Scissors className="w-4 h-4 text-pink-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Remove Background</div>
          <div className="text-[11px] text-zinc-500">Strip image background, replace with color or image</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Image URL or Base64</label>
        <SmartVariableInput value={imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="{{ $json.imageUrl }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Provider</label>
        <div className="flex gap-1.5">
          {[
            { value: 'removebg', label: 'Remove.bg' },
            { value: 'bria',     label: 'BRIA AI' },
            { value: 'fal',      label: 'Fal.ai' },
          ].map((p) => (
            <button key={p.value} onClick={() => updateConfig('provider', p.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${provider === p.value ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Replace Background With</label>
        <div className="flex gap-1.5">
          {[
            { value: 'transparent', label: 'Transparent' },
            { value: 'color',       label: 'Solid Color' },
            { value: 'image',       label: 'Image' },
          ].map((r) => (
            <button key={r.value} onClick={() => updateConfig('replaceWith', r.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${replaceWith === r.value ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {replaceWith === 'color' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Background Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={bgColor} onChange={(e) => updateConfig('bgColor', e.target.value)}
              className="w-10 h-9 rounded cursor-pointer border-0 bg-transparent" />
            <input value={bgColor} onChange={(e) => updateConfig('bgColor', e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
          </div>
        </div>
      )}

      {replaceWith === 'image' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Background Image URL</label>
          <SmartVariableInput value={bgImage} onChange={(v) => updateConfig('bgImage', v)} placeholder="{{ $json.bgUrl }}" />
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Format</label>
          <div className="flex gap-1.5">
            {['png', 'jpg', 'webp'].map((f) => (
              <button key={f} onClick={() => updateConfig('outputFormat', f)}
                className={`flex-1 py-1.5 uppercase rounded-lg text-[10px] font-bold border transition-all ${outputFormat === f ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
          <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="imageUrl"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Remove.bg API Key"
        placeholder="Select Remove.bg API Key..."
      />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">imageUrl (base64 or URL), format, width, height</span>
      </div>
    </div>
  );
}
