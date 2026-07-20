import { useEffect } from 'react';
import imgGmail from './logo.png';
import {
  Send, Reply, Forward, Mail, Search, FileText, ListChecks, MailCheck,
  BookOpen, MailX, Star, StarOff, Archive, Trash2, RotateCcw, Tag,
  TagsIcon, Plus, MessagesSquare, User,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigBanner
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

function GmailIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'sendEmail',    label: 'Send Email',   icon: Send,           group: 'Compose' },
  { value: 'replyToEmail', label: 'Reply',        icon: Reply,          group: 'Compose' },
  { value: 'forwardEmail', label: 'Forward',      icon: Forward,        group: 'Compose' },

  { value: 'readEmail',    label: 'Read Email',   icon: Mail,           group: 'Read' },
  { value: 'searchEmails', label: 'Search',       icon: Search,         group: 'Read' },
  { value: 'getThread',    label: 'Get Thread',   icon: MessagesSquare, group: 'Read' },
  { value: 'listThreads',  label: 'List Threads', icon: ListChecks,     group: 'Read' },
  { value: 'getProfile',   label: 'Get Profile',  icon: User,           group: 'Read' },

  { value: 'createDraft',  label: 'Create Draft', icon: FileText,       group: 'Drafts' },
  { value: 'listDrafts',   label: 'List Drafts',  icon: ListChecks,     group: 'Drafts' },
  { value: 'sendDraft',    label: 'Send Draft',   icon: MailCheck,      group: 'Drafts' },
  { value: 'deleteDraft',  label: 'Delete Draft', icon: Trash2,         group: 'Drafts' },

  { value: 'markRead',     label: 'Mark Read',    icon: BookOpen,       group: 'Organize' },
  { value: 'markUnread',   label: 'Mark Unread',  icon: MailX,          group: 'Organize' },
  { value: 'starEmail',    label: 'Star',         icon: Star,           group: 'Organize' },
  { value: 'unstarEmail',  label: 'Unstar',       icon: StarOff,        group: 'Organize' },
  { value: 'archiveEmail', label: 'Archive',      icon: Archive,        group: 'Organize' },
  { value: 'deleteEmail',  label: 'Trash',        icon: Trash2,         group: 'Organize' },
  { value: 'untrashEmail', label: 'Untrash',      icon: RotateCcw,      group: 'Organize' },

  { value: 'addLabel',     label: 'Add Label',    icon: Tag,            group: 'Labels' },
  { value: 'removeLabel',  label: 'Remove Label', icon: TagsIcon,       group: 'Labels' },
  { value: 'listLabels',   label: 'List Labels',  icon: ListChecks,     group: 'Labels' },
  { value: 'createLabel',  label: 'Create Label', icon: Plus,           group: 'Labels' },
  { value: 'deleteLabel',  label: 'Delete Label', icon: Trash2,         group: 'Labels' },
];

const COMPOSE_OPS = ['sendEmail', 'replyToEmail', 'forwardEmail', 'createDraft'];
const MSG_ID_OPS = ['readEmail', 'forwardEmail', 'markRead', 'markUnread', 'starEmail', 'unstarEmail', 'archiveEmail', 'deleteEmail', 'untrashEmail', 'addLabel', 'removeLabel'];
const LABEL_ID_OPS = ['addLabel', 'removeLabel', 'deleteLabel'];
const DRAFT_ID_OPS = ['sendDraft', 'deleteDraft'];

function Field({ label, hint, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}
          {optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
          {hint && <span className="text-neutral-700 normal-case tracking-normal"> {hint}</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function GmailNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'sendEmail';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);
  const currentOp = OPERATIONS.find((o) => o.value === operation);
  const isCompose = COMPOSE_OPS.includes(operation);
  const needsMsgId = MSG_ID_OPS.includes(operation);
  const needsLabelId = LABEL_ID_OPS.includes(operation);
  const needsDraftId = DRAFT_ID_OPS.includes(operation);

  const field = (label, k, { placeholder, multiline, hint, optional } = {}) => (
    <Field label={label} hint={hint} optional={optional}>
      <SmartVariableInput value={config[k] || ''} onChange={(val) => updateConfig(k, val)} placeholder={placeholder} multiline={multiline} nodeId={nodeId} />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {isCompose && (
        <>
          {operation !== 'forwardEmail' && field('To', 'to', { placeholder: 'recipient@example.com' })}
          {operation === 'forwardEmail' && field('Forward To', 'to', { placeholder: 'recipient@example.com' })}
          {field('From', 'from', { hint: '(optional — defaults to your account)', placeholder: 'Your Name <you@gmail.com>' })}
          {field('Reply-To', 'replyTo', { optional: true, placeholder: 'replies@example.com' })}
          {field('Subject', 'subject', {
            hint: operation === 'forwardEmail' ? '(optional — defaults to Fwd:)' : '',
            placeholder: 'Hello from BlinkBox!',
          })}
          {operation === 'replyToEmail' && field('Thread ID', 'threadId', { placeholder: '{{trigger.data.threadId}}' })}
          {field(operation === 'forwardEmail' ? 'Note' : 'Body', 'body', {
            hint: operation === 'forwardEmail' ? '(optional intro)' : '',
            placeholder: 'Hello {{trigger.data.name}}, ...',
            multiline: true,
          })}
        </>
      )}

      {needsMsgId && field('Message ID', 'messageId', { placeholder: '{{trigger.data.messageId}}' })}

      {needsLabelId && field('Label ID', 'labelId', { placeholder: 'Label_12345 or STARRED, IMPORTANT' })}

      {needsDraftId && field('Draft ID', 'draftId', { placeholder: '{{steps.createDraft.draftId}}' })}

      {operation === 'createLabel' && field('Label Name', 'labelName', { placeholder: 'Invoices' })}

      {operation === 'getThread' && field('Thread ID', 'threadId', { placeholder: '{{trigger.data.threadId}}' })}

      {(operation === 'searchEmails' || operation === 'listThreads') && (
        <>
          <Field label="Query" optional={operation === 'listThreads'} hint="Gmail search syntax">
            <SmartVariableInput value={config.query || ''} onChange={(val) => updateConfig('query', val)} placeholder="from:user@example.com is:unread" nodeId={nodeId} />
          </Field>
          <ConfigInput
            label="Max Results"
            type="number"
            value={config.maxResults || 10}
            onChange={(v) => updateConfig('maxResults', Number(v))}
          />
        </>
      )}

      {operation === 'listDrafts' && (
        <ConfigInput
          label="Max Results"
          type="number"
          value={config.maxResults || 10}
          onChange={(v) => updateConfig('maxResults', Number(v))}
        />
      )}

      {operation === 'getProfile' && (
        <ConfigBanner>Returns the connected account's email address and total message/thread counts. No parameters needed.</ConfigBanner>
      )}

      <OAuthConnectButton
        provider="google"
        providerLabel="Google"
        accentColor="blue"
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        icon={GmailIcon}
      />
      <p className="text-[10px] text-neutral-600 -mt-3 font-mono">Or use an existing credential:</p>
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Google OAuth Token"
        placeholder="Select Google credential..."
      />
    </ConfigSection>
  );
}
