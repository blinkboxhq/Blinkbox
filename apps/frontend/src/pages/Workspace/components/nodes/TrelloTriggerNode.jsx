import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const WATCH_TYPES = [
  { value: 'new_card',    label: 'New card created' },
  { value: 'card_moved',  label: 'Card moved to list' },
  { value: 'all',         label: 'All card actions' },
];

export default function TrelloTriggerNode({ config = {}, updateConfig, selected }) {
  const watchType = config.watchType || 'new_card';
  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-[#0052CC]/50' : 'border-[#2A2A2A]'}`}>
      <Handle id="output" type="source" position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-[#0052CC] hover:!border-[#0052CC] text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}>
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-[#0052CC]">Trello</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">API Key</label>
          <input type="password" value={config.apiKey || ''} onChange={(e) => updateConfig?.('apiKey', e.target.value)}
            placeholder="From trello.com/app-key"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-[#0052CC]/50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Token</label>
          <input type="password" value={config.token || ''} onChange={(e) => updateConfig?.('token', e.target.value)}
            placeholder="OAuth token"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-[#0052CC]/50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Board ID</label>
          <SmartVariableInput value={config.boardId || ''} onChange={(v) => updateConfig?.('boardId', v)} placeholder="Board ID from URL" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Watch for</label>
          <div className="flex flex-col gap-1">
            {WATCH_TYPES.map((w) => (
              <button key={w.value} onClick={() => updateConfig?.('watchType', w.value)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-medium text-left border transition-all ${watchType === w.value ? 'bg-[#0052CC]/15 border-[#0052CC]/40 text-[#4285F4]' : 'bg-[#111] border-[#222] text-zinc-500 hover:text-zinc-300'}`}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">List name filter <span className="text-zinc-700 normal-case">(optional)</span></label>
          <SmartVariableInput value={config.listFilter || ''} onChange={(v) => updateConfig?.('listFilter', v)} placeholder="Done" />
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.cardName', '$trigger.listName', '$trigger.memberName', '$trigger.url', '$trigger.date'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
