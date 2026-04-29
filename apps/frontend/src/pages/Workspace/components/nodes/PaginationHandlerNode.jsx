import { ArrowRightLeft } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function PaginationHandlerNode({ config = {}, updateConfig }) {
  const strategy    = config.strategy    ?? 'offset'; // offset | cursor | page | link
  const url         = config.url         ?? '';
  const pageSize    = config.pageSize    ?? 100;
  const maxPages    = config.maxPages    ?? 10;
  const offsetParam = config.offsetParam ?? 'offset';
  const limitParam  = config.limitParam  ?? 'limit';
  const cursorPath  = config.cursorPath  ?? 'next_cursor';
  const pagePath    = config.pagePath    ?? 'page';
  const linkPath    = config.linkPath    ?? 'links.next';
  const dataPath    = config.dataPath    ?? 'data';
  const mergeAll    = config.mergeAll    ?? true;
  const stopWhen    = config.stopWhen    ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <ArrowRightLeft className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Pagination Handler</div>
          <div className="text-[11px] text-zinc-500">Auto-paginate any API — offset, cursor, page or link</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pagination Strategy</label>
        <div className="flex gap-1.5">
          {[
            { value: 'offset', label: 'Offset/Limit' },
            { value: 'cursor', label: 'Cursor' },
            { value: 'page',   label: 'Page Number' },
            { value: 'link',   label: 'Next Link' },
          ].map((s) => (
            <button key={s.value} onClick={() => updateConfig('strategy', s.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${strategy === s.value ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Base URL</label>
        <SmartVariableInput value={url} onChange={(v) => updateConfig('url', v)} placeholder="https://api.example.com/items" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Page Size</label>
          <input type="number" min={1} max={1000} value={pageSize} onChange={(e) => updateConfig('pageSize', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Pages</label>
          <input type="number" min={1} max={500} value={maxPages} onChange={(e) => updateConfig('maxPages', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      {strategy === 'offset' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Offset Param</label>
            <input value={offsetParam} onChange={(e) => updateConfig('offsetParam', e.target.value)} placeholder="offset"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit Param</label>
            <input value={limitParam} onChange={(e) => updateConfig('limitParam', e.target.value)} placeholder="limit"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
          </div>
        </div>
      )}

      {strategy === 'cursor' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Cursor Field Path in Response</label>
          <input value={cursorPath} onChange={(e) => updateConfig('cursorPath', e.target.value)} placeholder="next_cursor"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {strategy === 'page' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Page Param Name</label>
          <input value={pagePath} onChange={(e) => updateConfig('pagePath', e.target.value)} placeholder="page"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {strategy === 'link' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Next Link Path in Response</label>
          <input value={linkPath} onChange={(e) => updateConfig('linkPath', e.target.value)} placeholder="links.next"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Data Array Path in Response</label>
        <input value={dataPath} onChange={(e) => updateConfig('dataPath', e.target.value)} placeholder="data  or  results  or  items"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Stop Condition (optional)</label>
        <SmartVariableInput value={stopWhen} onChange={(v) => updateConfig('stopWhen', v)} placeholder='{{ $json.hasMore }} === false' />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Merge All Pages</p>
          <p className="text-[10px] text-zinc-600">Combine all pages into one array vs emit per page</p>
        </div>
        <button onClick={() => updateConfig('mergeAll', !mergeAll)}
          className={`w-10 h-5 rounded-full border transition-all relative ${mergeAll ? 'bg-teal-500 border-teal-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${mergeAll ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">{mergeAll ? 'items[] (all pages merged)' : 'page, items[], hasMore, cursor'}, totalFetched, pageCount</span>
      </div>
    </div>
  );
}
