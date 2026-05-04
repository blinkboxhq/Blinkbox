import { GraduationCap } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const STYLES = ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver', 'AMA'];

const SOURCE_TYPES = [
  { value: 'article',   label: 'Journal Article' },
  { value: 'book',      label: 'Book' },
  { value: 'chapter',   label: 'Book Chapter' },
  { value: 'website',   label: 'Website' },
  { value: 'thesis',    label: 'Thesis / Dissertation' },
  { value: 'conference',label: 'Conference Paper' },
];

export default function CitationFormatterNode({ config = {}, updateConfig, nodeId }) {
  const style = config.style ?? 'APA';
  const sourceType = config.sourceType ?? 'article';
  const authors = config.authors ?? '';
  const title = config.title ?? '';
  const year = config.year ?? '';
  const journal = config.journal ?? '';
  const volume = config.volume ?? '';
  const issue = config.issue ?? '';
  const pages = config.pages ?? '';
  const doi = config.doi ?? '';
  const url = config.url ?? '';
  const publisher = config.publisher ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Citation Formatter</div>
          <div className="text-[11px] text-zinc-500">Format references in APA, MLA, Chicago & more</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Citation Style</label>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((s) => (
            <button key={s} onClick={() => updateConfig('style', s)}
              className={`py-1.5 px-3 rounded-lg text-[11px] font-bold border transition-all ${style === s ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Source Type</label>
        <select value={sourceType} onChange={(e) => updateConfig('sourceType', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
          {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {[
        { key: 'authors', label: 'Authors', placeholder: 'Smith, J., Doe, A.  or  {{ $json.authors }}' },
        { key: 'title',   label: 'Title',   placeholder: 'Article or book title' },
        { key: 'year',    label: 'Year',    placeholder: '2024' },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">{label}</label>
          <SmartVariableInput value={config[key] ?? ''} onChange={(v) => updateConfig(key, v)} placeholder={placeholder} />
        </div>
      ))}

      {(sourceType === 'article' || sourceType === 'conference') && (
        <div className="flex gap-2">
          {[
            { key: 'journal', label: 'Journal / Conference', placeholder: 'Nature' },
            { key: 'volume',  label: 'Volume', placeholder: '12' },
            { key: 'issue',   label: 'Issue',  placeholder: '3' },
            { key: 'pages',   label: 'Pages',  placeholder: '45-67' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">{label}</label>
              <input value={config[key] ?? ''} onChange={(e) => updateConfig(key, e.target.value)} placeholder={placeholder}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
            </div>
          ))}
        </div>
      )}

      {(sourceType === 'book' || sourceType === 'chapter') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Publisher</label>
          <SmartVariableInput value={publisher} onChange={(v) => updateConfig('publisher', v)} placeholder="Oxford University Press" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">DOI (optional)</label>
        <input value={doi} onChange={(e) => updateConfig('doi', e.target.value)} placeholder="10.1000/xyz123"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      {sourceType === 'website' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">URL</label>
          <SmartVariableInput value={url} onChange={(v) => updateConfig('url', v)} placeholder="{{ $json.url }}" />
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">formatted citation string in {style} style</span>
      </div>
    </div>
  );
}
