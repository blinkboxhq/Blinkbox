import { Film } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function CanvaExportNode({ config = {}, updateConfig }) {
  const designId   = config.designId   ?? '';
  const format     = config.format     ?? 'pdf'; // pdf | png | jpg | mp4 | gif | pptx
  const quality    = config.quality    ?? 'regular'; // regular | pro
  const pages      = config.pages      ?? 'all'; // all | range
  const pageRange  = config.pageRange  ?? '1-3';
  const exportType = config.exportType ?? 'url'; // url | base64
  const accessToken= config.accessToken?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Film className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Canva Export</div>
          <div className="text-[11px] text-zinc-500">Export a Canva design as PDF, PNG, MP4 and more</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Design ID</label>
        <SmartVariableInput value={designId} onChange={(v) => updateConfig('designId', v)}
          placeholder='DAFgZ1c8ABC  (from canva.com/design/{ID}/...)  or  {{ $json.designId }}' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Export Format</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: 'pdf',  label: 'PDF' },
            { value: 'png',  label: 'PNG' },
            { value: 'jpg',  label: 'JPG' },
            { value: 'mp4',  label: 'MP4' },
            { value: 'gif',  label: 'GIF' },
            { value: 'pptx', label: 'PPTX' },
          ].map((f) => (
            <button key={f.value} onClick={() => updateConfig('format', f.value)}
              className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${format === f.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {format === 'pdf' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Quality</label>
          <div className="flex gap-1.5">
            {[{ value: 'regular', label: 'Regular' }, { value: 'pro', label: 'Pro (high-res)' }].map((q) => (
              <button key={q.value} onClick={() => updateConfig('quality', q.value)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${quality === q.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pages</label>
        <div className="flex gap-1.5">
          {[{ value: 'all', label: 'All Pages' }, { value: 'range', label: 'Page Range' }].map((p) => (
            <button key={p.value} onClick={() => updateConfig('pages', p.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${pages === p.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {pages === 'range' && (
          <input value={pageRange} onChange={(e) => updateConfig('pageRange', e.target.value)} placeholder="1-3 or 1,3,5"
            className="w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        )}
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Type</label>
        <div className="flex gap-1.5">
          {[{ value: 'url', label: 'Download URL' }, { value: 'base64', label: 'Base64' }].map((t) => (
            <button key={t.value} onClick={() => updateConfig('exportType', t.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${exportType === t.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Canva Access Token</label>
        <input type="password" value={accessToken} onChange={(e) => updateConfig('accessToken', e.target.value)}
          placeholder="Canva Connect API OAuth token"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        <p className="text-[10px] text-zinc-600 mt-1">Requires Canva Connect API access (canva.dev)</p>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">exportUrl or base64, format, size, pages, designId</span>
      </div>
    </div>
  );
}
