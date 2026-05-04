import { Edit2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function CaptionWriterNode({ config = {}, updateConfig, nodeId }) {
  const topic       = config.topic       ?? '';
  const platform    = config.platform    ?? 'instagram';
  const tone        = config.tone        ?? 'engaging'; // engaging | funny | professional | inspirational | educational | casual
  const length      = config.length      ?? 'medium'; // short | medium | long
  const cta         = config.cta         ?? ''; // call to action
  const emojis      = config.emojis      ?? true;
  const variations  = config.variations  ?? 1;
  const model       = config.model       ?? 'gpt-4o-mini';
  const language    = config.language    ?? 'English';
  const apiKey      = config.apiKey      ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
          <Edit2 className="w-4 h-4 text-pink-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Caption Writer</div>
          <div className="text-[11px] text-zinc-500">AI writes scroll-stopping social media captions</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Topic / Content</label>
        <SmartVariableInput value={topic} onChange={(v) => updateConfig('topic', v)}
          placeholder="My new video about productivity hacks  or  {{ $json.postTopic }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Platform</label>
        <div className="flex flex-wrap gap-1.5">
          {['instagram','tiktok','twitter','linkedin','youtube','facebook'].map((p) => (
            <button key={p} onClick={() => updateConfig('platform', p)}
              className={`flex-1 min-w-fit py-1.5 px-2 capitalize rounded-lg text-[10px] font-bold border transition-all ${platform === p ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tone</label>
        <div className="grid grid-cols-3 gap-1.5">
          {['engaging','funny','professional','inspirational','educational','casual'].map((t) => (
            <button key={t} onClick={() => updateConfig('tone', t)}
              className={`py-1.5 capitalize rounded-lg text-[10px] font-bold border transition-all ${tone === t ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Length</label>
        <div className="flex gap-1.5">
          {[
            { value: 'short',  label: 'Short', desc: '1–2 lines' },
            { value: 'medium', label: 'Medium', desc: '3–5 lines' },
            { value: 'long',   label: 'Long', desc: '6+ lines' },
          ].map((l) => (
            <button key={l.value} onClick={() => updateConfig('length', l.value)}
              className={`flex-1 flex flex-col py-1.5 rounded-lg border transition-all ${length === l.value ? 'bg-pink-500/20 border-pink-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[11px] font-bold ${length === l.value ? 'text-pink-300' : 'text-zinc-400'}`}>{l.label}</span>
              <span className="text-[9px] text-zinc-600">{l.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Call to Action (optional)</label>
        <SmartVariableInput value={cta} onChange={(v) => updateConfig('cta', v)} placeholder="Link in bio! / Save this post / Drop a comment" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Variations</label>
          <input type="number" min={1} max={5} value={variations} onChange={(e) => updateConfig('variations', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Language</label>
          <input value={language} onChange={(e) => updateConfig('language', e.target.value)} placeholder="English"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Include Emojis</p>
          <p className="text-[10px] text-zinc-600">Add relevant emojis to caption</p>
        </div>
        <button onClick={() => updateConfig('emojis', !emojis)}
          className={`w-10 h-5 rounded-full border transition-all relative ${emojis ? 'bg-pink-500 border-pink-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${emojis ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Model</label>
          <select value={model} onChange={(e) => updateConfig('model', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku</option>
            <option value="claude-sonnet-4-6">Claude Sonnet</option>
            <option value="gemini-2.0-flash">Gemini Flash</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
          <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="violet"
        label="LLM API Key"
        placeholder="Select LLM API Key..."
      />
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">caption (string){variations > 1 ? ', captions[] (all variations)' : ''}, platform, tone</span>
      </div>
    </div>
  );
}
