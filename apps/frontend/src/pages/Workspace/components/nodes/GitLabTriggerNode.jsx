import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const EVENT_TYPES = [
  { value: 'merge_request', label: 'Merge Request' },
  { value: 'issue', label: 'Issue' },
  { value: 'pipeline', label: 'Pipeline' },
];

export default function GitLabTriggerNode({ config = {}, updateConfig, nodeId }) {
  const eventType = config.eventType || 'merge_request';
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-[#FC6D26]">GitLab</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">GitLab Host</label>
          <SmartVariableInput value={config.host || 'gitlab.com'} onChange={(v) => updateConfig?.('host', v)} placeholder="gitlab.com or self-hosted" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Project ID or path</label>
          <SmartVariableInput value={config.projectId || ''} onChange={(v) => updateConfig?.('projectId', v)} placeholder="namespace/project" />
        </div>
        <div className="flex flex-col gap-1">
          <CredentialPicker
            value={config.token || ''}
            onChange={(id) => updateConfig?.('token', id)}
            accentColor="blue"
            label="Access Token"
            placeholder="Select GitLab Access Token..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Event type</label>
          <div className="flex gap-1.5">
            {EVENT_TYPES.map((e) => (
              <button key={e.value} onClick={() => updateConfig?.('eventType', e.value)}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${eventType === e.value ? 'bg-[#FC6D26]/15 border-[#FC6D26]/40 text-[#FC6D26]' : 'bg-[#111] border-[#222] text-zinc-600 hover:text-zinc-400'}`}>
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.title', '$trigger.state', '$trigger.author', '$trigger.url', '$trigger.type'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
