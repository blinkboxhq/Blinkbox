import imgOutlook from './logo.svg';
import {
  Send, Reply, ReplyAll, Forward, Mail, Inbox, CalendarPlus, CalendarDays,
  UserPlus, FolderInput, Flag, MailOpen, Trash2, Paperclip, FileText,
  Folders, FolderPlus, FolderX, Eye, Pencil, CalendarX, CalendarCheck,
  Users, UserX,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'sendEmail',             label: 'Send Email',            icon: Send,          desc: 'Email' },
  { value: 'replyEmail',            label: 'Reply to Email',        icon: Reply,         desc: 'Email' },
  { value: 'replyAll',              label: 'Reply All',             icon: ReplyAll,      desc: 'Email' },
  { value: 'forwardEmail',          label: 'Forward Email',         icon: Forward,       desc: 'Email' },
  { value: 'getEmail',              label: 'Get Email',             icon: Mail,          desc: 'Email' },
  { value: 'listEmails',            label: 'List Emails',           icon: Inbox,         desc: 'Email' },
  { value: 'moveEmail',             label: 'Move to Folder',        icon: FolderInput,   desc: 'Email' },
  { value: 'flagEmail',             label: 'Flag / Unflag',         icon: Flag,          desc: 'Email' },
  { value: 'markRead',              label: 'Mark Read / Unread',    icon: MailOpen,      desc: 'Email' },
  { value: 'deleteEmail',           label: 'Delete Email',          icon: Trash2,        desc: 'Email' },
  { value: 'getMessageAttachments', label: 'Get Attachments',       icon: Paperclip,     desc: 'Email' },
  { value: 'createDraft',           label: 'Create Draft',          icon: FileText,      desc: 'Drafts & Folders' },
  { value: 'listFolders',           label: 'List Folders',          icon: Folders,       desc: 'Drafts & Folders' },
  { value: 'createFolder',          label: 'Create Folder',         icon: FolderPlus,    desc: 'Drafts & Folders' },
  { value: 'deleteFolder',          label: 'Delete Folder',         icon: FolderX,       desc: 'Drafts & Folders' },
  { value: 'createEvent',           label: 'Create Calendar Event', icon: CalendarPlus,  desc: 'Calendar' },
  { value: 'getCalendar',           label: 'List Calendar Events',  icon: CalendarDays,  desc: 'Calendar' },
  { value: 'getEvent',              label: 'Get Event',             icon: Eye,           desc: 'Calendar' },
  { value: 'updateEvent',           label: 'Update Event',          icon: Pencil,        desc: 'Calendar' },
  { value: 'deleteEvent',           label: 'Delete Event',          icon: CalendarX,     desc: 'Calendar' },
  { value: 'acceptEvent',           label: 'Accept Invite',         icon: CalendarCheck, desc: 'Calendar' },
  { value: 'declineEvent',          label: 'Decline Invite',        icon: CalendarX,     desc: 'Calendar' },
  { value: 'createContact',         label: 'Create Contact',        icon: UserPlus,      desc: 'Contacts' },
  { value: 'getContact',            label: 'Get Contact',           icon: Eye,           desc: 'Contacts' },
  { value: 'listContacts',          label: 'List Contacts',         icon: Users,         desc: 'Contacts' },
  { value: 'updateContact',         label: 'Update Contact',        icon: Pencil,        desc: 'Contacts' },
  { value: 'deleteContact',         label: 'Delete Contact',        icon: UserX,         desc: 'Contacts' },
];

const MESSAGE_ID_OPS = ['replyEmail', 'replyAll', 'forwardEmail', 'getEmail', 'moveEmail', 'flagEmail', 'markRead', 'deleteEmail', 'getMessageAttachments'];
const EVENT_ID_OPS = ['getEvent', 'updateEvent', 'deleteEvent', 'acceptEvent', 'declineEvent'];
const CONTACT_ID_OPS = ['getContact', 'updateContact', 'deleteContact'];

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function OutlookNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'sendEmail';
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgOutlook} title="Outlook" subtitle={currentOp?.label || 'Email, calendar, contacts via Microsoft 365'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {MESSAGE_ID_OPS.includes(op) &&
        text('Message ID', 'messageId', { placeholder: '{{ $json.id }}' })}

      {(op === 'sendEmail' || op === 'replyEmail' || op === 'forwardEmail') &&
        text('To', 'to', { placeholder: '{{ $json.email }}' })}

      {(op === 'sendEmail' || op === 'createDraft') && (
        <>
          {op === 'createDraft' && text('To', 'to', { optional: true, placeholder: '{{ $json.email }}' })}
          {text('CC', 'cc', { optional: true, placeholder: 'manager@company.com' })}
          {op === 'sendEmail' && text('BCC', 'bcc', { optional: true, placeholder: 'audit@company.com' })}
          {text('Subject', 'subject', { placeholder: 'Weekly report — {{ $json.week }}' })}
        </>
      )}

      {(op === 'sendEmail' || op === 'replyEmail' || op === 'createDraft') && (
        <>
          {text('Body', 'body', { placeholder: 'Hi {{ $json.name }},\n\nHere is your report...', multiline: true })}
          <ConfigToggleRow
            label="Send as HTML"
            on={!!config.isHtml}
            onChange={(v) => updateConfig('isHtml', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {(op === 'replyAll' || op === 'forwardEmail') &&
        text('Comment', 'comment', { optional: true, placeholder: 'FYI — see below', multiline: true })}

      {(op === 'createEvent' || op === 'updateEvent') && (
        <>
          {text('Subject', 'subject', { optional: op === 'updateEvent', placeholder: 'Team sync — {{ $json.team }}' })}
          <div className="grid grid-cols-2 gap-2">
            {text('Start (ISO)', 'start', { optional: op === 'updateEvent', placeholder: '{{ $json.startTime }}' })}
            {text('End (ISO)', 'end', { optional: op === 'updateEvent', placeholder: '{{ $json.endTime }}' })}
          </div>
          {text('Attendees (emails, comma-sep)', 'attendees', { optional: true, placeholder: 'alice@co.com, bob@co.com' })}
          {text('Location / Teams link', 'location', { optional: true, placeholder: 'Conference Room B' })}
          {text('Description', 'body', { optional: true, placeholder: 'Agenda...', multiline: true })}
          {text('Time Zone', 'timeZone', { optional: true, placeholder: 'UTC' })}
        </>
      )}

      {(op === 'acceptEvent' || op === 'declineEvent') && (
        <>
          {text('Comment', 'comment', { optional: true, placeholder: 'See you there!' })}
          <ConfigToggleRow
            label="Send response to organizer"
            on={config.sendResponse !== false}
            onChange={(v) => updateConfig('sendResponse', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {EVENT_ID_OPS.includes(op) &&
        text('Event ID', 'eventId', { placeholder: '{{ $json.eventId }}' })}

      {CONTACT_ID_OPS.includes(op) &&
        text('Contact ID', 'contactId', { placeholder: '{{ $json.contactId }}' })}

      {(op === 'createContact' || op === 'updateContact') && (
        <>
          {text('First Name', 'firstName', { optional: op === 'updateContact', placeholder: '{{ $json.firstName }}' })}
          {text('Last Name', 'lastName', { optional: op === 'updateContact', placeholder: '{{ $json.lastName }}' })}
          {text('Email', 'email', { optional: op === 'updateContact', placeholder: '{{ $json.email }}' })}
          {text('Mobile Phone', 'mobilePhone', { optional: true, placeholder: '+1 555 0100' })}
          {text('Company', 'companyName', { optional: true, placeholder: 'Acme Inc' })}
        </>
      )}

      {op === 'listContacts' && (
        <>
          {text('Search', 'search', { optional: true, placeholder: 'jane' })}
          {text('Limit', 'limit', { optional: true, placeholder: '50' })}
        </>
      )}

      {op === 'getCalendar' && (
        <div className="grid grid-cols-2 gap-2">
          {text('Start Date', 'startDate', { placeholder: '2024-01-01' })}
          {text('End Date', 'endDate', { placeholder: '2024-01-31' })}
        </div>
      )}

      {op === 'listEmails' && (
        <>
          {text('Folder ID', 'folderId', { optional: true, placeholder: 'inbox or folder ID' })}
          {text('Search', 'search', { optional: true, placeholder: 'invoice' })}
          {text('OData Filter', 'filter', { optional: true, placeholder: 'isRead eq false' })}
          {text('Limit', 'limit', { optional: true, placeholder: '20' })}
        </>
      )}

      {op === 'listFolders' &&
        text('Limit', 'limit', { optional: true, placeholder: '50' })}

      {op === 'createFolder' && (
        <>
          {text('Folder Name', 'displayName', { placeholder: 'Receipts' })}
          {text('Parent Folder ID', 'parentFolderId', { optional: true, placeholder: 'inbox' })}
        </>
      )}

      {op === 'deleteFolder' &&
        text('Folder ID', 'folderId', { placeholder: '{{ $json.folderId }}' })}

      {op === 'moveEmail' &&
        text('Destination Folder', 'destinationId', { placeholder: 'Archive or folder ID' })}

      {op === 'flagEmail' && (
        <ConfigToggleRow
          label="Flag message"
          on={config.flagged !== false}
          onChange={(v) => updateConfig('flagged', v)}
          accentColor={ACCENT}
        />
      )}

      {op === 'markRead' && (
        <ConfigToggleRow
          label="Mark as read (off = mark unread)"
          on={config.isRead !== false}
          onChange={(v) => updateConfig('isRead', v)}
          accentColor={ACCENT}
        />
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="sky"
        label="Microsoft 365 (OAuth)"
        placeholder="Select Outlook credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, subject, from, receivedDateTime, bodyPreview</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
