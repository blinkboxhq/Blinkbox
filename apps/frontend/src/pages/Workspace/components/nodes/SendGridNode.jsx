import { Send, Layout, Users, UserPlus } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

function SendGridIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M0 8h8V0H0v8zm1-7h6v6H1V1zM8 0v8h8V0H8zm7 7H9V1h6v6zM0 24h8v-8H0v8zm1-7h6v6H1v-6zm15-9h-6v6h-1V8h-1v6H8v1h6v-1h1v6h1v-6h6v-1h-6V8zm-6 7H9v-6h6v6zm.97 2.03H16v6h-6v-1h5v-5zM16 16h1v7h-7v-1h6v-6zM8 16H0v8h8v-8zm-1 7H1v-6h6v6z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'sendEmail',    label: 'Send Email',    icon: Send },
  { value: 'sendTemplate', label: 'Use Template',  icon: Layout },
  { value: 'sendBulk',     label: 'Bulk Send',     icon: Users },
  { value: 'addContact',   label: 'Add Contact',   icon: UserPlus },
];

export default function SendGridNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'sendEmail';
  const isEmail = ['sendEmail', 'sendTemplate', 'sendBulk'].includes(operation);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#1A82E2]/5 border border-[#1A82E2]/20 rounded-xl">
        <div className="p-2 bg-[#1A82E2]/10 rounded-lg text-[#1A82E2] shrink-0">
          <SendGridIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#1A82E2]">SendGrid</span>
          <span className="text-[10px] text-zinc-500">Transactional email & marketing</span>
        </div>
      </div>

      {/* Operations */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => {
            const Icon = op.icon;
            return (
              <button key={op.value} onClick={() => updateConfig('operation', op.value)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  operation === op.value
                    ? 'bg-[#1A82E2]/10 border-[#1A82E2]/40 text-[#1A82E2]'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}>
                <Icon className="w-3.5 h-3.5 shrink-0" /> {op.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Shared email fields */}
      {isEmail && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {operation === 'sendBulk' ? 'Recipients (JSON array)' : 'To'}
            </label>
            {operation === 'sendBulk' ? (
              <SmartVariableInput
                value={typeof config.recipients === 'string' ? config.recipients : (config.recipients ? JSON.stringify(config.recipients) : '')}
                onChange={(val) => { try { updateConfig('recipients', JSON.parse(val)); } catch { updateConfig('recipients', val); }}}
                placeholder='[{"email":"a@b.com","name":"Alice"},{"email":"c@d.com"}]'
                multiline
              />
            ) : (
              <SmartVariableInput value={config.to || ''} onChange={(val) => updateConfig('to', val)} placeholder="{{trigger.data.email}}" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From</label>
            <SmartVariableInput value={config.from || ''} onChange={(val) => updateConfig('from', val)} placeholder="Your Name <noreply@yourapp.com>" />
          </div>
          {operation !== 'sendTemplate' && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subject</label>
              <SmartVariableInput value={config.subject || ''} onChange={(val) => updateConfig('subject', val)} placeholder="Welcome to {{trigger.data.company}}!" />
            </div>
          )}
        </>
      )}

      {/* sendEmail body */}
      {operation === 'sendEmail' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Body</label>
          <SmartVariableInput value={config.body || ''} onChange={(val) => updateConfig('body', val)} placeholder="Hello {{trigger.data.name}}, ..." multiline />
        </div>
      )}

      {/* sendTemplate */}
      {operation === 'sendTemplate' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Template ID</label>
            <input value={config.templateId || ''} onChange={(e) => updateConfig('templateId', e.target.value)} placeholder="d-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#1A82E2]/40 transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dynamic Data (JSON)</label>
            <SmartVariableInput
              value={typeof config.dynamicData === 'string' ? config.dynamicData : (config.dynamicData ? JSON.stringify(config.dynamicData, null, 2) : '')}
              onChange={(val) => { try { updateConfig('dynamicData', JSON.parse(val)); } catch { updateConfig('dynamicData', val); }}}
              placeholder='{"name": "{{trigger.data.name}}", "plan": "Pro"}'
              multiline
            />
          </div>
        </>
      )}

      {/* addContact */}
      {operation === 'addContact' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email</label>
            <SmartVariableInput value={config.email || ''} onChange={(val) => updateConfig('email', val)} placeholder="{{trigger.data.email}}" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">First Name</label>
              <SmartVariableInput value={config.firstName || ''} onChange={(val) => updateConfig('firstName', val)} placeholder="{{trigger.data.firstName}}" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Name</label>
              <SmartVariableInput value={config.lastName || ''} onChange={(val) => updateConfig('lastName', val)} placeholder="{{trigger.data.lastName}}" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">List ID <span className="text-zinc-700">(optional)</span></label>
            <input value={config.listIds || ''} onChange={(e) => updateConfig('listIds', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#1A82E2]/40 transition-colors" />
          </div>
        </>
      )}

      {/* Credential */}
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue" label="SendGrid API Key" placeholder="Select SendGrid credential..." />
    </div>
  );
}
