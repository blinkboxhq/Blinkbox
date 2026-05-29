import { Globe } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

export default function HttpMonitorNode({ config = {}, updateConfig, nodeId }) {
  const url = config.url ?? '';
  const expectedStatus = config.expectedStatus ?? 200;
  const timeout = config.timeout ?? 10000;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Globe className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">HTTP Monitor</div>
          <div className="text-[11px] text-zinc-500">Check if an HTTP endpoint is up and responding</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">URL</label>
        <SmartVariableInput value={url} onChange={(v) => updateConfig('url', v)} placeholder="https://api.example.com/health" nodeId={nodeId} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Expected Status</label>
          <input type="number" value={expectedStatus} onChange={(e) => updateConfig('expectedStatus', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (ms)</label>
          <input type="number" min={1000} max={30000} step={1000} value={timeout} onChange={(e) => updateConfig('timeout', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">isUp, status, latencyMs, contentType, checkedAt</span>
      </div>
    </div>
  );
}
