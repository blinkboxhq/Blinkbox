import {
  Send, Reply, Forward, Mail, Search, FileText, ListChecks, MailCheck,
  BookOpen, MailX, Star, StarOff, Archive, Trash2, RotateCcw, Tag,
  TagsIcon, Plus, MessagesSquare, User,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';
import CredentialPicker from '@/components/ui/CredentialPicker';

function GmailIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

const GROUPS = [
  {
    name: 'Compose',
    ops: [
      { value: 'sendEmail', label: 'Send Email', icon: Send },
      { value: 'replyToEmail', label: 'Reply', icon: Reply },
      { value: 'forwardEmail', label: 'Forward', icon: Forward },
    ],
  },
  {
    name: 'Read',
    ops: [
      { value: 'readEmail', label: 'Read Email', icon: Mail },
      { value: 'searchEmails', label: 'Search', icon: Search },
      { value: 'getThread', label: 'Get Thread', icon: MessagesSquare },
      { value: 'listThreads', label: 'List Threads', icon: ListChecks },
      { value: 'getProfile', label: 'Get Profile', icon: User },
    ],
  },
  {
    name: 'Drafts',
    ops: [
      { value: 'createDraft', label: 'Create Draft', icon: FileText },
      { value: 'listDrafts', label: 'List Drafts', icon: ListChecks },
      { value: 'sendDraft', label: 'Send Draft', icon: MailCheck },
      { value: 'deleteDraft', label: 'Delete Draft', icon: Trash2 },
    ],
  },
  {
    name: 'Organize',
    ops: [
      { value: 'markRead', label: 'Mark Read', icon: BookOpen },
      { value: 'markUnread', label: 'Mark Unread', icon: MailX },
      { value: 'starEmail', label: 'Star', icon: Star },
      { value: 'unstarEmail', label: 'Unstar', icon: StarOff },
      { value: 'archiveEmail', label: 'Archive', icon: Archive },
      { value: 'deleteEmail', label: 'Trash', icon: Trash2 },
      { value: 'untrashEmail', label: 'Untrash', icon: RotateCcw },
    ],
  },
  {
    name: 'Labels',
    ops: [
      { value: 'addLabel', label: 'Add Label', icon: Tag },
      { value: 'removeLabel', label: 'Remove Label', icon: TagsIcon },
      { value: 'listLabels', label: 'List Labels', icon: ListChecks },
      { value: 'createLabel', label: 'Create Label', icon: Plus },
      { value: 'deleteLabel', label: 'Delete Label', icon: Trash2 },
    ],
  },
];

const COMPOSE_OPS = ['sendEmail', 'replyToEmail', 'forwardEmail', 'createDraft'];
const MSG_ID_OPS = ['readEmail', 'forwardEmail', 'markRead', 'markUnread', 'starEmail', 'unstarEmail', 'archiveEmail', 'deleteEmail', 'untrashEmail', 'addLabel', 'removeLabel'];
const LABEL_ID_OPS = ['addLabel', 'removeLabel', 'deleteLabel'];
const DRAFT_ID_OPS = ['sendDraft', 'deleteDraft'];

const lbl = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest';
const inputCls = 'w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#EA4335]/40 transition-colors';

export default function GmailNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'sendEmail';
  const isCompose = COMPOSE_OPS.includes(operation);
  const needsMsgId = MSG_ID_OPS.includes(operation);
  const needsLabelId = LABEL_ID_OPS.includes(operation);
  const needsDraftId = DRAFT_ID_OPS.includes(operation);

  const Field = ({ label, hint, k, placeholder, multiline }) => (
    <div className="flex flex-col gap-2">
      <label className={lbl}>{label}{hint && <span className="text-zinc-700"> {hint}</span>}</label>
      <SmartVariableInput value={config[k] || ''} onChange={(val) => updateConfig(k, val)} placeholder={placeholder} multiline={multiline} nodeId={nodeId} />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#EA4335]/5 border border-[#EA4335]/20 rounded-xl">
        <div className="p-2 bg-[#EA4335]/10 rounded-lg text-[#EA4335] shrink-0">
          <GmailIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#EA4335]">Gmail</span>
          <span className="text-[10px] text-zinc-500">Send, read, label & manage emails</span>
        </div>
      </div>

      {/* Operations */}
      <div className="flex flex-col gap-3">
        {GROUPS.map((group) => (
          <div key={group.name} className="flex flex-col gap-2">
            <label className={lbl}>{group.name}</label>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((op) => {
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
        ))}
      </div>

      {/* Compose fields */}
      {isCompose && (
        <>
          {operation !== 'forwardEmail' && (
            <Field label="To" k="to" placeholder="recipient@example.com" />
          )}
          {operation === 'forwardEmail' && (
            <Field label="Forward To" k="to" placeholder="recipient@example.com" />
          )}
          <Field label="From" hint="(optional — defaults to your account)" k="from" placeholder="Your Name <you@gmail.com>" />
          <Field label="Reply-To" hint="(optional)" k="replyTo" placeholder="replies@example.com" />
          <Field label="Subject" hint={operation === 'forwardEmail' ? '(optional — defaults to Fwd:)' : ''} k="subject" placeholder="Hello from BlinkBox!" />
          {operation === 'replyToEmail' && (
            <Field label="Thread ID" k="threadId" placeholder="{{trigger.data.threadId}}" />
          )}
          <Field label={operation === 'forwardEmail' ? 'Note' : 'Body'} hint={operation === 'forwardEmail' ? '(optional intro)' : ''} k="body" placeholder="Hello {{trigger.data.name}}, ..." multiline />
        </>
      )}

      {/* Message ID */}
      {needsMsgId && (
        <Field label="Message ID" k="messageId" placeholder="{{trigger.data.messageId}}" />
      )}

      {/* Label ID for add/remove/delete label */}
      {needsLabelId && (
        <Field label="Label ID" k="labelId" placeholder="Label_12345 or STARRED, IMPORTANT" />
      )}

      {/* Draft ID */}
      {needsDraftId && (
        <Field label="Draft ID" k="draftId" placeholder="{{steps.createDraft.draftId}}" />
      )}

      {/* Create Label */}
      {operation === 'createLabel' && (
        <Field label="Label Name" k="labelName" placeholder="Invoices" />
      )}

      {/* Get Thread */}
      {operation === 'getThread' && (
        <Field label="Thread ID" k="threadId" placeholder="{{trigger.data.threadId}}" />
      )}

      {/* Search / List threads */}
      {(operation === 'searchEmails' || operation === 'listThreads') && (
        <>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Query{operation === 'listThreads' && <span className="text-zinc-700"> (optional)</span>}</label>
            <SmartVariableInput value={config.query || ''} onChange={(val) => updateConfig('query', val)} placeholder='from:user@example.com is:unread' nodeId={nodeId} />
            <p className="text-[10px] text-zinc-600">Gmail search syntax — from:, subject:, is:unread, after:2024/01/01, label:work, etc.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Max Results</label>
            <input type="number" min={1} max={100} value={config.maxResults || 10} onChange={(e) => updateConfig('maxResults', Number(e.target.value))} className={inputCls} />
          </div>
        </>
      )}

      {/* List drafts max */}
      {operation === 'listDrafts' && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>Max Results</label>
          <input type="number" min={1} max={100} value={config.maxResults || 10} onChange={(e) => updateConfig('maxResults', Number(e.target.value))} className={inputCls} />
        </div>
      )}

      {operation === 'getProfile' && (
        <p className="text-[10px] text-zinc-600 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5">Returns the connected account's email address and total message/thread counts. No parameters needed.</p>
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
