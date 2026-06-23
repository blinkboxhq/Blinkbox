import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import OAuthConnectButton from '../../../../components/ui/OAuthConnectButton';

export default function OutlookTriggerNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-[#0078D4]">Outlook — New Email</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <OAuthConnectButton
            provider="microsoft"
            providerLabel="Microsoft"
            accentColor="blue"
            value={config.accessToken || ''}
            onChange={(id) => updateConfig?.('accessToken', id)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <CredentialPicker
            value={config.accessToken || ''}
            onChange={(id) => updateConfig?.('accessToken', id)}
            accentColor="blue"
            label="Microsoft Access Token"
            placeholder="Select Microsoft credential..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Folder</label>
          <SmartVariableInput value={config.folder || 'inbox'} onChange={(v) => updateConfig?.('folder', v)} placeholder="inbox" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Subject filter <span className="text-zinc-700">(optional)</span></label>
          <SmartVariableInput value={config.subjectFilter || ''} onChange={(v) => updateConfig?.('subjectFilter', v)} placeholder="Invoice" />
        </div>
        <div className="flex items-center justify-between p-2 bg-[#111] border border-[#1e1e1e] rounded-lg">
          <span className="text-[10px] text-zinc-300">Only unread emails</span>
          <div className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${config.onlyUnread !== false ? 'bg-[#0078D4]' : 'bg-zinc-700'}`}
            onClick={() => updateConfig?.('onlyUnread', config.onlyUnread === false ? true : false)}>
            <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${config.onlyUnread !== false ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.subject', '$trigger.from', '$trigger.fromName', '$trigger.preview', '$trigger.receivedAt'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
