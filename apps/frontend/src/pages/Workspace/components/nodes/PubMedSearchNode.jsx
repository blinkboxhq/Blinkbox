import { Microscope } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function PubMedSearchNode({ config = {}, updateConfig }) {
  const query = config.query ?? '';
  const maxResults = config.maxResults ?? 10;
  const sortBy = config.sortBy ?? 'relevance';
  const dateFrom = config.dateFrom ?? '';
  const dateTo = config.dateTo ?? '';
  const fullText = config.fullText ?? false;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Microscope className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">PubMed Search</div>
          <div className="text-[11px] text-zinc-500">Search biomedical literature via NCBI PubMed</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search Query</label>
        <SmartVariableInput value={query} onChange={(v) => updateConfig('query', v)} placeholder='diabetes AND insulin[MeSH]' />
        <p className="text-[10px] text-zinc-600 mt-1">Supports PubMed query syntax, MeSH terms, AND/OR/NOT</p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Results</label>
          <input type="number" min={1} max={100} value={maxResults} onChange={(e) => updateConfig('maxResults', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Sort By</label>
          <select value={sortBy} onChange={(e) => updateConfig('sortBy', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="relevance">Relevance</option>
            <option value="pub_date">Date</option>
            <option value="Author">Author</option>
            <option value="JournalName">Journal</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Date Range (optional)</label>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => updateConfig('dateFrom', e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          <span className="text-zinc-600 self-center">→</span>
          <input type="date" value={dateTo} onChange={(e) => updateConfig('dateTo', e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Include Abstract</p>
          <p className="text-[10px] text-zinc-600">Fetch full abstract text in results</p>
        </div>
        <button onClick={() => updateConfig('fullText', !fullText)}
          className={`w-10 h-5 rounded-full border transition-all relative ${fullText ? 'bg-blue-500 border-blue-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${fullText ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">PMID, title, authors, journal, date, abstract, DOI</span>
      </div>
    </div>
  );
}
