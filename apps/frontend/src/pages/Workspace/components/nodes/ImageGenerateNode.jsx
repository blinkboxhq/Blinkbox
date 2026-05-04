import { Image } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const PROVIDERS = [
  { value: 'openai',   label: 'DALL-E (OpenAI)' },
  { value: 'stability',label: 'Stable Diffusion' },
  { value: 'fal',      label: 'Fal.ai (FLUX)' },
];

const DALLE_MODELS   = ['dall-e-3', 'dall-e-2'];
const DALLE_SIZES    = ['1024x1024', '1792x1024', '1024x1792'];
const DALLE_QUALITY  = ['standard', 'hd'];
const DALLE_STYLE    = ['vivid', 'natural'];
const SD_MODELS      = ['stable-diffusion-xl-1024-v1-0', 'stable-diffusion-v1-6'];
const FAL_MODELS     = ['fal-ai/flux/schnell', 'fal-ai/flux/dev', 'fal-ai/flux-pro'];

export default function ImageGenerateNode({ config = {}, updateConfig, nodeId }) {
  const provider  = config.provider  ?? 'openai';
  const prompt    = config.prompt    ?? '';
  const negative  = config.negative  ?? '';
  const model     = config.model     ?? 'dall-e-3';
  const size      = config.size      ?? '1024x1024';
  const quality   = config.quality   ?? 'standard';
  const style     = config.style     ?? 'vivid';
  const n         = config.n         ?? 1;
  const steps     = config.steps     ?? 30;
  const cfgScale  = config.cfgScale  ?? 7;
  const seed      = config.seed      ?? '';
  const apiKey    = config.apiKey    ?? '';
  const outputField = config.outputField ?? 'imageUrl';

  const setProvider = (p) => {
    updateConfig('provider', p);
    updateConfig('model', p === 'openai' ? 'dall-e-3' : p === 'stability' ? SD_MODELS[0] : FAL_MODELS[0]);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
          <Image className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Image Generate</div>
          <div className="text-[11px] text-zinc-500">DALL-E 3, Stable Diffusion, FLUX</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Provider</label>
        <div className="flex gap-1.5">
          {PROVIDERS.map((p) => (
            <button key={p.value} onClick={() => setProvider(p.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${provider === p.value ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Prompt</label>
        <SmartVariableInput value={prompt} onChange={(v) => updateConfig('prompt', v)}
          placeholder="a photorealistic cat astronaut on the moon, 4k" multiline />
      </div>

      {provider !== 'openai' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Negative Prompt</label>
          <SmartVariableInput value={negative} onChange={(v) => updateConfig('negative', v)}
            placeholder="blurry, low quality, watermark, text" multiline />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
        <select value={model} onChange={(e) => updateConfig('model', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
          {(provider === 'openai' ? DALLE_MODELS : provider === 'stability' ? SD_MODELS : FAL_MODELS)
            .map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {provider === 'openai' && (
        <>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Size</label>
              <select value={size} onChange={(e) => updateConfig('size', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
                {DALLE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Quality</label>
              <div className="flex gap-1.5">
                {DALLE_QUALITY.map((q) => (
                  <button key={q} onClick={() => updateConfig('quality', q)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold capitalize border transition-all ${quality === q ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Style</label>
            <div className="flex gap-1.5">
              {DALLE_STYLE.map((s) => (
                <button key={s} onClick={() => updateConfig('style', s)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize border transition-all ${style === s ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Number of Images</label>
            <input type="number" min={1} max={4} value={n} onChange={(e) => updateConfig('n', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        </>
      )}

      {provider === 'stability' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Steps</label>
            <input type="number" min={10} max={150} value={steps} onChange={(e) => updateConfig('steps', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">CFG Scale</label>
            <input type="number" min={1} max={35} step={0.5} value={cfgScale} onChange={(e) => updateConfig('cfgScale', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Seed</label>
            <input type="number" value={seed} onChange={(e) => updateConfig('seed', e.target.value)} placeholder="random"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="violet"
        label="OpenAI / Stability API Key"
        placeholder="Select OpenAI / Stability API Key..."
      />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="imageUrl"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">imageUrl (or array), revisedPrompt, model, size</span>
      </div>
    </div>
  );
}
