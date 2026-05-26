import { UploadCloud } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

export default function SftpNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation ?? 'upload'; // upload | download | list | delete | mkdir
  const host = config.host ?? '';
  const port = config.port ?? 22;
  const username = config.username ?? '';
  const authType = config.authType ?? 'password'; // password | key
  const password = config.password ?? '';
  const privateKey = config.privateKey ?? '';
  const remotePath = config.remotePath ?? '';
  const localPath = config.localPath ?? '';
  const content = config.content ?? '';

  const OPERATIONS = [
    { value: 'upload',   label: 'Upload' },
    { value: 'download', label: 'Download' },
    { value: 'list',     label: 'List Dir' },
    { value: 'delete',   label: 'Delete' },
    { value: 'mkdir',    label: 'Make Dir' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <UploadCloud className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">SFTP</div>
          <div className="text-[11px] text-zinc-500">Upload, download or manage files via SFTP</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="flex gap-1.5 flex-wrap">
          {OPERATIONS.map((op) => (
            <button key={op.value} onClick={() => updateConfig('operation', op.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${operation === op.value ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-[3]">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Host</label>
          <SmartVariableInput value={host} onChange={(v) => updateConfig('host', v)} placeholder="sftp.example.com" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Port</label>
          <input type="number" value={port} onChange={(e) => updateConfig('port', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Username</label>
        <SmartVariableInput value={username} onChange={(v) => updateConfig('username', v)} placeholder="{{ $creds.username }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Auth Method</label>
        <div className="flex gap-1.5">
          {[{ value: 'password', label: 'Password' }, { value: 'key', label: 'Private Key' }].map((a) => (
            <button key={a.value} onClick={() => updateConfig('authType', a.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${authType === a.value ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {authType === 'password' ? (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Password</label>
          <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="zinc"
        label="SFTP Credential"
        placeholder="Select SFTP Credential..."
      />
        </div>
      ) : (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Private Key (PEM)</label>
          <textarea value={privateKey} onChange={(e) => updateConfig('privateKey', e.target.value)} rows={3}
            placeholder="-----BEGIN RSA PRIVATE KEY-----"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[11px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Remote Path</label>
        <SmartVariableInput value={remotePath} onChange={(v) => updateConfig('remotePath', v)} placeholder="/home/user/files/{{ $json.filename }}" />
      </div>

      {operation === 'upload' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Content or URL</label>
          <SmartVariableInput value={content} onChange={(v) => updateConfig('content', v)} placeholder="{{ $json.fileContent }}" multiline />
        </div>
      )}

      {operation === 'download' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Save to Output Field</label>
          <input value={localPath} onChange={(e) => updateConfig('localPath', e.target.value)} placeholder="fileContent"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {operation === 'upload'   && <>Returns: <span className="text-zinc-300">success, remotePath, size, timestamp</span></>}
        {operation === 'download' && <>Returns: <span className="text-zinc-300">fileContent (base64), size, mtime</span></>}
        {operation === 'list'     && <>Returns: <span className="text-zinc-300">files array with name, size, type, mtime</span></>}
        {operation === 'delete'   && <>Returns: <span className="text-zinc-300">success, deletedPath</span></>}
        {operation === 'mkdir'    && <>Returns: <span className="text-zinc-300">success, createdPath</span></>}
      </div>
    </div>
  );
}
