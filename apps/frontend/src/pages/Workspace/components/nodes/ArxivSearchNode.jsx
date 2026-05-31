import { Atom } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'cs', label: 'Computer Science' },
  { value: 'math', label: 'Mathematics' },
  { value: 'physics', label: 'Physics' },
  { value: 'q-bio', label: 'Quantitative Biology' },
  { value: 'stat', label: 'Statistics' },
  { value: 'econ', label: 'Economics' },
  { value: 'eess', label: 'Electrical Engineering' },
];

export default function ArxivSearchNode({ config = {}, updateConfig, nodeId }) {
  const query = config.query ?? '';
  const category = config.category ?? '';
  const maxResults = config.maxResults ?? 10;
  const sortBy = config.sortBy ?? 'relevance';
  const searchIn = config.searchIn ?? 'all'; // 'all' | 'title' | 'abstract' | 'author'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <Atom className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">ArXiv Search</div>
          <div className="text-[11px] text-zinc-500">Search preprint papers on arXiv.org</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Query</label>
        <SmartVariableInput value={query} onChange={(v) => updateConfig('query', v)} placeholder="large language models attention" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search In</label>
        <div className="flex gap-1.5">
          {[
            { value: 'all',      label: 'All Fields' },
            { value: 'title',    label: 'Title' },
            { value: 'abstract', label: 'Abstract' },
            { value: 'author',   label: 'Author' },
          ].map((s) => (
            <button key={s.value} onClick={() => updateConfig('searchIn', s.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${searchIn === s.value ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Category</label>
        <select value={category} onChange={(e) => updateConfig('category', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Results</label>
          <input type="number" min={1} max={50} value={maxResults} onChange={(e) => updateConfig('maxResults', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Sort By</label>
          <select value={sortBy} onChange={(e) => updateConfig('sortBy', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            <option value="relevance">Relevance</option>
            <option value="lastUpdatedDate">Last Updated</option>
            <option value="submittedDate">Submitted Date</option>
          </select>
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">title, authors, abstract, PDF link, submitted date, arXiv ID</span>
      </div>
    </div>
  );
}
