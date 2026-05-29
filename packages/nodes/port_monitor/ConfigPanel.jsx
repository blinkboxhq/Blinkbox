import { Server } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

export default function PortMonitorNode({ config = {}, updateConfig, nodeId }) {
  const host = config.host ?? '';
  const port = config.port ?? 80;
  const timeout = config.timeout ?? 5000;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <Server className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Port Monitor</div>
          <div className="text-[11px] text-zinc-500">Check if a TCP port is open and measure latency</div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-[3]">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Host</label>
          <SmartVariableInput value={host} onChange={(v) => updateConfig('host', v)} placeholder="example.com or 1.2.3.4" nodeId={nodeId} />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Port</label>
          <input type="number" min={1} max={65535} value={port} onChange={(e) => updateConfig('port', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (ms)</label>
        <input type="number" min={500} max={30000} step={500} value={timeout} onChange={(e) => updateConfig('timeout', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">host, port, isOpen, latencyMs, checkedAt</span>
      </div>
    </div>
  );
}
