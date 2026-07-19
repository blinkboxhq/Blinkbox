import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';

export default function TeamsTriggerNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <span className="text-[11px] font-semibold text-[#6264A7]">Microsoft Teams — Message</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <OAuthConnectButton provider="microsoft" providerLabel="Microsoft" accentColor="blue"
          value={config.accessToken || ''} onChange={(id) => updateConfig?.('accessToken', id)} />
        <CredentialPicker value={config.accessToken || ''} onChange={(id) => updateConfig?.('accessToken', id)}
          accentColor="blue" label="Access Token" credentialType="Microsoft" placeholder="Select Microsoft OAuth token..." />
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Team ID</label>
          <SmartVariableInput value={config.teamId || ''} onChange={(v) => updateConfig?.('teamId', v)} placeholder="From Teams URL or Graph API" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Channel ID</label>
          <SmartVariableInput value={config.channelId || ''} onChange={(v) => updateConfig?.('channelId', v)} placeholder="19:abc…@thread.tacv2" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Keyword filter <span className="text-zinc-700">(optional)</span></label>
          <SmartVariableInput value={config.keywordFilter || ''} onChange={(v) => updateConfig?.('keywordFilter', v)} placeholder="urgent" />
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.text', '$trigger.author', '$trigger.createdAt', '$trigger.webUrl'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
