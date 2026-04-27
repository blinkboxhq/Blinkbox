import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const INTERVALS = [
  { label: 'Every 5 min',  value: '5' },
  { label: 'Every 15 min', value: '15' },
  { label: 'Every 30 min', value: '30' },
  { label: 'Every hour',   value: '60' },
];

export default function JiraTriggerNode({ config = {}, updateConfig, selected }) {
  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-[#0052CC]/50' : 'border-[#2A2A2A]'}`}>
      <Handle id="output" type="source" position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-[#0052CC] hover:!border-[#0052CC] text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}>
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-[#0052CC]">Jira Issue</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Domain</label>
          <SmartVariableInput value={config.domain || ''} onChange={(v) => updateConfig?.('domain', v)} placeholder="yourcompany.atlassian.net" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Email</label>
          <SmartVariableInput value={config.email || ''} onChange={(v) => updateConfig?.('email', v)} placeholder="you@company.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">API Token</label>
          <input type="password" value={config.token || ''} onChange={(e) => updateConfig?.('token', e.target.value)}
            placeholder="Generate at id.atlassian.com"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-[#0052CC]/50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">JQL Filter</label>
          <SmartVariableInput value={config.jql || ''} onChange={(v) => updateConfig?.('jql', v)} placeholder='project = "MYPROJ" AND created >= -15m' />
          <p className="text-[9px] text-zinc-600">Jira Query Language. Leave blank for all new issues.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll interval</label>
          <select value={config.pollIntervalMinutes || '5'} onChange={(e) => updateConfig?.('pollIntervalMinutes', e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 outline-none">
            {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.key', '$trigger.summary', '$trigger.status', '$trigger.priority', '$trigger.assignee', '$trigger.url'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
