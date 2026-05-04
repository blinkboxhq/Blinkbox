import { Hash } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function HashtagSuggesterNode({ config = {}, updateConfig, nodeId }) {
  const content     = config.content     ?? '';
  const platform    = config.platform    ?? 'instagram';
  const count       = config.count       ?? 20;
  const strategy    = config.strategy    ?? 'mixed'; // viral | niche | mixed | trending
  const model       = config.model       ?? 'gpt-4o-mini';
  const language    = config.language    ?? 'English';
  const includeHash = config.includeHash ?? true;
  const apiKey      = config.apiKey      ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Hash className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Hashtag Suggester</div>
          <div className="text-[11px] text-zinc-500">AI suggests the best hashtags for your content</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Content / Topic</label>
        <SmartVariableInput value={content} onChange={(v) => updateConfig('content', v)}
          placeholder="My post caption, topic or keyword...  {{ $json.caption }}" multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Platform</label>
        <div className="flex flex-wrap gap-1.5">
          {['instagram','tiktok','twitter','youtube','linkedin','pinterest'].map((p) => (
            <button key={p} onClick={() => updateConfig('platform', p)}
              className={`flex-1 min-w-fit py-1.5 px-2 rounded-lg text-[10px] font-bold capitalize border transition-all ${platform === p ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Strategy</label>
        <div className="flex gap-1.5">
          {[
            { value: 'viral',    label: 'Viral',   desc: 'High reach, competitive' },
            { value: 'niche',    label: 'Niche',   desc: 'Targeted, less saturated' },
            { value: 'mixed',    label: 'Mixed',   desc: 'Balance of both' },
            { value: 'trending', label: 'Trending',desc: 'Currently trending' },
          ].map((s) => (
            <button key={s.value} onClick={() => updateConfig('strategy', s.value)}
              className={`flex-1 flex flex-col py-1.5 rounded-lg border transition-all ${strategy === s.value ? 'bg-violet-500/20 border-violet-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[10px] font-bold ${strategy === s.value ? 'text-violet-300' : 'text-zinc-400'}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Number of Hashtags</label>
          <input type="number" min={3} max={50} value={count} onChange={(e) => updateConfig('count', Number(e.target.value))}
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
          <p className="text-[12px] font-semibold text-zinc-300">Include # Symbol</p>
          <p className="text-[10px] text-zinc-600">Prefix each tag with #</p>
        </div>
        <button onClick={() => updateConfig('includeHash', !includeHash)}
          className={`w-10 h-5 rounded-full border transition-all relative ${includeHash ? 'bg-violet-500 border-violet-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${includeHash ? 'left-5' : 'left-0.5'}`} />
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
            <option value="gemini-2.0-flash">Gemini Flash</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
          <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="pink"
        label="API Key"
        placeholder="Select API Key..."
      />
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">hashtags[] (array), hashtagString (ready to paste), platform</span>
      </div>
    </div>
  );
}
