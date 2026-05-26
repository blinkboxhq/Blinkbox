import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const WATCH_TYPES = [
  { value: 'new_card',    label: 'New card created' },
  { value: 'card_moved',  label: 'Card moved to list' },
  { value: 'all',         label: 'All card actions' },
];

export default function TrelloTriggerNode({ config = {}, updateConfig, nodeId }) {
  const watchType = config.watchType || 'new_card';
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-[#0052CC]">Trello</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <CredentialPicker
            value={config.apiKey || ''}
            onChange={(id) => updateConfig?.('apiKey', id)}
            accentColor="blue"
            label="API Key"
            placeholder="Select Trello API Key..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <CredentialPicker
            value={config.token || ''}
            onChange={(id) => updateConfig?.('token', id)}
            accentColor="blue"
            label="Token"
            placeholder="Select Trello Token..."
          />
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
