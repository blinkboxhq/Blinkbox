import { Cpu } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function GrpcNode({ config = {}, updateConfig, nodeId }) {
  const host = config.host ?? '';
  const port = config.port ?? 50051;
  const service = config.service ?? '';
  const method = config.method ?? '';
  const payload = config.payload ?? '{}';
  const useTls = config.useTls ?? false;
  const certPath = config.certPath ?? '';
  const metadata = config.metadata ?? '';
  const timeout = config.timeout ?? 30;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">gRPC Call</div>
          <div className="text-[11px] text-zinc-500">Invoke a gRPC endpoint with a protobuf message</div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-[3]">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Host</label>
          <SmartVariableInput value={host} onChange={(v) => updateConfig('host', v)} placeholder="grpc.example.com" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Port</label>
          <input type="number" value={port} onChange={(e) => updateConfig('port', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Service</label>
        <input value={service} onChange={(e) => updateConfig('service', e.target.value)} placeholder="com.example.UserService"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Method</label>
        <input value={method} onChange={(e) => updateConfig('method', e.target.value)} placeholder="GetUser"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Request Payload (JSON)</label>
        <textarea value={payload} onChange={(e) => updateConfig('payload', e.target.value)} rows={4}
          placeholder={'{\n  "userId": "{{ $json.id }}"\n}'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Metadata (JSON, optional)</label>
        <textarea value={metadata} onChange={(e) => updateConfig('metadata', e.target.value)} rows={2}
          placeholder={'{ "authorization": "Bearer {{ $json.token }}" }'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Use TLS</p>
          <p className="text-[10px] text-zinc-600">Secure connection with TLS/SSL</p>
        </div>
        <button onClick={() => updateConfig('useTls', !useTls)}
          className={`w-10 h-5 rounded-full border transition-all relative ${useTls ? 'bg-orange-500 border-orange-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${useTls ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      {useTls && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Certificate Path</label>
          <input value={certPath} onChange={(e) => updateConfig('certPath', e.target.value)} placeholder="/certs/server.crt"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (s)</label>
        <input type="number" min={1} max={120} value={timeout} onChange={(e) => updateConfig('timeout', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">response object deserialized from protobuf, status code</span>
      </div>
    </div>
  );
}
