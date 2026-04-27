import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const INTERVALS = [
  { label: 'Every 30s', value: '30' },
  { label: 'Every 1 min', value: '60' },
  { label: 'Every 5 min', value: '300' },
  { label: 'Every 15 min', value: '900' },
];

const ALERT_MODES = [
  { value: 'closed', label: 'When port closes' },
  { value: 'open', label: 'When port opens' },
  { value: 'both', label: 'On any state change' },
];

export default function PortMonitorTriggerNode({ config = {}, updateConfig, selected }) {
  const alertOn = config.alertOn || 'closed';
  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border shadow-2xl font-sans group ${selected ? 'border-violet-500/50' : 'border-[#2A2A2A]'}`}>
      <Handle id="output" type="source" position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-violet-500 hover:!border-violet-500 z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}>
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-violet-400">Port Monitor</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Host</label>
          <SmartVariableInput value={config.host || ''} onChange={(v) => updateConfig?.('host', v)} placeholder="192.168.1.1 or example.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Port</label>
          <SmartVariableInput value={config.port || ''} onChange={(v) => updateConfig?.('port', v)} placeholder="80" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Alert when</label>
          <div className="flex flex-col gap-1">
            {ALERT_MODES.map((m) => (
              <button key={m.value} onClick={() => updateConfig?.('alertOn', m.value)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-medium text-left border transition-all ${alertOn === m.value ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-[#111] border-[#222] text-zinc-500 hover:text-zinc-300'}`}>
                {m.label}
              </button>
            ))}
          </div>
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
          {['$trigger.host', '$trigger.port', '$trigger.state', '$trigger.previousState'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
