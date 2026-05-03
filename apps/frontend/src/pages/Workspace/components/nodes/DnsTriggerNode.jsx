import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA'];
const INTERVALS = [
  { label: 'Every 5 min', value: '300' },
  { label: 'Every 15 min', value: '900' },
  { label: 'Every 30 min', value: '1800' },
  { label: 'Every 1 hour', value: '3600' },
];

export default function DnsTriggerNode({ config = {}, updateConfig, nodeId }) {
  const recordType = config.recordType || 'A';
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-sky-400">DNS Record Change</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Hostname</label>
          <SmartVariableInput value={config.hostname || ''} onChange={(v) => updateConfig?.('hostname', v)} placeholder="example.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Record type</label>
          <div className="flex flex-wrap gap-1">
            {RECORD_TYPES.map((t) => (
              <button key={t} onClick={() => updateConfig?.('recordType', t)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${recordType === t ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-[#111] border-[#222] text-zinc-500 hover:text-zinc-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll interval</label>
          <select value={config.pollIntervalSeconds || '300'} onChange={(e) => updateConfig?.('pollIntervalSeconds', e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 outline-none">
            {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.hostname', '$trigger.recordType', '$trigger.oldValue', '$trigger.newValue'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
