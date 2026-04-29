import { Download } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function FileDownloadNode({ config = {}, updateConfig }) {
  const url         = config.url         ?? '';
  const method      = config.method      ?? 'GET';
  const headers     = config.headers     ?? '';
  const outputAs    = config.outputAs    ?? 'base64'; // base64 | text | json | binary
  const outputField = config.outputField ?? 'fileContent';
  const filename    = config.filename    ?? '';
  const timeout     = config.timeout     ?? 30;
  const followRedirects = config.followRedirects ?? true;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Download className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">File Download</div>
          <div className="text-[11px] text-zinc-500">Download any file into the workflow payload</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">URL</label>
        <SmartVariableInput value={url} onChange={(v) => updateConfig('url', v)} placeholder="{{ $json.downloadUrl }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output As</label>
        <div className="flex gap-1.5">
          {[
            { value: 'base64', label: 'Base64',  desc: 'For images, PDFs, binary' },
            { value: 'text',   label: 'Text',    desc: 'UTF-8 string' },
            { value: 'json',   label: 'JSON',    desc: 'Parse as JSON object' },
            { value: 'binary', label: 'Buffer',  desc: 'Raw binary buffer' },
          ].map((o) => (
            <button key={o.value} onClick={() => updateConfig('outputAs', o.value)}
              className={`flex-1 flex flex-col py-1.5 rounded-lg border transition-all ${outputAs === o.value ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[10px] font-bold ${outputAs === o.value ? 'text-emerald-300' : 'text-zinc-400'}`}>{o.label}</span>
              <span className="text-[9px] text-zinc-600">{o.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
          <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="fileContent"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Save as Filename</label>
          <SmartVariableInput value={filename} onChange={(v) => updateConfig('filename', v)} placeholder="file.pdf" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Extra Headers (JSON)</label>
        <textarea value={headers} onChange={(e) => updateConfig('headers', e.target.value)} rows={2}
          placeholder={'{ "Authorization": "Bearer {{ $json.token }}" }'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (s)</label>
          <input type="number" min={1} max={300} value={timeout} onChange={(e) => updateConfig('timeout', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1 flex items-end pb-0.5">
          <div className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[11px] font-semibold text-zinc-400">Follow Redirects</p>
            <button onClick={() => updateConfig('followRedirects', !followRedirects)}
              className={`w-10 h-5 rounded-full border transition-all relative ${followRedirects ? 'bg-emerald-500 border-emerald-400' : 'bg-zinc-700 border-zinc-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${followRedirects ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">{outputField} ({outputAs}), contentType, size, filename, statusCode</span>
      </div>
    </div>
  );
}
