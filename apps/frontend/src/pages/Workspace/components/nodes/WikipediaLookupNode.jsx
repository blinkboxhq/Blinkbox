import { BookOpen } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function WikipediaLookupNode({ config = {}, updateConfig, nodeId }) {
  const query = config.query ?? '';
  const language = config.language ?? 'en';
  const summaryOnly = config.summaryOnly ?? true;
  const maxSentences = config.maxSentences ?? 3;
  const includeImage = config.includeImage ?? true;

  const LANGUAGES = [
    { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },  { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },{ value: 'zh', label: 'Chinese' },
    { value: 'hi', label: 'Hindi' },   { value: 'ar', label: 'Arabic' },
    { value: 'pt', label: 'Portuguese'},{ value: 'ru', label: 'Russian' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-zinc-300" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Wikipedia Lookup</div>
          <div className="text-[11px] text-zinc-500">Fetch article summary from Wikipedia</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search Term</label>
        <SmartVariableInput value={query} onChange={(v) => updateConfig('query', v)} placeholder="{{ $json.topic }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Language</label>
        <select value={language} onChange={(e) => updateConfig('language', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Summary Only</p>
          <p className="text-[10px] text-zinc-600">Return first N sentences instead of full article</p>
        </div>
        <button onClick={() => updateConfig('summaryOnly', !summaryOnly)}
          className={`w-10 h-5 rounded-full border transition-all relative ${summaryOnly ? 'bg-zinc-400 border-zinc-300' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${summaryOnly ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      {summaryOnly && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Sentences</label>
          <input type="number" min={1} max={20} value={maxSentences} onChange={(e) => updateConfig('maxSentences', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Include Thumbnail</p>
          <p className="text-[10px] text-zinc-600">Return article thumbnail image URL</p>
        </div>
        <button onClick={() => updateConfig('includeImage', !includeImage)}
          className={`w-10 h-5 rounded-full border transition-all relative ${includeImage ? 'bg-zinc-400 border-zinc-300' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${includeImage ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">title, summary, url, thumbnail, categories, lastRevised</span>
      </div>
    </div>
  );
}
