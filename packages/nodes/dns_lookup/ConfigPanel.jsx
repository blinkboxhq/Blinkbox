import { Globe } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const RECORD_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'];

export default function DnsLookupNode({ config = {}, updateConfig, nodeId }) {
  const hostname = config.hostname ?? '';
  const type = config.type ?? 'A';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Globe className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">DNS Lookup</div>
          <div className="text-[11px] text-zinc-500">Resolve DNS records for any hostname</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Hostname</label>
        <SmartVariableInput value={hostname} onChange={(v) => updateConfig('hostname', v)} placeholder="example.com" nodeId={nodeId} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Record Type</label>
        <div className="grid grid-cols-4 gap-1.5">
          {RECORD_TYPES.map((t) => (
            <button key={t} onClick={() => updateConfig('type', t)}
              className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${type === t ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">hostname, type, records[ ], count</span>
      </div>
    </div>
  );
}
