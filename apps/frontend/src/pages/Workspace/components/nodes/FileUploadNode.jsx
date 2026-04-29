import { Upload } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function FileUploadNode({ config = {}, updateConfig }) {
  const content     = config.content     ?? '';
  const filename    = config.filename    ?? '';
  const destination = config.destination ?? 's3'; // s3 | gcs | azure | sftp | local | url
  const bucket      = config.bucket      ?? '';
  const path        = config.path        ?? '';
  const contentType = config.contentType ?? 'auto';
  const acl         = config.acl         ?? 'private';
  const apiKey      = config.apiKey      ?? '';
  const publicUrl   = config.publicUrl   ?? true;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Upload className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">File Upload</div>
          <div className="text-[11px] text-zinc-500">Upload a file to S3, GCS, Azure, SFTP or URL</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Content (URL or base64)</label>
        <SmartVariableInput value={content} onChange={(v) => updateConfig('content', v)} placeholder="{{ $json.fileContent }}  or  https://..." multiline />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Filename</label>
        <SmartVariableInput value={filename} onChange={(v) => updateConfig('filename', v)} placeholder='report-{{ $json.date }}.pdf' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Destination</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: 's3',    label: 'AWS S3' },
            { value: 'gcs',   label: 'Google Cloud' },
            { value: 'azure', label: 'Azure Blob' },
            { value: 'sftp',  label: 'SFTP' },
            { value: 'local', label: 'Local FS' },
            { value: 'url',   label: 'HTTP PUT' },
          ].map((d) => (
            <button key={d.value} onClick={() => updateConfig('destination', d.value)}
              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${destination === d.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {(destination === 's3' || destination === 'gcs' || destination === 'azure') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
            {destination === 's3' ? 'S3 Bucket' : destination === 'gcs' ? 'GCS Bucket' : 'Container Name'}
          </label>
          <SmartVariableInput value={bucket} onChange={(v) => updateConfig('bucket', v)} placeholder="my-bucket" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
          {destination === 'url' ? 'Upload URL' : 'Path / Prefix'}
        </label>
        <SmartVariableInput value={path} onChange={(v) => updateConfig('path', v)}
          placeholder={destination === 'url' ? 'https://upload.example.com/files' : 'uploads/2024/'} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Content-Type</label>
          <input value={contentType} onChange={(e) => updateConfig('contentType', e.target.value)} placeholder="auto"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
        {destination === 's3' && (
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">ACL</label>
            <select value={acl} onChange={(e) => updateConfig('acl', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
              <option value="private">private</option>
              <option value="public-read">public-read</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Return Public URL</p>
          <p className="text-[10px] text-zinc-600">Include CDN/public URL in output</p>
        </div>
        <button onClick={() => updateConfig('publicUrl', !publicUrl)}
          className={`w-10 h-5 rounded-full border transition-all relative ${publicUrl ? 'bg-blue-500 border-blue-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${publicUrl ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Credentials / API Key</label>
        <input type="password" value={apiKey} onChange={(e) => updateConfig('apiKey', e.target.value)}
          placeholder="Access key or connection string"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">path, filename, size, contentType{publicUrl ? ', publicUrl' : ''}, uploadedAt</span>
      </div>
    </div>
  );
}
