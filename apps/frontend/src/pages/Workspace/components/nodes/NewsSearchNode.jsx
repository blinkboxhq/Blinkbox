import { Newspaper } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function NewsSearchNode({ config = {}, updateConfig, nodeId }) {
  const query = config.query ?? '';
  const language = config.language ?? 'en';
  const sortBy = config.sortBy ?? 'publishedAt';
  const maxResults = config.maxResults ?? 10;
  const dateFrom = config.dateFrom ?? '';
  const apiKey = config.apiKey ?? '';
  const sources = config.sources ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Newspaper className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">News Search</div>
          <div className="text-[11px] text-zinc-500">Fetch latest news articles via NewsAPI</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Keywords</label>
        <SmartVariableInput value={query} onChange={(v) => updateConfig('query', v)} placeholder='AI breakthroughs  or  "Elon Musk"' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Sources (optional)</label>
        <input value={sources} onChange={(e) => updateConfig('sources', e.target.value)} placeholder="bbc-news,techcrunch,the-verge"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        <p className="text-[10px] text-zinc-600 mt-1">Comma-separated source IDs. Leave blank to search all.</p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Language</label>
          <select value={language} onChange={(e) => updateConfig('language', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {['en','es','fr','de','it','pt','nl','no','ru','ar','he','zh'].map((l) => (
              <option key={l} value={l}>{l.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Sort By</label>
          <select value={sortBy} onChange={(e) => updateConfig('sortBy', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="publishedAt">Newest</option>
            <option value="relevancy">Relevance</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">From Date</label>
          <input type="date" value={dateFrom} onChange={(e) => updateConfig('dateFrom', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Results</label>
          <input type="number" min={1} max={100} value={maxResults} onChange={(e) => updateConfig('maxResults', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">NewsAPI Key</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="News API Key"
        placeholder="Select News API Key..."
      />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">title, description, url, source, author, publishedAt, urlToImage</span>
      </div>
    </div>
  );
}
