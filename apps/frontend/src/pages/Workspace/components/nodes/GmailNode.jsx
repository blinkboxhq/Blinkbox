import { Send, Mail, Inbox, FileText, Reply } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import OAuthConnectButton from '../../../../components/ui/OAuthConnectButton';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

function GmailIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'sendEmail',    label: 'Send Email',    icon: Send },
  { value: 'readEmail',    label: 'Read Headers',  icon: Mail },
  { value: 'listRecent',   label: 'List Recent',   icon: Inbox },
  { value: 'createDraft',  label: 'Create Draft',  icon: FileText },
  { value: 'replyToEmail', label: 'Reply',         icon: Reply },
];

export default function GmailNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'sendEmail';
  const isCompose = ['sendEmail', 'createDraft', 'replyToEmail'].includes(operation);
  const needsMsgId = operation === 'readEmail';

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#EA4335]/5 border border-[#EA4335]/20 rounded-xl">
        <div className="p-2 bg-[#EA4335]/10 rounded-lg text-[#EA4335] shrink-0">
          <GmailIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#EA4335]">Gmail</span>
          <span className="text-[10px] text-zinc-500">Send, read & manage emails</span>
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
                    ? 'bg-[#EA4335]/10 border-[#EA4335]/40 text-[#EA4335]'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}>
                <Icon className="w-3.5 h-3.5 shrink-0" /> {op.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compose fields */}
      {isCompose && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">To</label>
            <SmartVariableInput value={config.to || ''} onChange={(val) => updateConfig('to', val)} placeholder="recipient@example.com" nodeId={nodeId} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From <span className="text-zinc-700">(optional — defaults to your account)</span></label>
            <SmartVariableInput value={config.from || ''} onChange={(val) => updateConfig('from', val)} placeholder="Your Name <you@gmail.com>" nodeId={nodeId} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subject</label>
            <SmartVariableInput value={config.subject || ''} onChange={(val) => updateConfig('subject', val)} placeholder="Hello from BlinkBox!" nodeId={nodeId} />
          </div>
          {operation === 'replyToEmail' && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Thread ID</label>
              <SmartVariableInput value={config.threadId || ''} onChange={(val) => updateConfig('threadId', val)} placeholder="{{trigger.data.threadId}}" nodeId={nodeId} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Body</label>
            <SmartVariableInput value={config.body || ''} onChange={(val) => updateConfig('body', val)} placeholder="Hello {{trigger.data.name}}, ..." multiline nodeId={nodeId} />
          </div>
        </>
      )}

      {/* Message ID ops */}
      {needsMsgId && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message ID</label>
          <SmartVariableInput value={config.messageId || ''} onChange={(val) => updateConfig('messageId', val)} placeholder="{{trigger.data.messageId}}" nodeId={nodeId} />
        </div>
      )}

      {/* List Recent */}
      {operation === 'listRecent' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Results</label>
          <input type="number" min={1} max={100} value={config.maxResults || 10} onChange={(e) => updateConfig('maxResults', Number(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#EA4335]/40 transition-colors" />
          <p className="text-[10px] text-zinc-600">Returns sender, subject &amp; date of recent emails. Body and search filters aren't available on Gmail's verified non-restricted scope.</p>
        </div>
      )}

      {/* Auth */}
      <OAuthConnectButton provider="google" providerLabel="Google" accentColor="red"
        value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)} icon={GmailIcon} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="red" label="Google OAuth Token" placeholder="Select Google credential..." />
    </div>
  );
}
