import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const WINDOWS = [
  { value: '7', label: '7 days before expiry' },
  { value: '14', label: '14 days before expiry' },
  { value: '30', label: '30 days before expiry' },
  { value: '60', label: '60 days before expiry' },
];

export default function SslTriggerNode({ config = {}, updateConfig, selected }) {
  const window = config.warningDays || '14';
  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border shadow-2xl font-sans group ${selected ? 'border-green-500/50' : 'border-[#2A2A2A]'}`}>
      <Handle id="output" type="source" position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-green-500 hover:!border-green-500 z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}>
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>
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
