import { Shield } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

export default function SslCheckNode({ config = {}, updateConfig, nodeId }) {
  const hostname = config.hostname ?? '';
  const port = config.port ?? 443;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">SSL Check</div>
          <div className="text-[11px] text-zinc-500">Inspect TLS certificate validity and expiry</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Hostname</label>
        <SmartVariableInput value={hostname} onChange={(v) => updateConfig('hostname', v)} placeholder="example.com" nodeId={nodeId} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Port</label>
        <input type="number" value={port} onChange={(e) => updateConfig('port', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">valid, daysUntilExpiry, expired, expiringSoon, issuer, validTo</span>
      </div>
    </div>
  );
}
