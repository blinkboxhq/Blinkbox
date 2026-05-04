import { Image } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function ThumbnailGeneratorNode({ config = {}, updateConfig, nodeId }) {
  const title       = config.title       ?? '';
  const style       = config.style       ?? 'youtube'; // youtube | podcast | blog | twitter
  const bgType      = config.bgType      ?? 'ai'; // ai | color | image
  const bgPrompt    = config.bgPrompt    ?? '';
  const bgColor     = config.bgColor     ?? '#1a1a2e';
  const bgImage     = config.bgImage     ?? '';
  const faceUrl     = config.faceUrl     ?? '';
  const logoUrl     = config.logoUrl     ?? '';
  const accentColor = config.accentColor ?? '#ff0050';
  const model       = config.model       ?? 'gpt-4o';
  const apiKey      = config.apiKey      ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Image className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Thumbnail Generator</div>
          <div className="text-[11px] text-zinc-500">AI-generate a platform-optimized thumbnail</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Platform Style</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: 'youtube', label: 'YouTube (1280×720)' },
            { value: 'podcast', label: 'Podcast (3000×3000)' },
            { value: 'blog',    label: 'Blog (1200×630)' },
            { value: 'twitter', label: 'Twitter Card (1200×628)' },
          ].map((s) => (
            <button key={s.value} onClick={() => updateConfig('style', s.value)}
              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${style === s.value ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title / Headline</label>
        <SmartVariableInput value={title} onChange={(v) => updateConfig('title', v)} placeholder="{{ $json.title }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Background Type</label>
        <div className="flex gap-1.5">
          {[
            { value: 'ai',    label: 'AI Generated' },
            { value: 'color', label: 'Solid Color' },
            { value: 'image', label: 'Custom Image' },
          ].map((b) => (
            <button key={b.value} onClick={() => updateConfig('bgType', b.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${bgType === b.value ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {bgType === 'ai' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Background Prompt</label>
          <SmartVariableInput value={bgPrompt} onChange={(v) => updateConfig('bgPrompt', v)}
            placeholder="cinematic tech city night, neon lights, dramatic" multiline />
        </div>
      )}
      {bgType === 'color' && (
        <div className="flex gap-2 items-center">
          <input type="color" value={bgColor} onChange={(e) => updateConfig('bgColor', e.target.value)}
            className="w-10 h-9 rounded cursor-pointer border-0" />
          <input value={bgColor} onChange={(e) => updateConfig('bgColor', e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none" />
        </div>
      )}
      {bgType === 'image' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Background Image URL</label>
          <SmartVariableInput value={bgImage} onChange={(v) => updateConfig('bgImage', v)} placeholder="{{ $json.bgUrl }}" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Face / Person Image URL (optional)</label>
        <SmartVariableInput value={faceUrl} onChange={(v) => updateConfig('faceUrl', v)} placeholder="{{ $json.profilePhoto }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Channel / Brand Logo URL (optional)</label>
        <SmartVariableInput value={logoUrl} onChange={(v) => updateConfig('logoUrl', v)} placeholder="{{ $json.logoUrl }}" />
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Accent Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={accentColor} onChange={(e) => updateConfig('accentColor', e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border-0" />
            <input value={accentColor} onChange={(e) => updateConfig('accentColor', e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none" />
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Model</label>
          <select value={model} onChange={(e) => updateConfig('model', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="gpt-4o">GPT-4o</option>
            <option value="dall-e-3">DALL-E 3</option>
            <option value="gemini-2.0-flash">Gemini Flash</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="violet"
        label="API Key"
        placeholder="Select API Key..."
      />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">imageUrl (PNG), width, height, style</span>
      </div>
    </div>
  );
}
