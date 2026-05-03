import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const ALERT_MODES = [
  { value: 'down', label: 'When site goes DOWN' },
  { value: 'up', label: 'When site comes back UP' },
  { value: 'both', label: 'On any status change' },
  { value: 'slow', label: 'When response is slow' },
];

const INTERVALS = [
  { label: 'Every 30s', value: '30' }, { label: 'Every 1 min', value: '60' },
  { label: 'Every 5 min', value: '300' }, { label: 'Every 15 min', value: '900' },
];

export default function HttpMonitorTriggerNode({ config = {}, updateConfig, nodeId }) {
  const alertOn = config.alertOn || 'down';
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-red-400">HTTP Monitor</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">URL to monitor</label>
          <SmartVariableInput value={config.url || ''} onChange={(v) => updateConfig?.('url', v)} placeholder="https://yoursite.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Alert when</label>
          <div className="flex flex-col gap-1">
            {ALERT_MODES.map((m) => (
              <button key={m.value} onClick={() => updateConfig?.('alertOn', m.value)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-medium text-left border transition-all ${alertOn === m.value ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#111] border-[#222] text-zinc-500 hover:text-zinc-300'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {alertOn === 'slow' && (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Max response time (ms)</label>
            <SmartVariableInput value={config.maxResponseMs || '3000'} onChange={(v) => updateConfig?.('maxResponseMs', v)} placeholder="3000" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Keyword must be present <span className="text-zinc-700">(optional)</span></label>
          <SmartVariableInput value={config.expectedKeyword || ''} onChange={(v) => updateConfig?.('expectedKeyword', v)} placeholder="OK" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Check interval</label>
          <select value={config.pollIntervalSeconds || '60'} onChange={(e) => updateConfig?.('pollIntervalSeconds', e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 outline-none">
            {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.url', '$trigger.status', '$trigger.state', '$trigger.responseTime', '$trigger.reason'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
