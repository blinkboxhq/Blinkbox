import { DownloadCloud } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const REGIONS = ['us-east-1','us-west-2','eu-west-1','eu-central-1','ap-south-1','ap-southeast-1','ap-northeast-1','sa-east-1'];
const ACL_OPTIONS = [
  { value: 'private',           label: 'Private' },
  { value: 'public-read',       label: 'Public Read' },
  { value: 'authenticated-read', label: 'Auth Read' },
];

export default function S3Node({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation ?? 'upload';
  const bucket = config.bucket ?? '';
  const key = config.key ?? '';
  const region = config.region ?? 'us-east-1';
  const content = config.content ?? '';
  const contentType = config.contentType ?? 'application/octet-stream';
  const acl = config.acl ?? 'private';
  const presignExpiry = config.presignExpiry ?? 3600;
  const endpoint = config.endpoint ?? '';

  const OPERATIONS = [
    { value: 'upload',   label: 'Upload' },
    { value: 'download', label: 'Download' },
    { value: 'delete',   label: 'Delete' },
    { value: 'list',     label: 'List Objects' },
    { value: 'presign',  label: 'Pre-sign URL' },
    { value: 'exists',   label: 'Object Exists?' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <DownloadCloud className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">S3</div>
          <div className="text-[11px] text-zinc-500">AWS S3 (or compatible) object storage</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-3 gap-1.5">
          {OPERATIONS.map((op) => (
            <button key={op.value} onClick={() => updateConfig('operation', op.value)}
              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${operation === op.value ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Bucket</label>
          <SmartVariableInput value={bucket} onChange={(v) => updateConfig('bucket', v)} placeholder="my-bucket" nodeId={nodeId} />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Region</label>
          <div className="flex flex-col gap-1">
            {REGIONS.map((r) => (
              <button key={r} onClick={() => updateConfig('region', r)}
                className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-all text-left ${region === r ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {operation !== 'list' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Object Key (path)</label>
          <SmartVariableInput value={key} onChange={(v) => updateConfig('key', v)} placeholder="uploads/{{ $json.filename }}" nodeId={nodeId} />
        </div>
      )}

      {operation === 'upload' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Content or URL</label>
            <SmartVariableInput value={content} onChange={(v) => updateConfig('content', v)} placeholder="{{ $json.fileContent }}" multiline nodeId={nodeId} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Content-Type</label>
              <SmartVariableInput value={contentType} onChange={(v) => updateConfig('contentType', v)} placeholder="application/octet-stream" nodeId={nodeId} />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">ACL</label>
              <div className="flex flex-col gap-1">
                {ACL_OPTIONS.map((a) => (
                  <button key={a.value} onClick={() => updateConfig('acl', a.value)}
                    className={`py-1 rounded-lg text-[10px] font-bold border transition-all ${acl === a.value ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {operation === 'presign' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Expiry (seconds)</label>
          <input type="number" min={60} value={presignExpiry} onChange={(e) => updateConfig('presignExpiry', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      <div className="border-t border-zinc-800 pt-3">
        <CredentialPicker
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor="blue"
          label="AWS Credentials (JSON: {accessKeyId, secretAccessKey})"
          placeholder="Select AWS credentials..."
        />
        <div className="mt-2">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Custom Endpoint (S3-compatible, optional)</label>
          <SmartVariableInput value={endpoint} onChange={(v) => updateConfig('endpoint', v)} placeholder="https://s3.example.com" nodeId={nodeId} />
          <p className="text-[10px] text-zinc-600 mt-1">Works with MinIO, Cloudflare R2, DigitalOcean Spaces</p>
        </div>
      </div>
    </div>
  );
}
