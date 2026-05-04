import { Languages } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const LANGUAGES = [
  'Auto Detect','English','Hindi','Spanish','French','German','Chinese','Japanese',
  'Arabic','Portuguese','Russian','Korean','Italian','Dutch','Turkish','Swedish',
  'Polish','Bengali','Urdu','Tamil','Telugu','Marathi','Gujarati','Punjabi',
];

const PROVIDERS = [
  { value: 'openai',   label: 'OpenAI GPT' },
  { value: 'google',   label: 'Google Translate' },
  { value: 'deepl',    label: 'DeepL' },
  { value: 'anthropic',label: 'Claude' },
];

export default function TranslationNode({ config = {}, updateConfig, nodeId }) {
  const text = config.text ?? '';
  const from = config.from ?? 'Auto Detect';
  const to = config.to ?? 'English';
  const provider = config.provider ?? 'openai';
  const preserveFormatting = config.preserveFormatting ?? true;
  const apiKey = config.apiKey ?? '';
  const formality = config.formality ?? 'default'; // 'default' | 'formal' | 'informal'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Languages className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Translation</div>
          <div className="text-[11px] text-zinc-500">Translate text between 25+ languages</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Input Text</label>
        <SmartVariableInput value={text} onChange={(v) => updateConfig('text', v)} placeholder="{{ $json.text }}" multiline />
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">From</label>
          <select value={from} onChange={(e) => updateConfig('from', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="text-zinc-600 text-xl pb-2">→</div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">To</label>
          <select value={to} onChange={(e) => updateConfig('to', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {LANGUAGES.filter((l) => l !== 'Auto Detect').map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Provider</label>
        <div className="grid grid-cols-2 gap-1.5">
          {PROVIDERS.map((p) => (
            <button key={p.value} onClick={() => updateConfig('provider', p.value)}
              className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${provider === p.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {(provider === 'google' || provider === 'deepl') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
          <input type="password" value={apiKey} onChange={(e) => updateConfig('apiKey', e.target.value)}
            placeholder={provider === 'google' ? 'Google Cloud API Key' : 'DeepL API Key'}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {provider === 'deepl' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Formality</label>
          <div className="flex gap-1.5">
            {['default', 'formal', 'informal'].map((f) => (
              <button key={f} onClick={() => updateConfig('formality', f)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize border transition-all ${formality === f ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Preserve Formatting</p>
          <p className="text-[10px] text-zinc-600">Keep markdown, line breaks and structure</p>
        </div>
        <button onClick={() => updateConfig('preserveFormatting', !preserveFormatting)}
          className={`w-10 h-5 rounded-full border transition-all relative ${preserveFormatting ? 'bg-blue-500 border-blue-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${preserveFormatting ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">translatedText, detectedLanguage, provider</span>
      </div>
    </div>
  );
}
