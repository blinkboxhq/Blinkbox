import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const ENTITY_TYPES = [
  { value: 'deals', label: 'New / updated Deal' },
  { value: 'persons', label: 'New / updated Person' },
  { value: 'organizations', label: 'New / updated Organization' },
  { value: 'activities', label: 'New Activity' },
];

const INTERVALS = [
  { label: 'Every 5 min', value: '300' },
  { label: 'Every 15 min', value: '900' },
  { label: 'Every 30 min', value: '1800' },
];

export default function PipedriveTriggerNode({ config = {}, updateConfig, selected }) {
  const entityType = config.entityType || 'deals';
  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border shadow-2xl font-sans group ${selected ? 'border-[#F55137]/50' : 'border-[#2A2A2A]'}`}>
      <Handle id="output" type="source" position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-[#F55137] hover:!border-[#F55137] z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}>
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold" style={{ color: '#F55137' }}>Pipedrive</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">API token</label>
          <SmartVariableInput value={config.apiToken || ''} onChange={(v) => updateConfig?.('apiToken', v)} placeholder="Paste your Pipedrive API token" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Watch</label>
          <div className="flex flex-col gap-1">
            {ENTITY_TYPES.map((e) => (
              <button key={e.value} onClick={() => updateConfig?.('entityType', e.value)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-medium text-left border transition-all ${entityType === e.value ? 'bg-[#F55137]/10 border-[#F55137]/30 text-[#F55137]' : 'bg-[#111] border-[#222] text-zinc-500 hover:text-zinc-300'}`}>
                {e.label}
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
          {['$trigger.id', '$trigger.title', '$trigger.status', '$trigger.value', '$trigger.currency', '$trigger.person_name'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
