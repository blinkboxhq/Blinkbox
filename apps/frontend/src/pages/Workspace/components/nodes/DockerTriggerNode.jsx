import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const EVENT_TYPES = ['all', 'container', 'image', 'volume', 'network', 'plugin'];

export default function DockerTriggerNode({ config = {}, updateConfig, nodeId }) {
  const eventType = config.eventType || 'all';
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-[#2496ED]">Docker Events</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Docker Host</label>
          <SmartVariableInput value={config.host || ''} onChange={(v) => updateConfig?.('host', v)} placeholder="unix:///var/run/docker.sock" />
          <p className="text-[9px] text-zinc-600">Use unix:// for local or tcp://host:2375 for remote.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Event Type</label>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.map((t) => (
              <button key={t} onClick={() => updateConfig?.('eventType', t)}
                className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all ${eventType === t ? 'bg-[#2496ED]/15 border-[#2496ED]/40 text-[#2496ED]' : 'bg-[#111] border-[#222] text-zinc-600 hover:text-zinc-400'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Container name filter <span className="text-zinc-700 normal-case">(optional)</span></label>
          <SmartVariableInput value={config.containerFilter || ''} onChange={(v) => updateConfig?.('containerFilter', v)} placeholder="nginx" />
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.type', '$trigger.action', '$trigger.name', '$trigger.image', '$trigger.timestamp'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
