import { Camera } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function ImageCaptionNode({ config = {}, updateConfig, nodeId }) {
  const imageUrl   = config.imageUrl   ?? '';
  const provider   = config.provider   ?? 'openai';
  const model      = config.model      ?? 'gpt-4o-mini';
  const mode       = config.mode       ?? 'caption'; // caption | detailed | tags | ocr | all
  const language   = config.language   ?? 'English';
  const prompt     = config.prompt     ?? '';
  const apiKey     = config.apiKey     ?? '';

  const MODELS = {
    openai:    ['gpt-4o-mini', 'gpt-4o'],
    anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'],
    google:    ['gemini-2.0-flash', 'gemini-1.5-pro'],
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Camera className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Image Caption</div>
          <div className="text-[11px] text-zinc-500">AI describe, tag or extract text from an image</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Image URL or Base64</label>
        <SmartVariableInput value={imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="{{ $json.imageUrl }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Mode</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: 'caption',  label: 'Caption',  desc: '1 sentence' },
            { value: 'detailed', label: 'Detailed', desc: 'Full description' },
            { value: 'tags',     label: 'Tags',     desc: 'Keyword list' },
            { value: 'ocr',      label: 'OCR Text', desc: 'Extract text' },
            { value: 'objects',  label: 'Objects',  desc: 'Detect objects' },
            { value: 'custom',   label: 'Custom',   desc: 'Your question' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex flex-col py-1.5 px-2 rounded-lg border transition-all text-left ${mode === m.value ? 'bg-violet-500/20 border-violet-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[11px] font-bold ${mode === m.value ? 'text-violet-300' : 'text-zinc-400'}`}>{m.label}</span>
              <span className="text-[9px] text-zinc-600">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'custom' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Custom Question</label>
          <SmartVariableInput value={prompt} onChange={(v) => updateConfig('prompt', v)}
            placeholder="What brand is shown in this image?" multiline />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Provider</label>
        <div className="flex gap-1.5">
          {Object.keys(MODELS).map((p) => (
            <button key={p} onClick={() => { updateConfig('provider', p); updateConfig('model', MODELS[p][0]); }}
              className={`flex-1 py-1.5 capitalize rounded-lg text-[11px] font-bold border transition-all ${provider === p ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
          <select value={model} onChange={(e) => updateConfig('model', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {(MODELS[provider] ?? MODELS.openai).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Language</label>
          <input value={language} onChange={(e) => updateConfig('language', e.target.value)} placeholder="English"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
        <input type="password" value={apiKey} onChange={(e) => updateConfig('apiKey', e.target.value)}
          placeholder={`${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'caption'  && <>Returns: <span className="text-zinc-300">caption string</span></>}
        {mode === 'detailed' && <>Returns: <span className="text-zinc-300">description string, topics array</span></>}
        {mode === 'tags'     && <>Returns: <span className="text-zinc-300">tags string array</span></>}
        {mode === 'ocr'      && <>Returns: <span className="text-zinc-300">extractedText string</span></>}
        {mode === 'objects'  && <>Returns: <span className="text-zinc-300">objects array with label and confidence</span></>}
        {mode === 'custom'   && <>Returns: <span className="text-zinc-300">answer string</span></>}
      </div>
    </div>
  );
}
