import { Archive } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

export default function ZipFilesNode({ config = {}, updateConfig, nodeId }) {
  const mode        = config.mode        ?? 'zip'; // zip | unzip
  const files       = config.files       ?? '';
  const zipInput    = config.zipInput    ?? '';
  const outputName  = config.outputName  ?? 'archive.zip';
  const outputField = config.outputField ?? 'zipFile';
  const compression = config.compression ?? 6; // 0-9
  const extractPath = config.extractPath ?? '';
  const password    = config.password    ?? '';
  const format      = config.format      ?? 'zip'; // zip | tar | tar.gz

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
          <Archive className="w-4 h-4 text-zinc-300" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Zip / Unzip Files</div>
          <div className="text-[11px] text-zinc-500">Compress or extract archives (zip, tar, tar.gz)</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[{ value: 'zip', label: 'Compress (Zip)' }, { value: 'unzip', label: 'Extract (Unzip)' }].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all ${mode === m.value ? 'bg-zinc-300/10 border-zinc-400/40 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'zip' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Files to Compress (JSON array)</label>
            <SmartVariableInput value={files} onChange={(v) => updateConfig('files', v)}
              placeholder='{{ $json.files }}  or  [{"name":"report.pdf","content":"base64..."}]' multiline />
            <p className="text-[10px] text-zinc-600 mt-1">Array of {`{ name, content (base64/text/url) }`} objects</p>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Archive Format</label>
            <div className="flex gap-1.5">
              {['zip','tar','tar.gz'].map((f) => (
                <button key={f} onClick={() => updateConfig('format', f)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold font-mono border transition-all ${format === f ? 'bg-zinc-300/10 border-zinc-400/40 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                  .{f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Filename</label>
              <SmartVariableInput value={outputName} onChange={(v) => updateConfig('outputName', v)} placeholder="archive.zip" />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Compression Level (0-9)</label>
              <input type="range" min={0} max={9} value={compression} onChange={(e) => updateConfig('compression', Number(e.target.value))}
                className="w-full mt-2 accent-zinc-400" />
              <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
                <span>None (0)</span><span>{compression}</span><span>Max (9)</span>
              </div>
            </div>
          </div>
        </>
      )}

      {mode === 'unzip' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Archive (URL or base64)</label>
            <SmartVariableInput value={zipInput} onChange={(v) => updateConfig('zipInput', v)} placeholder="{{ $json.zipFile }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Extract Files Matching (glob, optional)</label>
            <input value={extractPath} onChange={(e) => updateConfig('extractPath', e.target.value)} placeholder="*.pdf  or  reports/*"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
          </div>
        </>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Password (optional)</label>
        <input type="password" value={password} onChange={(e) => updateConfig('password', e.target.value)} placeholder="Encrypt/decrypt archive"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field</label>
        <input value={outputField} onChange={(e) => updateConfig('outputField', e.target.value)} placeholder="zipFile"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'zip'   && <>Returns: <span className="text-zinc-300">{outputField} (base64), filename, size, fileCount</span></>}
        {mode === 'unzip' && <>Returns: <span className="text-zinc-300">files[] with name, content (base64), size, path</span></>}
      </div>
    </div>
  );
}
