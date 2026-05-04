import { MessageSquare, Phone, Search } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

function TwilioIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 20.8c-4.85 0-8.8-3.95-8.8-8.8S7.15 3.2 12 3.2s8.8 3.95 8.8 8.8-3.95 8.8-8.8 8.8zm4.4-11.2a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0zm-8.8 0a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0zm8.8 8.8a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0zm-8.8 0a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'sendSms',      label: 'Send SMS',      icon: MessageSquare },
  { value: 'makeCall',     label: 'Make Call',     icon: Phone },
  { value: 'lookupNumber', label: 'Lookup Number', icon: Search },
];

export default function TwilioNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'sendSms';

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#F22F46]/5 border border-[#F22F46]/20 rounded-xl">
        <div className="p-2 bg-[#F22F46]/10 rounded-lg text-[#F22F46] shrink-0">
          <TwilioIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#F22F46]">Twilio</span>
          <span className="text-[10px] text-zinc-500">SMS, voice calls & phone lookup</span>
        </div>
      </div>

      {/* Operations */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-3 gap-2">
          {OPERATIONS.map((op) => {
            const Icon = op.icon;
            return (
              <button key={op.value} onClick={() => updateConfig('operation', op.value)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  operation === op.value
                    ? 'bg-[#F22F46]/10 border-[#F22F46]/40 text-[#F22F46]'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}>
                <Icon className="w-4 h-4" /> {op.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* sendSms */}
      {operation === 'sendSms' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From (Twilio number)</label>
            <SmartVariableInput value={config.from || ''} onChange={(val) => updateConfig('from', val)} placeholder="+14155551234" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">To</label>
            <SmartVariableInput value={config.to || ''} onChange={(val) => updateConfig('to', val)} placeholder="{{trigger.data.phone}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
            <SmartVariableInput value={config.body || ''} onChange={(val) => updateConfig('body', val)} placeholder="Hello {{trigger.data.name}}!" multiline />
          </div>
        </>
      )}

      {/* makeCall */}
      {operation === 'makeCall' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From (Twilio number)</label>
            <SmartVariableInput value={config.from || ''} onChange={(val) => updateConfig('from', val)} placeholder="+14155551234" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">To</label>
            <SmartVariableInput value={config.to || ''} onChange={(val) => updateConfig('to', val)} placeholder="{{trigger.data.phone}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TwiML URL</label>
            <SmartVariableInput value={config.url || ''} onChange={(val) => updateConfig('url', val)} placeholder="https://yourapp.com/twiml/greeting" />
            <p className="text-[10px] text-zinc-600">URL that returns TwiML to control the call</p>
          </div>
        </>
      )}

      {/* lookupNumber */}
      {operation === 'lookupNumber' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone Number</label>
          <SmartVariableInput value={config.phoneNumber || ''} onChange={(val) => updateConfig('phoneNumber', val)} placeholder="+14155551234" />
          <p className="text-[10px] text-zinc-600">E.164 format — returns carrier & line type info</p>
        </div>
      )}

      {/* Credential */}
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="red" label="Twilio Account SID:AuthToken" placeholder="Select Twilio credential..." />
      <p className="text-[10px] text-zinc-600 -mt-3">Format credential as AccountSID:AuthToken</p>
    </div>
  );
}
