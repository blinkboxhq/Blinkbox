import SmartVariableInput from '@/components/ui/SmartVariableInput';

const WINDOWS = [
  { value: '7', label: '7 days before expiry' },
  { value: '14', label: '14 days before expiry' },
  { value: '30', label: '30 days before expiry' },
  { value: '60', label: '60 days before expiry' },
];

export default function SslTriggerNode({ config = {}, updateConfig, nodeId }) {
  const window = config.warningDays || '14';
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-green-400">SSL Certificate Expiry</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Hostname</label>
          <SmartVariableInput value={config.hostname || ''} onChange={(v) => updateConfig?.('hostname', v)} placeholder="example.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Alert window</label>
          <div className="flex flex-col gap-1">
            {WINDOWS.map((w) => (
              <button key={w.value} onClick={() => updateConfig?.('warningDays', w.value)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-medium text-left border transition-all ${window === w.value ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-[#111] border-[#222] text-zinc-500 hover:text-zinc-300'}`}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.hostname', '$trigger.daysLeft', '$trigger.expiresAt', '$trigger.issuer', '$trigger.subject'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
